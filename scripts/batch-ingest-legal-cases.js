import { ConvexHttpClient } from "convex/browser";
import { api } from "../src/frontend/convex/_generated/api.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONVEX_URL = process.env.VITE_CONVEX_URL || "YOUR_CONVEX_URL_HERE";
const CASES_ROOT_FOLDER = process.env.CASES_FOLDER || "./legal-cases"; // Path to your 1950-2024 folder
const BATCH_SIZE = 5; // Process 5 files at a time
const DELAY_BETWEEN_BATCHES = 10000; // 10 seconds between batches
const DELAY_BETWEEN_FILES = 2000; // 2 seconds between individual files

// Initialize Convex client
const client = new ConvexHttpClient(CONVEX_URL);

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Get all PDF files from year folders
function getAllPDFFiles(rootFolder) {
  const files = [];
  
  try {
    const years = fs.readdirSync(rootFolder)
      .filter(item => {
        const fullPath = path.join(rootFolder, item);
        return fs.statSync(fullPath).isDirectory() && /^\d{4}$/.test(item);
      })
      .sort(); // Sort years chronologically

    console.log(`📁 Found ${years.length} year folders`);

    for (const year of years) {
      const yearPath = path.join(rootFolder, year);
      const pdfFiles = fs.readdirSync(yearPath)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => ({
          path: path.join(yearPath, file),
          year: year,
          filename: file,
          title: file.replace('.pdf', '').replace(/_/g, ' ')
        }));
      
      files.push(...pdfFiles);
      console.log(`  ${year}: ${pdfFiles.length} cases`);
    }

    return files;
  } catch (error) {
    console.error(`❌ Error reading folders: ${error.message}`);
    return [];
  }
}

// Upload single file to Convex storage
async function uploadFileToConvex(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    
    // Generate upload URL
    const uploadUrl = await client.mutation(api.documents.generateUploadUrl);
    
    // Upload file
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: blob
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const { storageId } = await response.json();
    return storageId;
  } catch (error) {
    console.error(`❌ Upload error for ${filePath}: ${error.message}`);
    return null;
  }
}

// Create document record and trigger RAG processing
async function createDocumentRecord(storageId, title, year) {
  try {
    const documentId = await client.mutation(api.documents.createDocument, {
      title: title,
      fileId: storageId,
      jurisdiction: `India - ${year}`,
      documentType: "research", // Mark as research for public access
      metadata: {
        documentType: "Legal Case",
        version: "1.0",
        year: parseInt(year)
      }
    });

    return documentId;
  } catch (error) {
    console.error(`❌ Document creation error: ${error.message}`);
    return null;
  }
}

// Process a single file
async function processFile(file, index, total) {
  console.log(`\n[${index + 1}/${total}] Processing: ${file.filename} (${file.year})`);
  
  try {
    // Step 1: Upload to Convex storage
    console.log(`  ⬆️  Uploading to storage...`);
    const storageId = await uploadFileToConvex(file.path);
    
    if (!storageId) {
      console.log(`  ❌ Upload failed, skipping...`);
      return { success: false, file: file.filename, error: 'Upload failed' };
    }

    console.log(`  ✅ Uploaded (Storage ID: ${storageId})`);

    // Step 2: Create document record (triggers RAG processing)
    console.log(`  📝 Creating document record...`);
    const documentId = await createDocumentRecord(storageId, file.title, file.year);
    
    if (!documentId) {
      console.log(`  ❌ Document creation failed`);
      return { success: false, file: file.filename, error: 'Document creation failed' };
    }

    console.log(`  ✅ Document created (ID: ${documentId})`);
    console.log(`  🔄 RAG processing will happen in background...`);

    return { success: true, file: file.filename, documentId };
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return { success: false, file: file.filename, error: error.message };
  }
}

// Main batch processing function
async function batchIngestDocuments() {
  console.log('🚀 Starting Legal Cases Batch Ingestion\n');
  console.log(`📂 Root folder: ${CASES_ROOT_FOLDER}`);
  console.log(`⚙️  Batch size: ${BATCH_SIZE}`);
  console.log(`⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log(`⏱️  Delay between files: ${DELAY_BETWEEN_FILES}ms\n`);

  // Get all PDF files
  const allFiles = getAllPDFFiles(CASES_ROOT_FOLDER);
  
  if (allFiles.length === 0) {
    console.log('❌ No PDF files found. Please check your folder path.');
    return;
  }

  console.log(`\n📊 Total files to process: ${allFiles.length}\n`);
  console.log('═'.repeat(60));

  const results = {
    total: allFiles.length,
    successful: 0,
    failed: 0,
    errors: []
  };

  // Process in batches
  for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
    const batch = allFiles.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allFiles.length / BATCH_SIZE);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📦 BATCH ${batchNumber}/${totalBatches}`);
    console.log('═'.repeat(60));

    // Process files in batch sequentially (to avoid overwhelming the system)
    for (let j = 0; j < batch.length; j++) {
      const file = batch[j];
      const globalIndex = i + j;
      
      const result = await processFile(file, globalIndex, allFiles.length);
      
      if (result.success) {
        results.successful++;
      } else {
        results.failed++;
        results.errors.push(result);
      }

      // Delay between files within batch
      if (j < batch.length - 1) {
        await sleep(DELAY_BETWEEN_FILES);
      }
    }

    // Delay between batches (except for last batch)
    if (i + BATCH_SIZE < allFiles.length) {
      console.log(`\n⏸️  Waiting ${DELAY_BETWEEN_BATCHES / 1000}s before next batch...`);
      await sleep(DELAY_BETWEEN_BATCHES);
    }
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 INGESTION COMPLETE');
  console.log('═'.repeat(60));
  console.log(`✅ Successful: ${results.successful}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Failed files:');
    results.errors.forEach(err => {
      console.log(`  - ${err.file}: ${err.error}`);
    });
  }

  console.log('\n✨ All documents uploaded! RAG processing will continue in background.');
  console.log('💡 Check the Legal Research page to see processed documents.\n');
}

// Run the script
batchIngestDocuments().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
