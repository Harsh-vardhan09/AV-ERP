// Explains why an exam's marks are missing from a report card.
// Usage: node tools/diagnoseReportCardMarks.js <studentUserId> [sessionId]

'use strict';

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set. Add it to your .env file.');
  process.exit(1);
}

// Models (inline require — no need for full app boot)
const Exam = require('../src/modules/examination').Exam;
const Marks = require('../src/modules/examination').MarksModel;
const ReportCard = require('../src/modules/reportcards').ReportCard;
const ReportCardMark = require('../src/modules/reportcards').ReportCardMark;
const StudentProfile = require('../src/modules/people/models/StudentProfile');
const AcademicSession = require('../src/modules/academics').AcademicSession;
const ExamSubjectConfig = require('../src/modules/examination').ExamSubjectConfig;

const sep = () => console.log('\n' + '─'.repeat(72));

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const studentUserIdArg = process.argv[2] || process.env.STUDENT_USER_ID;
  const sessionIdArg = process.argv[3] || process.env.SESSION_ID;

  if (!studentUserIdArg) {
    console.error('❌ Usage: node diagnoseReportCardMarks.js <studentUserId> [sessionId]');
    process.exit(1);
  }

  // 1. Find student profile
  sep();
  console.log('🔍 STEP 1: Finding student profile for userId:', studentUserIdArg);
  const student = await StudentProfile.findOne({ userId: studentUserIdArg })
    .populate('userId', 'firstName lastName email')
    .populate('classId', 'name numericOrder')
    .populate('sectionId', 'name')
    .populate('session', 'name isActive');

  if (!student) {
    console.error('❌ No StudentProfile found for userId:', studentUserIdArg);
    process.exit(1);
  }
  console.log('✅ Student found:');
  console.log('   Name    :', student.firstName, student.lastName);
  console.log('   Class   :', student.classId?.name, '(', String(student.classId?._id), ')');
  console.log('   Section :', student.sectionId?.name);
  console.log('   Session :', student.session?.name, '(', String(student.session?._id), ')');
  console.log('   SchoolId:', String(student.schoolId || '(not set)'));

  const classId = student.classId?._id;
  const schoolId = student.schoolId;
  const userId = student.userId?._id;

  // 2. Resolve session
  sep();
  console.log('🔍 STEP 2: Resolving session');
  let sessionId = sessionIdArg ? new mongoose.Types.ObjectId(sessionIdArg) : student.session?._id;

  if (!sessionId) {
    const active = await AcademicSession.findOne({ isActive: true, schoolId }).select('_id name');
    sessionId = active?._id;
    console.log('   Using active session:', active?.name, String(sessionId));
  } else {
    console.log('   Using session:', String(sessionId));
  }

  if (!sessionId) {
    console.error('❌ No session found. Activate a session or pass session ID as arg.');
    process.exit(1);
  }

  // 3. Fetch ALL exams for this class + session
  sep();
  console.log(
    '🔍 STEP 3: Fetching ALL exams for classId:',
    String(classId),
    'session:',
    String(sessionId)
  );
  const classExams = await Exam.find({
    classIds: classId,
    session: sessionId,
    schoolId,
  }).sort({ startDate: 1 });

  if (classExams.length === 0) {
    console.warn('⚠️  NO EXAMS found for this class+session+school!');
    console.warn('    → Create exams first in the Exam Management module.');
  } else {
    console.log(`✅ ${classExams.length} exam(s) found:`);
    classExams.forEach((e, i) => {
      console.log(
        `   [${i + 1}] ${e.name} | type: ${e.type} | _id: ${e._id} | startDate: ${e.startDate || 'N/A'}`
      );
    });
  }

  // 4. Check ExamSubjectConfig for each exam
  sep();
  console.log('🔍 STEP 4: Checking ExamSubjectConfig for each exam');
  for (const exam of classExams) {
    const configs = await ExamSubjectConfig.find({ examId: exam._id, classId, schoolId }).populate(
      'subjectId',
      'name'
    );
    if (configs.length === 0) {
      console.warn(
        `   ⚠️  [${exam.name}] — NO subject configs found (maxMarks will default to 100)`
      );
    } else {
      console.log(`   ✅ [${exam.name}] — ${configs.length} subject(s) configured:`);
      configs.forEach((c) =>
        console.log(`      • ${c.subjectId?.name || c.subjectId} — maxMarks: ${c.maxMarks}`)
      );
    }
  }

  // 5. Fetch marks for this student
  sep();
  console.log('🔍 STEP 5: Fetching ALL marks for this student from Marks collection');
  console.log(
    '   studentUserId:',
    String(userId),
    '| classId:',
    String(classId),
    '| session:',
    String(sessionId)
  );

  const marks = await Marks.find({
    studentId: userId,
    classId,
    session: sessionId,
  })
    .populate('examId', 'name type')
    .populate('subjectId', 'name');

  if (marks.length === 0) {
    console.warn('⚠️  NO marks found for this student/class/session!');
    console.warn('    → Upload marks first via the Marks Entry module.');
  } else {
    console.log(`✅ ${marks.length} mark record(s) found:`);
    marks.forEach((m) => {
      console.log(
        `   Exam: "${m.examId?.name || m.examId}" (${m.examId?._id})`,
        `| Subject: "${m.subjectId?.name || m.subjectId}"`,
        `| Marks: ${m.marksObtained}`,
        `| schoolId: ${m.schoolId || '⚠ NOT SET'}`
      );
    });
  }

  // 6. Cross-check: exams with marks vs. class exams
  sep();
  console.log('🔍 STEP 6: Cross-checking exam IDs in marks vs. class exam IDs');
  const classExamIdSet = new Set(classExams.map((e) => String(e._id)));
  const marksExamIds = [...new Set(marks.map((m) => String(m.examId?._id || m.examId)))];

  marksExamIds.forEach((eid) => {
    if (classExamIdSet.has(eid)) {
      const exam = classExams.find((e) => String(e._id) === eid);
      console.log(`   ✅ Exam "${exam?.name}" (${eid}) — marks exist AND exam is in class list`);
    } else {
      console.warn(`   ❌ Exam ID ${eid} — HAS marks but NOT in class exam list!`);
      console.warn(`      → This means the exam's classIds or session/schoolId doesn't match.`);
    }
  });

  classExams.forEach((e) => {
    if (!marksExamIds.includes(String(e._id))) {
      console.warn(`   ⚠️  Exam "${e.name}" (${e._id}) — in class list but NO marks uploaded yet`);
    }
  });

  // 7. Check ReportCard + ReportCardMark rows
  sep();
  console.log('🔍 STEP 7: Checking ReportCard and ReportCardMark rows');
  const reportCard = await ReportCard.findOne({
    studentId: student._id,
    session: sessionId,
    schoolId,
  });

  if (!reportCard) {
    console.warn(
      '⚠️  No ReportCard exists yet for this student+session. It will be created on first GET.'
    );
  } else {
    console.log('✅ ReportCard found:', String(reportCard._id));
    console.log('   isFinalized  :', reportCard.isFinalized);
    console.log('   lastSyncedAt :', reportCard.lastSyncedAt || 'N/A');

    const rcMarks = await ReportCardMark.find({ reportCardId: reportCard._id, schoolId });
    console.log(`\n   ${rcMarks.length} ReportCardMark row(s):`);
    rcMarks.forEach((row) => {
      const dm =
        row.dynamicMarks instanceof Map
          ? Object.fromEntries(row.dynamicMarks)
          : row.dynamicMarks || {};
      const dmKeys = Object.keys(dm);
      console.log(
        `   • Subject: "${row.subject}"`,
        `| isEdited: ${row.isEdited}`,
        `| dynamicMarks keys: [${dmKeys.join(', ')}]`,
        `| dynamicTotal: ${row.dynamicTotal}`
      );
      if (dmKeys.length > 0) {
        dmKeys.forEach((eid) => {
          const exam = classExams.find((e) => String(e._id) === eid);
          const label = exam ? `"${exam.name}"` : `UNKNOWN EXAM (${eid})`;
          console.log(`     → ${label}: ${dm[eid]}`);
        });
      }
    });

    // Check if isEdited is blocking any rows
    const blockedRows = rcMarks.filter((row) => {
      const dm =
        row.dynamicMarks instanceof Map
          ? Object.fromEntries(row.dynamicMarks)
          : row.dynamicMarks || {};
      return row.isEdited && Object.keys(dm).length > 0;
    });

    if (blockedRows.length > 0) {
      sep();
      console.warn(`\n⚠️  PREVIOUSLY BLOCKED ROWS (isEdited=true + has dynamicMarks):`);
      console.warn(
        `   These rows were SKIPPED by old sync logic but will now be MERGED correctly.`
      );
      blockedRows.forEach((row) => {
        console.warn(
          `   • "${row.subject}" — was blocked, will be fixed on next report card fetch`
        );
      });
      console.log('\n✅ The merge fix in reportCardController.js will resolve this automatically.');
      console.log('   Just open the report card in the browser to trigger re-sync.');
    } else {
      console.log('\n✅ No blocked rows found.');
    }
  }

  // 8. Summary
  sep();
  console.log('📋 SUMMARY');
  console.log(`   Class Exams found     : ${classExams.length}`);
  console.log(`   Student mark records  : ${marks.length}`);
  console.log(`   Exam IDs with marks   : ${marksExamIds.length}`);
  if (reportCard) {
    const rcMarks = await ReportCardMark.find({ reportCardId: reportCard._id, schoolId });
    console.log(`   ReportCardMark rows   : ${rcMarks.length}`);
    console.log(`   Report card finalized : ${reportCard.isFinalized}`);
  }

  console.log('\n✅ Diagnosis complete.\n');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Script error:', err);
  mongoose.disconnect().finally(() => process.exit(1));
});
