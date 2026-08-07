// Re-runs PDF processing for answer sheets whose page images are missing or broken
const mongoose = require('mongoose');
const fs       = require('fs');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const { processAnswerSheet } = require('../src/modules/oases/services/pdfService');
  const AnswerSheet = require('../src/modules/oases/models/AnswerSheet');

  const sheets = await AnswerSheet.find({
    $or: [
      { pageImages: { $exists: true, $size: 0 } },
      { pageImages: { $exists: false } },
    ],
    processingStatus: { $in: ['pending', 'failed'] },
  }).select('_id schoolId originalFilePath examConfigId').lean();

  console.log(`Found ${sheets.length} sheet(s) to repair.`);

  for (const sheet of sheets) {
    const filePath = sheet.originalFilePath;
    if (!filePath || !fs.existsSync(filePath)) {
      console.warn(`  ⚠ File NOT found for sheet ${sheet._id}: ${filePath}`);
      continue;
    }
    process.stdout.write(`  Processing ${sheet._id} ... `);
    await processAnswerSheet(sheet._id.toString(), {
      schoolId:    sheet.schoolId.toString(),
      filePath,
      subjectCode: 'REPAIR',
      year:        new Date().getFullYear().toString(),
    });
    console.log('done.');
  }

  await mongoose.disconnect();
  console.log('All done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
