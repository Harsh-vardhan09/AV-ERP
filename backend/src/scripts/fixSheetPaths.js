/**
 * Force-fixes page images for all sheets using absolute paths
 * Run: node src/scripts/fixSheetPaths.js
 */
require('dotenv').config();
const mongoose    = require('mongoose');
const path        = require('path');
const fs          = require('fs');
const AnswerSheet = require('../models/oases/AnswerSheet');
const { processAnswerSheet } = require('../services/oases/pdfService');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;
const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/oases');

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  const sheets = await AnswerSheet.find({});
  console.log(`Found ${sheets.length} sheet(s)\n`);

  // List files on disk for reference
  const diskFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
  console.log(`Files on disk (${diskFiles.length}): ${diskFiles.join(', ')}\n`);

  for (const sheet of sheets) {
    console.log(`\n── Sheet: ${sheet.anonymousCode} (${sheet._id}) ──`);
    console.log(`   storedPath   : ${sheet.originalFilePath}`);
    console.log(`   pageImages   : ${sheet.pageImages.length}`);
    console.log(`   procStatus   : ${sheet.processingStatus}`);

    // Resolve to absolute path
    let absPath = sheet.originalFilePath;
    if (absPath && !path.isAbsolute(absPath)) {
      // Try resolving relative to backend root
      absPath = path.join(__dirname, '../../', absPath);
    }

    // If path doesn't exist, try finding the file in uploads dir by filename
    if (!absPath || !fs.existsSync(absPath)) {
      const basename = absPath ? path.basename(absPath) : '';
      const candidate = path.join(UPLOADS_DIR, basename);
      if (basename && fs.existsSync(candidate)) {
        absPath = candidate;
        console.log(`   ✅ Resolved to: ${absPath}`);
        // Fix the stored path to absolute
        sheet.originalFilePath = absPath;
        await sheet.save();
      } else {
        // Try matching by partial filename
        const match = diskFiles.find(f => basename && f.includes(basename.split('-').pop()));
        if (match) {
          absPath = path.join(UPLOADS_DIR, match);
          console.log(`   ✅ Fuzzy matched: ${absPath}`);
          sheet.originalFilePath = absPath;
          await sheet.save();
        } else {
          console.log(`   ❌ File not found on disk — skipping`);
          continue;
        }
      }
    } else {
      console.log(`   ✅ File exists at: ${absPath}`);
    }

    // Force reprocess
    sheet.processingStatus = 'pending';
    sheet.pageImages = [];
    await sheet.save();

    try {
      await processAnswerSheet(String(sheet._id), {
        schoolId:    String(sheet.schoolId),
        filePath:    absPath,
        subjectCode: 'UNKNOWN',
        year:        '2026-2027',
      });
      const updated = await AnswerSheet.findById(sheet._id);
      console.log(`   ✅ DONE — pageImages: ${updated.pageImages.length}, status: ${updated.processingStatus}`);
    } catch (err) {
      console.error(`   ❌ FAILED: ${err.message}`);
    }
  }

  console.log('\n═══ All sheets processed ═══');
  await mongoose.disconnect();
  process.exit(0);
})();
