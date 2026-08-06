// Backfills schoolId on Exam (from createdBy's user) and ExamSubjectConfig (from its exam)

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');

const Exam = require('../src-old/models/Exam');
const ExamSubjectConfig = require('../src-old/models/ExamSubjectConfig');
const { User } = require('../src/modules/identity');
const Marks = require('../src-old/models/MarksModel');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('Missing MONGODB_URI (or MONGO_URI) env var');
  }

  await mongoose.connect(uri);

  // 1) Backfill Exam.schoolId from createdBy user's schoolId
  const examsMissingSchool = await Exam.find({ $or: [{ schoolId: { $exists: false } }, { schoolId: null }] })
    .select('_id createdBy')
    .lean();

  let examUpdated = 0;
  for (const ex of examsMissingSchool) {
    if (!ex.createdBy) continue;
    const u = await User.findById(ex.createdBy).select('schoolId').lean();
    if (!u?.schoolId) continue;
    await Exam.updateOne({ _id: ex._id }, { $set: { schoolId: u.schoolId } });
    examUpdated += 1;
  }

  // 2) Backfill ExamSubjectConfig.schoolId from exam.schoolId
  const configsMissingSchool = await ExamSubjectConfig.find({
    $or: [{ schoolId: { $exists: false } }, { schoolId: null }],
  })
    .select('_id examId')
    .lean();

  let cfgUpdated = 0;
  for (const cfg of configsMissingSchool) {
    if (!cfg.examId) continue;
    const ex = await Exam.findById(cfg.examId).select('schoolId').lean();
    if (!ex?.schoolId) continue;
    await ExamSubjectConfig.updateOne({ _id: cfg._id }, { $set: { schoolId: ex.schoolId } });
    cfgUpdated += 1;
  }

  // 3) Backfill Marks.schoolId if missing (derive from uploadedBy user's schoolId)
  const marksMissingSchool = await Marks.find({ $or: [{ schoolId: { $exists: false } }, { schoolId: null }] })
    .select('_id uploadedBy')
    .lean();
  let marksUpdated = 0;
  for (const m of marksMissingSchool) {
    if (!m.uploadedBy) continue;
    const u = await User.findById(m.uploadedBy).select('schoolId').lean();
    if (!u?.schoolId) continue;
    await Marks.updateOne({ _id: m._id }, { $set: { schoolId: u.schoolId } });
    marksUpdated += 1;
  }

  console.log('[migrate-reportcard-tenancy] Exams updated:', examUpdated);
  console.log('[migrate-reportcard-tenancy] ExamSubjectConfig updated:', cfgUpdated);
  console.log('[migrate-reportcard-tenancy] Marks updated:', marksUpdated);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-reportcard-tenancy] Failed:', err);
    process.exit(1);
  });

