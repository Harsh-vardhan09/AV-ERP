// Lists every AnswerSheet with its status
require('dotenv').config();
const mongoose    = require('mongoose');
const AnswerSheet = require('../src/modules/oases/models/AnswerSheet');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

(async () => {
  await mongoose.connect(MONGO_URI);

  const sheets = await AnswerSheet.find({});
  console.log(`\n═══ ANSWER SHEETS (${sheets.length} total) ═══\n`);

  sheets.forEach((s, i) => {
    console.log(`Sheet ${i + 1}:`);
    console.log(`  _id              : ${s._id}`);
    console.log(`  anonymousCode    : ${s.anonymousCode}`);
    console.log(`  processingStatus : ${s.processingStatus}`);
    console.log(`  status           : ${s.status}`);
    console.log(`  pageImages       : ${s.pageImages?.length || 0} pages`);
    console.log(`  originalFilePath : ${s.originalFilePath || '⚠️ MISSING'}`);
    console.log(`  examConfigId     : ${s.examConfigId}`);
    console.log(`  uploadedBy       : ${s.uploadedBy}`);
    console.log(`  eval1AssignedTo  : ${s.eval1AssignedTo || '⚠️ NOT ASSIGNED'}`);
    console.log(`  eval2AssignedTo  : ${s.eval2AssignedTo || 'none'}`);
    console.log('');
  });

  await mongoose.disconnect();
  process.exit(0);
})();
