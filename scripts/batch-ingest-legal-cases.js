const { ConvexHttpClient } = require("convex/browser");
const fs = require("fs").promises;
const path = require("path");

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://harmless-tapir-303.convex.cloud";
const BATCH_SIZE = 5; // Number of files to process in parallel
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds between batches
const DELAY_BETWEEN_FILES = 1000; // 1 second between individual files
const ROOT_FOLDER = process.env.CASES_FOLDER || "./legal-cases"; // Root folder containing year folders

// Initialize Convex client
const client = new ConvexHttpClient(CONVEX_URL);

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to read all PDF files from a directory
async function getPDFFiles(dirPath) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Recursively get files from subdirectories
        const subFiles = await getPDFFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }
  
  return files;
}

// Helper function to upload a single file
async function uploadFile(filePath, year) {
  try {
    const fileName = path.basename(filePath);
    console.log(`  📄 Processing: ${fileName} (${year})`);
    
    // Read file
    const fileBuffer = await fs.readFile(filePath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
    
    // Step 1: Generate upload URL
    const uploadUrl = await client.mutation("documents:generateUploadUrl", {});
    
    // Step 2: Upload to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: fileBlob,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }
    
    const { storageId } = await uploadResponse.json();
    
    // Step 3: Create document record with documentType: "research"
    const documentId = await client.mutation("documents:create", {
      title: fileName,
      jurisdiction: `India - ${year}`,
      fileId: storageId,
      metadata: {
        documentType: "legal_case",
        version: "1.0",
        fileSize: fileBuffer.length,
        year: parseInt(year),
      },
      documentType: "research", // This makes it public in Legal Research
    });
    
    console.log(`  ✅ Uploaded: ${fileName} (ID: ${documentId})`);
    
    // Step 4: Trigger RAG processing (async, don't wait)
    client.action("rag:processDocument", {
      documentId,
      fileUrl: storageId,
      title: fileName,
    }).catch(err => {
      console.error(`  ⚠️  RAG processing queued with warning for ${fileName}:`, err.message);
    });
    
    return { success: true, fileName, documentId };
  } catch (error) {
    console.error(`  ❌ Failed: ${path.basename(filePath)} - ${error.message}`);
    return { success: false, fileName: path.basename(filePath), error: error.message };
  }
}

// Main ingestion function
async function ingestLegalCases() {
  console.log("🚀 Starting Legal Cases Batch Ingestion");
  console.log(`📁 Root folder: ${ROOT_FOLDER}`);
  console.log(`⚙️  Batch size: ${BATCH_SIZE}`);
  console.log(`⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log("─".repeat(60));
  
  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    byYear: {},
  };
  
  try {
    // Read year folders
    const yearFolders = await fs.readdir(ROOT_FOLDER, { withFileTypes: true });
    const years = yearFolders
      .filter(entry => entry.isDirectory() && /^\d{4}$/.test(entry.name))
      .map(entry => entry.name)
      .sort();
    
    console.log(`📅 Found ${years.length} year folders: ${years.join(", ")}\n`);
    
    for (const year of years) {
      const yearPath = path.join(ROOT_FOLDER, year);
      console.log(`\n📂 Processing year: ${year}`);
      
      // Get all PDF files for this year
      const pdfFiles = await getPDFFiles(yearPath);
      
      if (pdfFiles.length === 0) {
        console.log(`  ⚠️  No PDF files found in ${year}`);
        continue;
      }
      
      console.log(`  Found ${pdfFiles.length} PDF files`);
      stats.byYear[year] = { total: pdfFiles.length, successful: 0, failed: 0 };
      
      // Process files in batches
      for (let i = 0; i < pdfFiles.length; i += BATCH_SIZE) {
        const batch = pdfFiles.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(pdfFiles.length / BATCH_SIZE);
        
        console.log(`\n  📦 Batch ${batchNum}/${totalBatches} (${batch.length} files)`);
        
        // Process batch in parallel
        const results = await Promise.all(
          batch.map(async (filePath, idx) => {
            if (idx > 0) await sleep(DELAY_BETWEEN_FILES);
            return uploadFile(filePath, year);
          })
        );
        
        // Update stats
        results.forEach(result => {
          stats.total++;
          if (result.success) {
            stats.successful++;
            stats.byYear[year].successful++;
          } else {
            stats.failed++;
            stats.byYear[year].failed++;
          }
        });
        
        // Delay between batches (except for the last batch)
        if (i + BATCH_SIZE < pdfFiles.length) {
          console.log(`  ⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await sleep(DELAY_BETWEEN_BATCHES);
        }
      }
    }
    
    // Print summary
    console.log("\n" + "═".repeat(60));
    console.log("📊 INGESTION SUMMARY");
    console.log("═".repeat(60));
    console.log(`Total files processed: ${stats.total}`);
    console.log(`✅ Successful: ${stats.successful}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`📈 Success rate: ${((stats.successful / stats.total) * 100).toFixed(2)}%`);
    
    console.log("\n📅 By Year:");
    Object.entries(stats.byYear).forEach(([year, yearStats]) => {
      console.log(`  ${year}: ${yearStats.successful}/${yearStats.total} successful`);
    });
    
    console.log("\n✨ Ingestion complete!");
    console.log("⚠️  Note: RAG processing continues in the background.");
    
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  ingestLegalCases()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

module.exports = { ingestLegalCases };
