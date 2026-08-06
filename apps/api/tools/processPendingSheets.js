// Processes pending/failed answer sheets directly, bypassing the Bull queue
require('dotenv').config();
const mongoose       = require('mongoose');
const AnswerSheet    = require('../src-old/models/oases/AnswerSheet');
const { processAnswerSheet } = require('../src-old/services/oases/pdfService');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  const sheets = await AnswerSheet.find({
    processingStatus: { $in: ['pending', 'failed', 'done'] } // include done to fix empty pageImages
  });

  if (!sheets.length) {
    console.log('✅ No sheets found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Only process ones that have missing pageImages
  const toProcess = sheets.filter(s => !s.pageImages || s.pageImages.length === 0);
  if (!toProcess.length) {
    console.log('✅ All sheets already have page images — nothing to do.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📋 Found ${toProcess.length} sheet(s) needing reprocess.\n`);

  for (const sheet of toProcess) {
    // Reset status so pdfService picks it up
    sheet.processingStatus = 'pending';
    await sheet.save();

    console.log(`  ⚙️  Processing: ${sheet._id} | File: ${sheet.originalFilePath}`);
    try {
      await processAnswerSheet(String(sheet._id), {
        schoolId:    String(sheet.schoolId),
        filePath:    sheet.originalFilePath,   // ✅ correct field name
        subjectCode: sheet.subjectCode || 'UNKNOWN',
        year:        sheet.academicYear || '2026-2027',
      });
      console.log(`  ✅ Done: ${sheet._id}\n`);
    } catch (err) {
      console.error(`  ❌ Failed: ${sheet._id} — ${err.message}\n`);
    }
  }

  // Verify result
  const stillPending = await AnswerSheet.countDocuments({ processingStatus: 'pending' });
  const done         = await AnswerSheet.countDocuments({ processingStatus: 'done' });
  console.log(`\n═══ Result ═══`);
  console.log(`  Done    : ${done}`);
  console.log(`  Pending : ${stillPending}`);

  await mongoose.disconnect();
  process.exit(0);
})();
