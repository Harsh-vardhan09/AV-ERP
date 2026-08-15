// Collapses per-class-period Attendance rows into one DailyAttendance row per
// student per school day.
//
// The old model is one document per (class, section, subject, date, type) with
// an embedded records[] array, so a student appears once PER PERIOD. Every
// attendance percentage in the system therefore divided by periods, not days.
//
// ORDER OF OPERATIONS — do not reorder:
//   1. ARCHIVE every source document verbatim into attendancearchives.
//   2. COUNT student-days whose periods disagree (present in one, absent in
//      another) and PRINT the number.
//   3. COLLAPSE, first period of the day wins — closest to a morning roll call.
//   4. Only then create the unique index, against clean data.
//
// Step 4 is why migration 2026-07-24-07 had to drop the old unique index: it
// could not be created over rows that already violated it. Collapsing first
// means this index is applied to data that already satisfies it.
//
// STOPS if the conflict rate exceeds --maxConflictPct (default 5%): a high rate
// means "first period wins" is losing real information and a human should look.
//
// IDEMPOTENT: archiving keys on originalId, collapsing upserts on
// (schoolId, studentId, date). Re-running changes nothing.
//
// Usage:
//   node migrations/2026-08-15-03-collapse-attendance-to-daily.js            (dry run)
//   node migrations/2026-08-15-03-collapse-attendance-to-daily.js --apply
//   ... [--schoolId <id>] [--maxConflictPct 5] [--force]

const mongoose = require('mongoose');
require('dotenv').config();

