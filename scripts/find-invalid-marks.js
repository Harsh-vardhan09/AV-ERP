/**
 * READ ONLY. Lists every marks record whose value is impossible:
 * greater than the subject's maximum for that exam, or negative.
 *
 * DOES NOT CORRECT ANYTHING. These are real teacher entries and only the school
 * can say what the intended value was — a 360 might have been 36.0, 60, or 100.
 * Guessing would replace one wrong number with another and lose the evidence.
 *
 * Covers both write shapes: the legacy single `marksObtained` and the component
 * `fields` map (where the subject total is the sum of its non-total components).
 *
 * Usage:
 *   node scripts/find-invalid-marks.js
 *   node scripts/find-invalid-marks.js --schoolId <id>
 *   node scripts/find-invalid-marks.js --csv > invalid-marks.csv
 */

'use strict';

const path = require('path');
const Module = require('module');

const API = path.join(__dirname, '..', 'apps', 'api');
const apiRequire = Module.createRequire(path.join(API, 'package.json'));

apiRequire('dotenv').config({ path: path.join(API, '.env') });
apiRequire('dotenv').config();
const mongoose = apiRequire('mongoose');

const argv = process.argv.slice(2);
const CSV = argv.includes('--csv');
const idx = argv.indexOf('--schoolId');
const SCHOOL_ID = idx !== -1 ? argv[idx + 1] : null;
const URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;

const out = [];
const say = (s = '') => {
  if (!CSV) console.log(s);
  else out.push(s);
};

(async () => {
  if (!URI) {
    console.error('❌ MONGO_URI is not set.');
    process.exit(1);
  }
  await mongoose.connect(URI, { autoIndex: false, autoCreate: false });

  const req = (p) => apiRequire(path.join(API, 'src', p));
  const Marks = req('modules/examination/models/MarksModel');
  const ExamSubjectConfig = req('modules/examination/models/ExamSubjectConfig');
  const Exam = req('modules/examination/models/Exam');
  const { displayMarks } = req('modules/examination/lib/marksValue');
  const { resolveMaxima } = req('modules/examination/services/marksEntryValidator');
  void req('modules/academics'); // register SubjectMaster / ClassModel schemas
  void req('modules/identity');
  void req('modules/people/models/StudentProfile');

  say('══════════════════════════════════════════════════════════════');
  say(' INVALID MARKS — read only, nothing is corrected');
  say('══════════════════════════════════════════════════════════════');
  say(`  database : ${mongoose.connection.name}`);

  const filter = {};
  if (SCHOOL_ID) filter.schoolId = new mongoose.Types.ObjectId(SCHOOL_ID);

  const total = await Marks.countDocuments(filter);
  say(`  scanning : ${total} marks record(s)\n`);

  // Cache maxima per exam+class+subject — one lookup serves every student in it.
  const cache = new Map();
  const maximaFor = async (m) => {
    const key = `${m.examId}|${m.classId}|${m.subjectId}`;
    if (!cache.has(key)) {
      cache.set(
        key,
        await resolveMaxima({
          examId: m.examId,
          classId: m.classId,
          subjectId: m.subjectId,
          schoolId: m.schoolId,
          marksType: m.marksType,
        })
      );
    }
    return cache.get(key);
  };

  const bad = [];
  const cursor = Marks.find(filter)
    .populate('subjectId', 'name')
    .populate('examId', 'name type')
    .populate('uploadedBy', 'firstName lastName email')
    .populate('studentId', 'firstName lastName email')
    .lean()
    .cursor();

  for (let m = await cursor.next(); m; m = await cursor.next()) {
    const value = displayMarks(m);
    if (value === null) continue;

    const maxima = await maximaFor(m);
    const max = maxima.subjectTotal;

    let reason = null;
    if (value < 0) reason = 'negative';
    else if (Number.isFinite(max) && value > max) reason = `above maximum (${max})`;
    if (!reason) continue;

    bad.push({
      student:
        `${m.studentId?.firstName || ''} ${m.studentId?.lastName || ''}`.trim() ||
        String(m.studentId?._id || m.studentId),
      exam: m.examId?.name || String(m.examId),
      examType: m.examId?.type || '',
      subject: m.subjectId?.name || String(m.subjectId),
      value,
      max,
      maxSource: maxima.source,
      shape: m.fields && Object.keys(m.fields).length ? 'fields' : 'marksObtained',
      fields: m.fields && Object.keys(m.fields).length ? JSON.stringify(m.fields) : '',
      enteredBy:
        `${m.uploadedBy?.firstName || ''} ${m.uploadedBy?.lastName || ''}`.trim() || 'unknown',
      when: m.updatedAt || m.createdAt,
      reason,
      markId: String(m._id),
      schoolId: String(m.schoolId),
    });
  }

  if (CSV) {
    const cols = [
      'student',
      'exam',
      'examType',
      'subject',
      'value',
      'max',
      'maxSource',
      'shape',
      'fields',
      'enteredBy',
      'when',
      'reason',
      'markId',
      'schoolId',
    ];
    console.log(cols.join(','));
    for (const r of bad) {
      console.log(cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
    }
    await mongoose.disconnect();
    return;
  }

  if (!bad.length) {
    say('  ✅ No invalid marks found.');
    await mongoose.disconnect();
    return;
  }

  say(`  🚨 ${bad.length} invalid record(s)\n`);

  // Grouped by exam — that is how a school will hand them back to teachers.
  const byExam = {};
  for (const r of bad) (byExam[r.exam] = byExam[r.exam] || []).push(r);

  for (const [exam, rows] of Object.entries(byExam)) {
    say(`── ${exam} (${rows[0].examType}) — ${rows.length} record(s) ──`);
    for (const r of rows) {
      say(
        `  ${r.student.padEnd(22)} ${r.subject.padEnd(14)} ` +
          `${String(r.value).padStart(6)} / ${String(r.max).padEnd(5)} ${r.reason}`
      );
      say(`      entered by ${r.enteredBy} on ${new Date(r.when).toLocaleString('en-IN')}`);
      say(`      max from ${r.maxSource}${r.fields ? `  components ${r.fields}` : ''}`);
      say(`      _id ${r.markId}`);
    }
    say('');
  }

  const teachers = {};
  for (const r of bad) teachers[r.enteredBy] = (teachers[r.enteredBy] || 0) + 1;
  say('── Who entered them ──');
  for (const [t, n] of Object.entries(teachers).sort((a, b) => b[1] - a[1])) {
    say(`  ${String(n).padStart(4)}  ${t}`);
  }

  say('\nNothing was changed. Have the school re-enter these values.');
  say('Re-run with --csv to get a spreadsheet to send them.');

  await mongoose.disconnect();
})().catch((err) => {
  console.error('\n❌ Failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
