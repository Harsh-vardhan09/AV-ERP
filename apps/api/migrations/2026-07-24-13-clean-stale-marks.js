// Removes dynamic marks rows corrupted by the all-subjects bleed artifact.
// Dry-run by default; pass --delete to actually remove them

require('dotenv').config();
const mongoose = require('mongoose');
const connect  = require('../src/core/config/database');

const DELETE_MODE = process.argv.includes('--delete');

async function main() {
  await connect();

  const MarksModel    = require('../src-old/models/MarksModel');
  const SubjectMaster = require('../src-old/models/SubjectMaster');
  const StudentProfile = require('../src/modules/people/models/StudentProfile');

  console.log('\n🔍 Dynamic Marks Diagnostic\n');
  console.log(DELETE_MODE ? '⚠️  DELETE MODE — records WILL be removed\n' : '📋 DRY-RUN MODE — run with --delete to actually remove records\n');

  // Fetch all dynamic marks docs (those with a fields Map)
  const allMarks = await MarksModel.find({
    $or: [
      { 'fields': { $exists: true, $ne: {} } },
      { uploadMethod: { $in: ['manual_dynamic', 'excel_dynamic'] } },
    ],
  }).lean();

  if (allMarks.length === 0) {
    console.log('✅ No dynamic marks records found in DB.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${allMarks.length} dynamic marks record(s) total.\n`);

  // Group by studentId + subjectId
  const grouped = {};
  for (const m of allMarks) {
    const key = `${m.studentId}:${m.subjectId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  }

  // Resolve subject names
  const subjectIds = [...new Set(allMarks.map(m => String(m.subjectId)))];
  const subjects   = await SubjectMaster.find({ _id: { $in: subjectIds } }).select('name').lean();
  const subMap     = Object.fromEntries(subjects.map(s => [String(s._id), s.name]));

  // Resolve student names
  const studentIds = [...new Set(allMarks.map(m => String(m.studentId)))];
  const students   = await StudentProfile.find({ $or: [{ _id: { $in: studentIds } }, { userId: { $in: studentIds } }] })
    .select('firstName lastName scholarNo')
    .lean();
  const stuMap = Object.fromEntries(students.map(s => [String(s._id), `${s.firstName} ${s.lastName} (${s.scholarNo})`]));

  const toDelete = [];

  for (const [key, docs] of Object.entries(grouped)) {
    const [studentId, subjectId] = key.split(':');
    const subjectName = subMap[subjectId] || subjectId;
    const studentName = stuMap[studentId] || studentId;

    for (const doc of docs) {
      const fields = doc.fields instanceof Map
        ? Object.fromEntries(doc.fields)
        : (doc.fields || {});

      const fieldSummary = Object.entries(fields)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');

      console.log(`📄 Student: ${studentName}`);
      console.log(`   Subject: ${subjectName}`);
      console.log(`   ExamId:  ${doc.examId}`);
      console.log(`   Fields:  { ${fieldSummary} }`);
      console.log(`   _id:     ${doc._id}`);
      console.log(`   Upload:  ${doc.uploadMethod || doc.marksType || 'legacy'}`);
      console.log('');

      toDelete.push(doc._id);
    }
  }

  console.log(`\n──────────────────────────────────────────────`);
  console.log(`Total records found: ${toDelete.length}`);

  if (!DELETE_MODE) {
    console.log('\n⚡ To delete SPECIFIC records, run with --delete.');
    console.log('   Or drop individual records via MongoDB Compass / shell:');
    console.log(`   db.marks.deleteMany({ _id: { $in: [${toDelete.map(id => `ObjectId("${id}")`).join(', ')}] } })`);
  } else {
    // Prompt confirmation
    console.log('\n🗑️  Deleting all listed dynamic marks records...');
    const result = await MarksModel.deleteMany({ _id: { $in: toDelete } });
    console.log(`✅ Deleted ${result.deletedCount} record(s).`);
    console.log('   Re-upload marks from the teacher portal for the correct subjects.');
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
