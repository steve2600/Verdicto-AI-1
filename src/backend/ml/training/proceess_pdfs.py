import json
import re
from pathlib import Path
from tqdm import tqdm
from multiprocessing import Pool, cpu_count
import fitz  # PyMuPDF

# -------- CONFIG --------
SCRIPT_DIR = Path(__file__).parent          # folder where this script sits
PDF_DIR = SCRIPT_DIR / "legal_pdfs"        # folder containing year folders with PDFs
OUTPUT_PATH = SCRIPT_DIR / "bias_dataset.jsonl"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
NUM_CORES = min(8, cpu_count())

# -------- LEXICONS --------
bias_lexicons = {
    "gender_bias": ["woman", "lady", "female", "girl", "wife", "husband", "respectable woman", "unbecoming of a lady", "manly", "feminine"],
    "caste_bias": ["caste", "dalit", "brahmin", "backward class", "scheduled caste", "tribe", "scheduled tribe"],
    "religious_bias": ["hindu", "muslim", "christian", "minority", "religion", "temple", "mosque"],
    "regional_bias": ["village", "villager", "urban", "north indian", "south indian", "bengali", "madras", "delhi", "punjabi", "bihar"],
    "socioeconomic_bias": ["rich", "poor", "educated", "uneducated", "laborer", "servant", "peasant", "upper class", "lower class", "middle class"],
    "judicial_attitude_bias": ["deserves", "mercy", "repentant", "lenient", "harsh", "habitual offender", "chance to reform", "severe punishment"],
    "language_bias": ["shameless", "immoral", "heinous", "wicked", "pitiful", "noble", "deplorable", "disgusting", "vile", "grievous"],
}

# -------- HELPERS --------
def detect_bias(text: str):
    """Return a dict of bias labels (1 or 0) for the text."""
    text_lower = text.lower()
    results = {}
    for bias_type, words in bias_lexicons.items():
        pattern = r"\b(" + "|".join(map(re.escape, words)) + r")\b"
        results[bias_type] = 1 if re.search(pattern, text_lower) else 0
    return results

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def process_pdf(pdf_path: Path):
    """Process single PDF: extract text, chunk, apply bias detection."""
    try:
        doc = fitz.open(pdf_path)
        chunks_records = []
        for page_num, page in enumerate(doc):
            text = page.get_text()
            if not text.strip():
                continue
            chunks = chunk_text(text)
            for chunk_num, chunk in enumerate(chunks):
                record = {
                    "id": f"{pdf_path.stem}_p{page_num}_c{chunk_num}",
                    "case_id": pdf_path.stem,
                    "text": chunk,
                    **detect_bias(chunk)
                }
                chunks_records.append(record)
        return chunks_records
    except Exception as e:
        print(f"❌ Error processing {pdf_path}: {e}")
        return []

# -------- MAIN --------
def main():
    # Recursively find all PDFs inside all year folders
    pdf_files = list(PDF_DIR.rglob("*.pdf"))
    print(f"📚 Found {len(pdf_files)} PDFs to process across {len(list(PDF_DIR.iterdir()))} year folders.")

    all_records = []
    pbar = tqdm(total=len(pdf_files), desc="Processing PDFs", ncols=100)

    # Use multiprocessing pool
    with Pool(NUM_CORES) as pool:
        for records in pool.imap_unordered(process_pdf, pdf_files):
            all_records.extend(records)
            pbar.update()
    pbar.close()

    # Save all chunks to JSONL
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        for record in all_records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"\n✅ Done! Dataset saved to {OUTPUT_PATH}")
    print(f"Total chunks generated: {len(all_records)}")

if __name__ == "__main__":
    main()
