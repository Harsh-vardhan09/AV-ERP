// Minimal report card seed: school 001100, teachers, subjects, classes 9-10, marks.
// Idempotent — upserts, safe to re-run
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const connect  = require('../src/core/config/database');

// Upsert helper
const upsert = async (Model, query, data) => {
  let doc = await Model.findOne(query);
  let created = false;
  if (!doc) { doc = await Model.create(data); created = true; }
  return { doc, created };
};

const SCHOOL_CODE  = '001100';
const SCHOOL_EMAIL = 'sps2026@gmail.com';

const main = async () => {
  await connect();

  const School                   = require('../src-old/models/School');
  const { User }                 = require('../src-old/models/user');
  const AcademicSession          = require('../src-old/models/AcademicSession');
  const ClassModel               = require('../src-old/models/ClassModel');
  const SectionModel             = require('../src-old/models/SectionModel');
  const SubjectMaster            = require('../src-old/models/SubjectMaster');
  const TeacherProfile           = require('../src-old/models/TeacherProfile');
  const StudentProfile           = require('../src-old/models/StudentProfile');
  const ClassSubjectMap          = require('../src-old/models/ClassSubjectMap');
  const ClassTeacherAssignment   = require('../src-old/models/ClassTeacherAssignment');
  const TeacherSubjectAssignment = require('../src-old/models/TeacherSubjectAssignment');
  const ReportCard               = require('../src-old/models/ReportCard');
  const ReportCardMark           = require('../src-old/models/ReportCardMark');

  console.log('\n🌱 Report Card Seed Starting...\n');

  // STEP 1: School
  let school = await School.findByCode(SCHOOL_CODE);
  if (!school) {
    school = await School.create({
      name:     'SPS Public School',
      code:     SCHOOL_CODE,
      email:    SCHOOL_EMAIL,
      address:  '1 School Road, Indore, MP',
      phone:    '9876500000',
      isActive: true,
    });
    console.log('✅ Step 1: School created —', school.name);
  } else {
    console.log('✅ Step 1: School exists —', school.name);
  }

  // STEP 2: Admin User
  let adminUser;
  {
    let u = await User.findOne({ email: SCHOOL_EMAIL, schoolId: school._id });
    if (!u) u = await User.findOne({ email: SCHOOL_EMAIL });
    if (!u) {
      const hash = await bcrypt.hash('Admin@1234', 10);
      u = await User.create({
        firstName: 'SPS', lastName: 'Admin',
        email: SCHOOL_EMAIL, password: hash,
        role: 'admin', schoolId: school._id,
        isActive: true, isVerified: true,
      });
      if (!school.adminUserId) { school.adminUserId = u._id; await school.save(); }
      console.log('✅ Step 2: Admin user created');
    } else {
      if (!u.schoolId || u.schoolId.toString() !== school._id.toString()) {
        u.schoolId = school._id; await u.save();
      }
      console.log('✅ Step 2: Admin user exists');
    }
    adminUser = u;
  }

  // STEP 3: Academic Session
  const { doc: session, created: sesCreated } = await upsert(
    AcademicSession,
    { name: '2025-2026', schoolId: school._id },
    { name: '2025-2026', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isActive: true, schoolId: school._id }
  );
  console.log(`✅ Step 3: Academic Session — ${sesCreated ? 'Created' : 'Exists'}: ${session.name}`);

  // STEP 4: Classes (9 & 10)
  const { doc: class9 }  = await upsert(ClassModel, { name: 'Class 9',  session: session._id, schoolId: school._id }, { name: 'Class 9',  numericOrder: 9,  session: session._id, schoolId: school._id });
  const { doc: class10 } = await upsert(ClassModel, { name: 'Class 10', session: session._id, schoolId: school._id }, { name: 'Class 10', numericOrder: 10, session: session._id, schoolId: school._id });
  console.log('✅ Step 4: Classes — Class 9 & Class 10');

  // STEP 5: Sections (A for each class)
  const { doc: sec9A }  = await upsert(SectionModel, { name: 'Section A', classId: class9._id,  session: session._id, schoolId: school._id }, { name: 'Section A', classId: class9._id,  session: session._id, schoolId: school._id });
  const { doc: sec10A } = await upsert(SectionModel, { name: 'Section A', classId: class10._id, session: session._id, schoolId: school._id }, { name: 'Section A', classId: class10._id, session: session._id, schoolId: school._id });
  console.log('✅ Step 5: Sections — Section A for Class 9 & 10');

  // STEP 6: Subjects (5)
  const subjectsData = [
    { name: 'Mathematics', code: 'MATH' },
    { name: 'Science',     code: 'SCI'  },
    { name: 'English',     code: 'ENG'  },
    { name: 'Hindi',       code: 'HIN'  },
    { name: 'Social Science', code: 'SST' },
  ];
  const subjects = [];
  for (const s of subjectsData) {
    const { doc } = await upsert(SubjectMaster, { code: s.code, schoolId: school._id }, { name: s.name, code: s.code, type: 'core', schoolId: school._id });
    subjects.push(doc);
  }
  const [subMath, subSci, subEng, subHin, subSST] = subjects;
  console.log('✅ Step 6: Subjects — Math, Science, English, Hindi, Social Science');

  // STEP 7: Teacher Users (5)
  const teacherData = [
    { email: 'teacher1.sps@school.com', firstName: 'Ramesh',   lastName: 'Sharma',  empId: 'T001', tid: 'TID001' },
    { email: 'teacher2.sps@school.com', firstName: 'Priya',    lastName: 'Verma',   empId: 'T002', tid: 'TID002' },
    { email: 'teacher3.sps@school.com', firstName: 'Amit',     lastName: 'Singh',   empId: 'T003', tid: 'TID003' },
    { email: 'teacher4.sps@school.com', firstName: 'Sunita',   lastName: 'Patel',   empId: 'T004', tid: 'TID004' },
    { email: 'teacher5.sps@school.com', firstName: 'Rajesh',   lastName: 'Kumar',   empId: 'T005', tid: 'TID005' },
  ];
  const teacherUsers = [];
  for (const t of teacherData) {
    let u = await User.findOne({ email: t.email, schoolId: school._id });
    if (!u) u = await User.findOne({ email: t.email });
    if (!u) {
      const hash = await bcrypt.hash('Teacher@1234', 10);
      u = await User.create({ firstName: t.firstName, lastName: t.lastName, email: t.email, password: hash, role: 'teacher', schoolId: school._id, isActive: true, isVerified: true });
    } else if (!u.schoolId || u.schoolId.toString() !== school._id.toString()) {
      u.schoolId = school._id; await u.save();
    }
    teacherUsers.push(u);
  }
  console.log('✅ Step 7: Teacher Users — 5 created/verified');

  // STEP 8: Teacher Profiles
  for (let i = 0; i < teacherUsers.length; i++) {
    const u = teacherUsers[i];
    const t = teacherData[i];
    await upsert(
      TeacherProfile,
      { userId: u._id },
      { userId: u._id, firstName: u.firstName, lastName: u.lastName, employeeId: t.empId, teacherId: t.tid, qualification: 'M.Ed', experience: 5, status: 'active', schoolId: school._id }
    );
  }
  console.log('✅ Step 8: Teacher Profiles — 5 upserted');

  // STEP 9: Student Users (5 per class = 10 total)
  const studentDataRaw = [
    // Class 9
    { email: 's9_1.sps@school.com',  firstName: 'Aarav',  lastName: 'Gupta',  rollNo: '901',  studentId: 'SSPS-9-001', scholarNo: 'SCH9001', dob: new Date('2010-03-15'), cls: class9,  sec: sec9A,  admNo: 'SPS-9-001' },
    { email: 's9_2.sps@school.com',  firstName: 'Sneha',  lastName: 'Sharma', rollNo: '902',  studentId: 'SSPS-9-002', scholarNo: 'SCH9002', dob: new Date('2010-07-22'), cls: class9,  sec: sec9A,  admNo: 'SPS-9-002' },
    { email: 's9_3.sps@school.com',  firstName: 'Rohan',  lastName: 'Verma',  rollNo: '903',  studentId: 'SSPS-9-003', scholarNo: 'SCH9003', dob: new Date('2010-11-05'), cls: class9,  sec: sec9A,  admNo: 'SPS-9-003' },
    { email: 's9_4.sps@school.com',  firstName: 'Pooja',  lastName: 'Singh',  rollNo: '904',  studentId: 'SSPS-9-004', scholarNo: 'SCH9004', dob: new Date('2010-01-18'), cls: class9,  sec: sec9A,  admNo: 'SPS-9-004' },
    { email: 's9_5.sps@school.com',  firstName: 'Vikram', lastName: 'Patel',  rollNo: '905',  studentId: 'SSPS-9-005', scholarNo: 'SCH9005', dob: new Date('2010-09-30'), cls: class9,  sec: sec9A,  admNo: 'SPS-9-005' },
    // Class 10
    { email: 's10_1.sps@school.com', firstName: 'Arjun',  lastName: 'Kumar',  rollNo: '1001', studentId: 'SSPS-10-001', scholarNo: 'SCH10001', dob: new Date('2009-04-10'), cls: class10, sec: sec10A, admNo: 'SPS-10-001' },
    { email: 's10_2.sps@school.com', firstName: 'Divya',  lastName: 'Mehta',  rollNo: '1002', studentId: 'SSPS-10-002', scholarNo: 'SCH10002', dob: new Date('2009-08-25'), cls: class10, sec: sec10A, admNo: 'SPS-10-002' },
    { email: 's10_3.sps@school.com', firstName: 'Manish', lastName: 'Yadav',  rollNo: '1003', studentId: 'SSPS-10-003', scholarNo: 'SCH10003', dob: new Date('2009-12-14'), cls: class10, sec: sec10A, admNo: 'SPS-10-003' },
    { email: 's10_4.sps@school.com', firstName: 'Kavya',  lastName: 'Tiwari', rollNo: '1004', studentId: 'SSPS-10-004', scholarNo: 'SCH10004', dob: new Date('2009-06-03'), cls: class10, sec: sec10A, admNo: 'SPS-10-004' },
    { email: 's10_5.sps@school.com', firstName: 'Suresh', lastName: 'Joshi',  rollNo: '1005', studentId: 'SSPS-10-005', scholarNo: 'SCH10005', dob: new Date('2009-02-19'), cls: class10, sec: sec10A, admNo: 'SPS-10-005' },
  ];

  const studentProfiles = [];
  for (const sd of studentDataRaw) {
    let u = await User.findOne({ email: sd.email, schoolId: school._id });
    if (!u) u = await User.findOne({ email: sd.email });
    if (!u) {
      const hash = await bcrypt.hash('Student@1234', 10);
      u = await User.create({ firstName: sd.firstName, lastName: sd.lastName, email: sd.email, password: hash, role: 'student', schoolId: school._id, isActive: true, isVerified: true });
    } else if (!u.schoolId || u.schoolId.toString() !== school._id.toString()) {
      u.schoolId = school._id; await u.save();
    }
    const { doc: sp } = await upsert(
      StudentProfile,
      { userId: u._id, schoolId: school._id },
      {
        userId: u._id, firstName: u.firstName, lastName: u.lastName,
        admissionNumber: sd.admNo, studentId: sd.studentId, scholarNo: sd.scholarNo, rollNo: sd.rollNo,
        dateOfBirth: sd.dob, gender: 'male',
        classId: sd.cls._id, sectionId: sd.sec._id, session: session._id,
        address: 'School Road, Indore', city: 'Indore', state: 'MP', pincode: '452001',
        parentDetails: { father: { name: `${sd.lastName} Father`, phone: '9999900000' } },
        status: 'active', schoolId: school._id,
      }
    );
    studentProfiles.push(sp);
  }
  console.log('✅ Step 9: Student Profiles — 10 (5 per class) upserted');

  // STEP 10: Class-Subject Mappings
  for (const cls of [class9, class10]) {
    for (const sub of subjects) {
      await upsert(ClassSubjectMap,
        { classId: cls._id, subjectId: sub._id, session: session._id, schoolId: school._id },
        { classId: cls._id, subjectId: sub._id, session: session._id, schoolId: school._id }
      );
    }
  }
  console.log('✅ Step 10: Class-Subject Maps — 5 subjects × 2 classes = 10 maps');

  // STEP 11: Teacher-Subject Assignments
  // Each teacher handles 1 subject across both classes
  // teacher[0]→Math, teacher[1]→Science, teacher[2]→English, teacher[3]→Hindi, teacher[4]→SST
  const subjectTeacherPairs = [
    { teacher: teacherUsers[0], subject: subMath },
    { teacher: teacherUsers[1], subject: subSci  },
    { teacher: teacherUsers[2], subject: subEng  },
    { teacher: teacherUsers[3], subject: subHin  },
    { teacher: teacherUsers[4], subject: subSST  },
  ];
  for (const { teacher, subject } of subjectTeacherPairs) {
    for (const [cls, sec] of [[class9, sec9A], [class10, sec10A]]) {
      await upsert(TeacherSubjectAssignment,
        { teacherId: teacher._id, subjectId: subject._id, classId: cls._id, sectionId: sec._id, session: session._id, schoolId: school._id },
        { teacherId: teacher._id, subjectId: subject._id, classId: cls._id, sectionId: sec._id, session: session._id, schoolId: school._id }
      );
    }
  }
  console.log('✅ Step 11: Teacher-Subject Assignments — 5 teachers × 2 classes = 10 assignments');

  // STEP 12: Class Teacher Assignments
  // teacher[0] → Class 9 Section A,  teacher[1] → Class 10 Section A
  await upsert(ClassTeacherAssignment,
    { classId: class9._id,  sectionId: sec9A._id,  session: session._id, schoolId: school._id },
    { teacherId: teacherUsers[0]._id, classId: class9._id,  sectionId: sec9A._id,  session: session._id, schoolId: school._id }
  );
  await upsert(ClassTeacherAssignment,
    { classId: class10._id, sectionId: sec10A._id, session: session._id, schoolId: school._id },
    { teacherId: teacherUsers[1]._id, classId: class10._id, sectionId: sec10A._id, session: session._id, schoolId: school._id }
  );
  console.log('✅ Step 12: Class Teacher Assignments — Class 9 & 10 assigned');

  // STEP 13: Report Cards + Marks for all 10 students
  // Sample marks pattern — varies per student (topper, avg, failing scenarios)
  const marksPattern = [
    // [Math, Science, English, Hindi, SST] — sa1 (out of 80) + fa1_1,fa1_2 (out of 10 each)
    { fa1_1: 9,  fa1_2: 8,  sa1: 72 }, // topper
    { fa1_1: 7,  fa1_2: 7,  sa1: 58 }, // average
    { fa1_1: 5,  fa1_2: 6,  sa1: 45 }, // average-low
    { fa1_1: 3,  fa1_2: 4,  sa1: 28 }, // failing
    { fa1_1: 8,  fa1_2: 9,  sa1: 68 }, // good
    { fa1_1: 6,  fa1_2: 7,  sa1: 55 }, // average
    { fa1_1: 9,  fa1_2: 9,  sa1: 78 }, // topper2
    { fa1_1: 4,  fa1_2: 3,  sa1: 30 }, // failing2
    { fa1_1: 7,  fa1_2: 8,  sa1: 62 }, // good2
    { fa1_1: 5,  fa1_2: 5,  sa1: 40 }, // average3
  ];

  let rcCreated = 0, rcSkipped = 0, markCreated = 0, markSkipped = 0;
  for (let i = 0; i < studentProfiles.length; i++) {
    const sp = studentProfiles[i];
    const pat = marksPattern[i];

    // Create ReportCard
    const { doc: rc, created: rcNew } = await upsert(
      ReportCard,
      { studentId: sp._id, session: session._id, schoolId: school._id },
      {
        studentId:    sp._id,
        classId:      sp.classId,
        session:      session._id,
        schoolId:     school._id,
        isFinalized:  false,
        remarksTerm1: 'Keep it up!',
      }
    );
    rcNew ? rcCreated++ : rcSkipped++;

    // Create ReportCardMark per subject
    for (const sub of subjects) {
      const { created: mNew } = await upsert(
        ReportCardMark,
        { reportCardId: rc._id, subject: sub.name, schoolId: school._id },
        {
          reportCardId: rc._id,
          subject:      sub.name,
          subjectId:    sub._id,
          fa1_1:        pat.fa1_1,
          fa1_2:        pat.fa1_2,
          sa1:          pat.sa1,
          total:        Math.round((pat.fa1_1 + pat.fa1_2 + pat.sa1) * 0.5), // simple total out of 50
          grade:        pat.sa1 >= 64 ? 'A' : pat.sa1 >= 48 ? 'B' : pat.sa1 >= 32 ? 'C' : 'D',
          schoolId:     school._id,
        }
      );
      mNew ? markCreated++ : markSkipped++;
    }
  }
  console.log(`✅ Step 13: Report Cards — ${rcCreated} created / ${rcSkipped} skipped`);
  console.log(`✅ Step 13: Report Card Marks — ${markCreated} created / ${markSkipped} skipped`);

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed Complete! Login credentials:');
  console.log(`   Admin    : ${SCHOOL_EMAIL}        / Admin@1234`);
  console.log('   Teachers : teacher1.sps@school.com … teacher5.sps@school.com / Teacher@1234');
  console.log('   Students : s9_1.sps@school.com … s10_5.sps@school.com / Student@1234');
  console.log(`   School Code: ${SCHOOL_CODE}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
};

main().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