const Attendance = require('../src/modules/attendance/models/attendance');
const DailyAttendance = require('../src/modules/attendance/models/DailyAttendance');
const AttendanceArchive = require('../src/modules/attendance/models/AttendanceArchive');
const SchoolSettings = require('../src/modules/tenancy/models/SchoolSettings');
const { toSchoolDay, toDayKey, DEFAULT_TZ } = require('../src/modules/attendance/lib/schoolDay');

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const FORCE = argv.includes('--force');
const argOf = (name, dflt) => {
  const i = argv.indexOf(name);
  return i !== -1 ? argv[i + 1] : dflt;
};
const SCHOOL_ID = argOf('--schoolId', null);
const MAX_CONFLICT_PCT = Number(argOf('--maxConflictPct', 5));
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not set.');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY' : 'DRY RUN (no writes)'}`);

  const filter = {};
  if (SCHOOL_ID) filter.schoolId = new mongoose.Types.ObjectId(SCHOOL_ID);

  // Timezone per school — a day boundary is school-local, and one run may span
  // several schools.
  const tzRows = await SchoolSettings.find(SCHOOL_ID ? { schoolId: filter.schoolId } : {})
    .select('schoolId timezone')
    .lean();
  const tzBySchool = Object.fromEntries(
    tzRows.map((r) => [String(r.schoolId), r.timezone || DEFAULT_TZ])
  );
  const tzFor = (schoolId) => tzBySchool[String(schoolId)] || DEFAULT_TZ;

  const total = await Attendance.countDocuments(filter);
  console.log(`\nSource: ${total} per-period attendance document(s).`);
  if (total === 0) {
    console.log('Nothing to do.');
    return;
  }

  // ── 1. ARCHIVE ────────────────────────────────────────────────────────────
  console.log('\n── Step 1: archive ──');
  let archived = 0;
  let alreadyArchived = 0;
  const cursor = Attendance.find(filter).lean().cursor();
  for (let doc = await cursor.next(); doc; doc = await cursor.next()) {
    const exists = await AttendanceArchive.findOne({ originalId: doc._id }).select('_id').lean();
    if (exists) {
      alreadyArchived++;
      continue;
    }
    if (APPLY) {
      await AttendanceArchive.create({
        originalId: doc._id,
        schoolId: doc.schoolId,
        archivedBy: 'migration:2026-08-15-03',
        document: doc,
      });
    }
    archived++;
  }
  console.log(
    `  ${APPLY ? 'Archived' : 'Would archive'} ${archived}; ${alreadyArchived} already archived.`
  );

  // ── 2. GROUP + COUNT CONFLICTS ────────────────────────────────────────────
  console.log('\n── Step 2: conflicts ──');
  // key: schoolId|studentId|dayKey  →  [{ status, date, createdAt, ... }]
  const byStudentDay = new Map();

  const c2 = Attendance.find(filter).sort({ date: 1, createdAt: 1 }).lean().cursor();
  for (let doc = await c2.next(); doc; doc = await c2.next()) {
    const day = toSchoolDay(doc.date, tzFor(doc.schoolId));
    if (!day) continue;
    const dayKey = toDayKey(day);

    for (const r of doc.records || []) {
      if (!r?.studentId || !r.status) continue;
      const key = `${doc.schoolId}|${r.studentId}|${dayKey}`;
      if (!byStudentDay.has(key)) byStudentDay.set(key, []);
      byStudentDay.get(key).push({
        status: r.status,
        leaveId: r.leaveId || null,
        day,
        dayKey,
        schoolId: doc.schoolId,
        studentId: r.studentId,
        classId: doc.classId,
        sectionId: doc.sectionId,
        session: doc.session,
        takenBy: doc.takenBy,
        // Order within the day: the earliest period is the closest thing the old
        // data has to a morning roll call.
        order: new Date(doc.date).getTime(),
        createdAt: doc.createdAt ? new Date(doc.createdAt).getTime() : 0,
      });
    }
  }

  const studentDays = byStudentDay.size;
  let conflicts = 0;
  const conflictSamples = [];
  for (const [key, entries] of byStudentDay) {
    const distinct = new Set(entries.map((e) => e.status));
    if (distinct.size > 1) {
      conflicts++;
      if (conflictSamples.length < 10) {
        conflictSamples.push({ key, statuses: [...distinct], periods: entries.length });
      }
    }
  }

  const pct = studentDays > 0 ? (conflicts / studentDays) * 100 : 0;
  console.log(`  student-days total      : ${studentDays}`);
  console.log(`  with conflicting status : ${conflicts}  (${pct.toFixed(2)}%)`);
  if (conflictSamples.length) {
    console.log('\n  Sample conflicts (schoolId|studentId|date → statuses):');
    for (const s of conflictSamples) {
      console.log(`    ${s.key}  → ${s.statuses.join(' / ')}  across ${s.periods} period(s)`);
    }
  }

  if (conflicts > 0 && pct > MAX_CONFLICT_PCT && !FORCE) {
    console.log(
      `\n🛑 STOPPING. ${pct.toFixed(2)}% of student-days disagree across periods, above the ` +
        `${MAX_CONFLICT_PCT}% threshold.\n` +
        `   "First period wins" would discard a real signal at this rate — a student marked ` +
        `absent later in the day would be recorded present.\n` +
        `   Review the samples above, then either raise --maxConflictPct or pass --force.`
    );
    return;
  }

  // ── 3. COLLAPSE ───────────────────────────────────────────────────────────
  console.log('\n── Step 3: collapse (first period of the day wins) ──');
  let written = 0;
  let skipped = 0;

  for (const entries of byStudentDay.values()) {
    // Earliest period first; createdAt breaks a tie when two periods share a
    // timestamp, keeping the run deterministic.
    entries.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
    const winner = entries[0];

    if (!winner.classId || !winner.sectionId || !winner.session || !winner.takenBy) {
      skipped++;
      continue;
    }

    if (APPLY) {
      await DailyAttendance.updateOne(
        { schoolId: winner.schoolId, studentId: winner.studentId, date: winner.day },
        {
          $set: {
            status: winner.status,
            leaveId: winner.leaveId,
            classId: winner.classId,
            sectionId: winner.sectionId,
            session: winner.session,
            markedBy: winner.takenBy,
            markedByRole: 'migration',
            markedAt: new Date(),
          },
          $setOnInsert: {
            schoolId: winner.schoolId,
            studentId: winner.studentId,
            date: winner.day,
          },
        },
        { upsert: true }
      );
    }
    written++;
  }
  console.log(
    `  ${APPLY ? 'Wrote' : 'Would write'} ${written} daily row(s); ${skipped} skipped (incomplete source).`
  );

  // ── 4. UNIQUE INDEX ───────────────────────────────────────────────────────
  console.log('\n── Step 4: unique index ──');
  if (APPLY) {
    // Safe now: step 3 guaranteed at most one row per (schoolId, studentId, date).
    await DailyAttendance.collection.createIndex(
      { schoolId: 1, studentId: 1, date: 1 },
      { unique: true, name: 'schoolId_1_studentId_1_date_1' }
    );
    console.log('  Unique index created on (schoolId, studentId, date).');
  } else {
    console.log('  Would create unique index on (schoolId, studentId, date).');
  }

  console.log('\n=== SUMMARY ===');
  console.log(`  source documents : ${total}`);
  console.log(`  archived         : ${archived} (+${alreadyArchived} already)`);
  console.log(`  student-days     : ${studentDays}`);
  console.log(`  conflicts        : ${conflicts} (${pct.toFixed(2)}%)`);
  console.log(`  daily rows       : ${written}`);
  if (!APPLY) console.log('\nDry run — nothing written. Re-run with --apply.');
  console.log(
    '\nSource Attendance documents were NOT deleted. Verify, then retire them separately.'
  );
}

run()
  .catch((err) => {
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
    console.log('Disconnected.');
  });
