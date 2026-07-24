const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const AnswerSheet = require('../src/models/oases/AnswerSheet');
  const sheet = await AnswerSheet.findById('69d4dc58b822673c18a900eb')
    .select('totalPages pageImages s3Keys processingStatus processingError')
    .lean();
  console.log('totalPages:', sheet.totalPages);
  console.log('processingStatus:', sheet.processingStatus);
  console.log('processingError:', sheet.processingError);
  console.log('pageImages.length:', sheet.pageImages?.length);
  console.log('pageImages:', JSON.stringify(sheet.pageImages));
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
