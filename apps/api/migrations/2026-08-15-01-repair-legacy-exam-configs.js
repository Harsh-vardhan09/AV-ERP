// Repairs ExamSubjectConfig rows that have no marksDistribution.
//
// Three writers could create a config with no marks breakdown:
//   - adminController.addExamSubject   (dropped the field entirely — now fixed)
//   - teacherController.createTeacherTest (never set it — now inherits)
//   - adminController.createExam       (when the admin left the editor at a
//                                       single 'theory' row)
//
// A config with no marksDistribution is "legacy": the teacher enters one
// aggregate number, it is stored as marksObtained with no `fields` map, and
// DataAggregatorService surfaces it only as t1_theory. The component tokens a
// report template binds (t1_pertest, t1_nb, …) are never emitted, so those
// columns render blank while the subject total is non-zero.
//
// The repair COPIES a distribution from a sibling config in the same
// class + session. It never invents components from mark keys: guessing the
// max marks of a component would silently change every percentage and grade
// derived from it. Configs with no donor are reported, not touched.
//
// Existing legacy MARKS are left exactly as they are. A single total cannot be
// split back into components without fabricating data.
//
// Usage:
//   node migrations/2026-08-15-01-repair-legacy-exam-configs.js --dry     (default)
//   node migrations/2026-08-15-01-repair-legacy-exam-configs.js --apply
//   ... [--schoolId <id>]

const mongoose = require('mongoose');
require('dotenv').config();

const ExamSubjectConfig = require('../src/modules/examination/models/ExamSubjectConfig');
const Exam = require('../src/modules/examination/models/Exam');

const APPLY = process.argv.includes('--apply');
const schoolArgIdx = process.argv.indexOf('--schoolId');
const SCHOOL_ID = schoolArgIdx !== -1 ? process.argv[schoolArgIdx + 1] : null;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

const key = (a, b) => `${String(a)}:${String(b)}`;

async function repair() {
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY' : 'DRY RUN (no writes)'}`);

  const filter = {
    $or: [{ marksDistribution: { $exists: false } }, { marksDistribution: { $size: 0 } }],
  };
  if (SCHOOL_ID) filter.schoolId = new mongoose.Types.ObjectId(SCHOOL_ID);

  const legacy = await ExamSubjectConfig.find(filter).lean();
  console.log(`\nFound ${legacy.length} config(s) with no marks distribution.`);
  if (!legacy.length) return;

  // Resolve each config's session through its exam — ExamSubjectConfig has no
  // session of its own, and a donor must come from the same academic year.
  const examIds = [...new Set(legacy.map((c) => String(c.examId)))];
  const exams = await Exam.find({ _id: { $in: examIds } })
    .select('session name type')
    .lean();
  const examById = Object.fromEntries(exams.map((e) => [String(e._id), e]));

  // Build donors: class+session → the most recent distribution in use
  const donorFilter = { 'marksDistribution.0': { $exists: true } };
  if (SCHOOL_ID) donorFilter.schoolId = new mongoose.Types.ObjectId(SCHOOL_ID);
  const donorConfigs = await ExamSubjectConfig.find(donorFilter)
    .sort({ createdAt: -1 })
    .select('examId classId marksDistribution schoolId')
    .lean();

  const donorExamIds = [...new Set(donorConfigs.map((c) => String(c.examId)))];
  const donorExams = await Exam.find({ _id: { $in: donorExamIds } })
    .select('session')
    .lean();
  const donorSessionByExam = Object.fromEntries(
    donorExams.map((e) => [String(e._id), String(e.session)])
  );

  const donors = {};
  for (const c of donorConfigs) {
    const session = donorSessionByExam[String(c.examId)];
    if (!session) continue;
    const k = key(c.classId, session);
    if (!donors[k]) donors[k] = c.marksDistribution; // sorted desc → first is newest
  }

  const repairable = [];
  const orphans = [];
  for (const c of legacy) {
    const exam = examById[String(c.examId)];
    const donor = exam ? donors[key(c.classId, exam.session)] : null;
    (donor ? repairable : orphans).push({ config: c, exam, donor });
  }

  console.log(`  ${repairable.length} can inherit a distribution from a sibling exam.`);
  console.log(`  ${orphans.length} have no donor in the same class + session.`);

  const byExam = {};
  for (const r of repairable) {
    const n = r.exam?.name || String(r.config.examId);
    byExam[n] = (byExam[n] || 0) + 1;
  }
  console.log('\nRepairable, by exam:');
  for (const [n, count] of Object.entries(byExam)) {
    console.log(`  ${String(count).padStart(4)}  ${n}`);
  }

  if (orphans.length) {
    const orphanExams = {};
    for (const o of orphans) {
      const n = o.exam?.name || String(o.config.examId);
      orphanExams[n] = (orphanExams[n] || 0) + 1;
    }
    console.log('\nNo donor — configure these by hand in Exam Manager:');
    for (const [n, count] of Object.entries(orphanExams)) {
      console.log(`  ${String(count).padStart(4)}  ${n}`);
    }
  }

  if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to repair.');
    return;
  }

  let repaired = 0;
  for (const r of repairable) {
    const total = r.donor.reduce((s, d) => s + (Number(d.maxMarks) || 0), 0);
    await ExamSubjectConfig.updateOne(
      { _id: r.config._id },
      {
        $set: {
          marksDistribution: r.donor,
          // Keep the legacy total consistent with the components it now declares
          maxMarks: total || r.config.maxMarks,
        },
      }
    );
    repaired++;
  }
  console.log(`\n✅ Repaired ${repaired} config(s). ${orphans.length} still need manual setup.`);
  console.log('   Existing marks were NOT modified — a single total cannot be split.');
}

repair()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('Disconnected.');
  });
