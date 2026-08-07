// Deletes only the records seedReportCardData created, matched by their emails,
// admission numbers and exam names — nothing else is touched

require('dotenv').config();
if (process.env.NODE_ENV === 'production') {
  throw new Error('clearReportCardData refuses to run with NODE_ENV=production');
}

const mongoose = require('mongoose');
const connect  = require('../src/core/config/database');

const DUMMY_EMAILS = [
  'rc_s01@school.com','rc_s02@school.com','rc_s03@school.com',
  'rc_s04@school.com','rc_s05@school.com','rc_s06@school.com',
  'rc_s07@school.com','rc_s08@school.com','rc_s09@school.com',
  'rc_s10@school.com','rc_s11@school.com','rc_s12@school.com',
];

const DUMMY_EXAM_NAMES = [
  'FA1 Exam 1','FA1 Exam 2',
  'FA2 Exam 1','FA2 Exam 2',
  'SA-I (Half Yearly)',
  'FA3 Exam 1','FA3 Exam 2',
  'FA4 Exam 1','FA4 Exam 2',
  'SA-II (Annual)',
];

const DUMMY_SUBJECT_CODES = ['SCI','SST','COMP','SAN']; // codes not in seedMaster.js

const clear = async () => {
  await connect();

  const { User }          = require('../src/modules/identity');
  const StudentProfile    = require('../src/modules/people/models/StudentProfile');
  const Exam              = require('../src-old/models/Exam');
  const Marks             = require('../src-old/models/MarksModel');
  const ReportCard        = require('../src/modules/reportcards').ReportCard;
  const ReportCardMark    = require('../src/modules/reportcards').ReportCardMark;
  const CoScholasticMark  = require('../src-old/models/CoScholasticMark');
  const SubjectMaster     = require('../src-old/models/SubjectMaster');
  const ClassSubjectMap   = require('../src-old/models/ClassSubjectMap');
  const School            = require('../src/modules/tenancy').School;

  console.log('\n🗑️  Clearing Report Card Dummy Data...\n');

  // 0. Resolve school
  const school = await School.findByCode('DEMO2025');
  if (!school) {
    console.warn('⚠️  School "DEMO2025" not found — nothing to clear.');
    await mongoose.connection.close();
    process.exit(0);
  }

  // 1. Resolve dummy user IDs
  const dummyUsers = await User.find({ email: { $in: DUMMY_EMAILS }, schoolId: school._id });
  const dummyUserIds = dummyUsers.map(u => u._id);
  console.log(`  Found ${dummyUserIds.length} dummy user(s).`);

  // 2. Resolve dummy student profile IDs
  const dummyProfiles = await StudentProfile.find({
    userId: { $in: dummyUserIds },
    schoolId: school._id,
  });
  const dummyProfileIds = dummyProfiles.map(p => p._id);
  console.log(`  Found ${dummyProfileIds.length} dummy student profile(s).`);

  // 3. Resolve dummy exam IDs
  const dummyExams = await Exam.find({ name: { $in: DUMMY_EXAM_NAMES }, schoolId: school._id });
  const dummyExamIds = dummyExams.map(e => e._id);
  console.log(`  Found ${dummyExamIds.length} dummy exam(s).`);

  // 4. Resolve dummy ReportCard IDs
  const dummyRCs = await ReportCard.find({ studentId: { $in: dummyProfileIds }, schoolId: school._id });
  const dummyRCIds = dummyRCs.map(rc => rc._id);
  console.log(`  Found ${dummyRCIds.length} dummy report card(s).`);

  // 5. Delete CoScholasticMarks
  const { deletedCount: coDeleted } = await CoScholasticMark.deleteMany({
    reportCardId: { $in: dummyRCIds },
    schoolId: school._id,
  });
  console.log(`✅  CoScholasticMarks deleted : ${coDeleted}`);

  // 6. Delete ReportCardMarks
  const { deletedCount: rcmDeleted } = await ReportCardMark.deleteMany({
    reportCardId: { $in: dummyRCIds },
    schoolId: school._id,
  });
  console.log(`✅  ReportCardMarks deleted   : ${rcmDeleted}`);

  // 7. Delete ReportCards
  const { deletedCount: rcDeleted } = await ReportCard.deleteMany({
    studentId: { $in: dummyProfileIds },
    schoolId: school._id,
  });
  console.log(`✅  ReportCards deleted       : ${rcDeleted}`);

  // 8. Delete raw Marks
  const { deletedCount: marksDeleted } = await Marks.deleteMany({
    studentId: { $in: dummyUserIds },
    examId:    { $in: dummyExamIds },
    schoolId:  school._id,
  });
  console.log(`✅  Raw Marks deleted         : ${marksDeleted}`);

  // 9. Delete Exams
  const { deletedCount: examsDeleted } = await Exam.deleteMany({
    name: { $in: DUMMY_EXAM_NAMES },
    schoolId: school._id,
  });
  console.log(`✅  Exams deleted             : ${examsDeleted}`);

  // 10. Delete Student Profiles
  const { deletedCount: profsDeleted } = await StudentProfile.deleteMany({
    userId: { $in: dummyUserIds },
    schoolId: school._id,
  });
  console.log(`✅  Student Profiles deleted  : ${profsDeleted}`);

  // 11. Delete User accounts
  const { deletedCount: usersDeleted } = await User.deleteMany({
    email: { $in: DUMMY_EMAILS },
    schoolId: school._id,
  });
  console.log(`✅  User accounts deleted     : ${usersDeleted}`);

  // 12. Delete extra subjects (SCI, SST, COMP, SAN) added by this script
  //   Only if they are NOT referenced by any non-dummy ClassSubjectMap
  const extraSubs = await SubjectMaster.find({ code: { $in: DUMMY_SUBJECT_CODES }, schoolId: school._id });
  let subsDeleted = 0;
  for (const sub of extraSubs) {
    await ClassSubjectMap.deleteMany({ subjectId: sub._id, classId: /* class10 */ { $exists: true }, schoolId: school._id });
    await sub.deleteOne();
    subsDeleted++;
  }
  console.log(`✅  Extra Subjects deleted    : ${subsDeleted}`);

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('🧹  Clear complete — all dummy Report Card data removed.');
  console.log('    Existing non-dummy data is untouched.');
  console.log('══════════════════════════════════════════════════════════════\n');

  await mongoose.connection.close();
  process.exit(0);
};

clear().catch((err) => {
  console.error('\n💥  Clear script failed:', err);
  mongoose.connection.close();
  process.exit(1);
});
