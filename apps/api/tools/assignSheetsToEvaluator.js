// Assigns all uploaded/processed sheets to the EVALUATOR user for testing
require('dotenv').config();
const mongoose    = require('mongoose');
const AnswerSheet = require('../src-old/models/oases/AnswerSheet');
const { User }    = require('../src/modules/identity');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // Find the evaluator user
  const evaluator = await User.findOne({ oasesRole: 'EVALUATOR' }).select('_id email');
  if (!evaluator) {
    console.error('❌ No EVALUATOR user found! Run seedOasesUsers.js first.');
    process.exit(1);
  }
  console.log(`📌 Evaluator: ${evaluator.email} (${evaluator._id})\n`);

  // Find all processed, unassigned sheets
  const sheets = await AnswerSheet.find({
    processingStatus: 'done',
    status:           'uploaded',
    eval1AssignedTo:  null,
  });

  if (!sheets.length) {
    console.log('ℹ️  No unassigned processed sheets found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`📋 Assigning ${sheets.length} sheet(s) to evaluator...\n`);

  for (const sheet of sheets) {
    sheet.eval1AssignedTo = evaluator._id;
    sheet.status          = 'assigned';
    await sheet.save();
    console.log(`  ✅ Assigned: ${sheet.anonymousCode} → ${evaluator.email}`);
  }

  console.log('\n═══ Done ═══');
  console.log(`  Evaluator can now log in and see ${sheets.length} sheet(s) in their queue.`);
  console.log('  Login: oases.evaluator@demo.com / Demo@1234');

  await mongoose.disconnect();
  process.exit(0);
})();
