// Seeds the report card flow but deliberately no marks, so the readiness gate is demoable
// rather than landing on an already-published card. Needs seedSchool first

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const connect  = require('../src/core/config/database');

const SCHOOL_CODE = process.env.REPORT_DEMO_SCHOOL_CODE || 'DEMO2025';
// Demo-only password. Override with SEED_DEMO_PASSWORD for anything shared.
const PASSWORD    = process.env.SEED_DEMO_PASSWORD || 'Demo@1234';

// Upsert helper — matches the pattern used by the other seed files
const upsert = async (Model, query, data) => {
  let doc = await Model.findOne(query);
  if (doc) return { doc, created: false };
  doc = await Model.create(data);
  return { doc, created: true };
};

const SUBJECTS = [
  { name: 'English',        code: 'RCD-ENG'  },
  { name: 'Hindi',          code: 'RCD-HIN'  },
  { name: 'Mathematics',    code: 'RCD-MATH' },
  { name: 'Science',        code: 'RCD-SCI'  },
  { name: 'Social Science', code: 'RCD-SST'  },
];

const STUDENTS = [
  { fn: 'Aarav',  ln: 'Sharma', roll: '01', gender: 'male',   dob: '2012-04-11' },
  { fn: 'Ananya', ln: 'Verma',  roll: '02', gender: 'female', dob: '2012-08-23' },
  { fn: 'Rohan',  ln: 'Gupta',  roll: '03', gender: 'male',   dob: '2012-01-30' },
  { fn: 'Priya',  ln: 'Singh',  roll: '04', gender: 'female', dob: '2012-11-05' },
  { fn: 'Kabir',  ln: 'Mehta',  roll: '05', gender: 'male',   dob: '2012-06-17' },
  { fn: 'Sneha',  ln: 'Patel',  roll: '06', gender: 'female', dob: '2012-09-02' },
];

const seed = async () => {
  await connect();

  const School                   = require('../src/modules/tenancy').School;
  const { User }                 = require('../src/modules/identity');
  const AcademicSession          = require('../src-old/models/AcademicSession');
  const ClassModel               = require('../src-old/models/ClassModel');
  const SectionModel             = require('../src-old/models/SectionModel');
  const SubjectMaster            = require('../src-old/models/SubjectMaster');
  const ClassSubjectMap          = require('../src-old/models/ClassSubjectMap');
  const TeacherProfile           = require('../src/modules/people/models/TeacherProfile');
  const TeacherSubjectAssignment = require('../src-old/models/TeacherSubjectAssignment');
  const ClassTeacherAssignment   = require('../src-old/models/ClassTeacherAssignment');
  const StudentProfile           = require('../src/modules/people/models/StudentProfile');
  const Exam                     = require('../src-old/models/Exam');
  const ExamSubjectConfig        = require('../src-old/models/ExamSubjectConfig');

  console.log(`\n🌱  Report Card demo seed → school ${SCHOOL_CODE}\n`);

  // 0. School (must already exist)
  const school = await School.findByCode(SCHOOL_CODE);
  if (!school) {
    console.error(`❌  School "${SCHOOL_CODE}" not found. Run seedSchool.js first.`);
    process.exit(1);
  }
  const schoolId = school._id;
  console.log(`✅  School: ${school.name} (${school.code})`);

  const admin = await User.findOne({ schoolId, role: 'admin' }).select('_id email');
  if (!admin) {
    console.error('❌  No admin user for this school. Run seedSchool.js first.');
    process.exit(1);
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);

  // 1. Academic session (active)
  const { doc: session, created: sNew } = await upsert(
    AcademicSession,
    { name: '2025-2026', schoolId },
    {
      name: '2025-2026',
      startDate: new Date('2025-04-01'),
      endDate:   new Date('2026-03-31'),
      isActive:  true,
      schoolId,
    }
  );
  // The admin dashboard reads the ACTIVE session — make sure exactly one is.
  await AcademicSession.updateMany({ schoolId, _id: { $ne: session._id } }, { $set: { isActive: false } });
  await AcademicSession.updateOne({ _id: session._id }, { $set: { isActive: true } });
  console.log(`✅  Session: ${session.name} ${sNew ? '(created)' : '(exists)'} — active`);

  // 2. Class + section
  const { doc: klass } = await upsert(
    ClassModel,
    { name: 'Class 5', session: session._id, schoolId },
    { name: 'Class 5', numericOrder: 5, session: session._id, schoolId }
  );
  const { doc: section } = await upsert(
    SectionModel,
    { name: 'A', classId: klass._id, session: session._id, schoolId },
    { name: 'A', classId: klass._id, session: session._id, schoolId }
  );
  console.log(`✅  Class 5 / Section A`);

  // 3. Subjects + class-subject mapping
  const subjects = [];
  for (const s of SUBJECTS) {
    const { doc } = await upsert(
      SubjectMaster,
      { code: s.code, schoolId },
      { name: s.name, code: s.code, type: 'core', schoolId }
    );
    subjects.push(doc);
    await upsert(
      ClassSubjectMap,
      { classId: klass._id, subjectId: doc._id, session: session._id, schoolId },
      { classId: klass._id, subjectId: doc._id, session: session._id, schoolId }
    );
  }
  console.log(`✅  Subjects: ${subjects.map(s => s.name).join(', ')}`);

  // 4. Teacher — owns all 5 subjects AND is the class teacher
  // One teacher covering everything keeps the demo to a single teacher login.
  const teacherEmail = 'rcdemo.teacher@school.com';
  let teacherUser = await User.findOne({ email: teacherEmail, schoolId });
  if (!teacherUser) {
    teacherUser = await User.create({
      firstName: 'Meera', lastName: 'Iyer',
      email: teacherEmail, password: hashed,
      role: 'teacher', schoolId, isActive: true, isVerified: true,
    });
  }
  await upsert(
    TeacherProfile,
    { userId: teacherUser._id },
    {
      userId: teacherUser._id,
      firstName: 'Meera', lastName: 'Iyer',
      employeeId: 'RCD-T001', teacherId: 'RCD-T001',
      qualification: 'M.Ed', status: 'active', schoolId,
    }
  );
  for (const sub of subjects) {
    await upsert(
      TeacherSubjectAssignment,
      { teacherId: teacherUser._id, subjectId: sub._id, classId: klass._id, sectionId: section._id, session: session._id, schoolId },
      { teacherId: teacherUser._id, subjectId: sub._id, classId: klass._id, sectionId: section._id, session: session._id, schoolId }
    );
  }
  await upsert(
    ClassTeacherAssignment,
    { classId: klass._id, sectionId: section._id, session: session._id, schoolId },
    { teacherId: teacherUser._id, classId: klass._id, sectionId: section._id, session: session._id, schoolId }
  );
  console.log(`✅  Teacher: ${teacherEmail} — all ${subjects.length} subjects + class teacher`);

  // 5. Students
  const studentEmails = [];
  for (const s of STUDENTS) {
    const email = `rcdemo.student${s.roll}@school.com`;
    let user = await User.findOne({ email, schoolId });
    if (!user) {
      user = await User.create({
        firstName: s.fn, lastName: s.ln,
        email, password: hashed,
        role: 'student', schoolId, isActive: true, isVerified: true,
      });
    }
    await upsert(
      StudentProfile,
      { userId: user._id, schoolId },
      {
        userId: user._id,
        firstName: s.fn, lastName: s.ln,
        // All three ids are uniquely indexed — never leave them null.
        admissionNumber: `RCD-ADM-${s.roll}`,
        studentId:       `RCD-STU-${s.roll}`,
        scholarNo:       `RCD-SCH-${s.roll}`,
        rollNo:          s.roll,
        dateOfBirth:     new Date(s.dob),
        gender:          s.gender,
        classId:   klass._id,
        sectionId: section._id,
        session:   session._id,
        address: 'Demo Colony', city: 'Indore', state: 'MP', pincode: '452001',
        parentDetails: { father: { name: `${s.fn}'s Father`, phone: '9999900000' } },
        status: 'active',
        schoolId,
      }
    );
    studentEmails.push(email);
  }
  console.log(`✅  Students: ${STUDENTS.length} in Class 5-A`);

  // 6. Exams + per-subject config
  // ExamSubjectConfig is what marksReadinessService counts as "required", so
  // every subject needs one for the readiness gate to mean anything.
  //
  // Component types match the CBSE Two-Term template's marksFields
  // (pertest / nb / se / halfyearly | yearly) so the aggregator emits
  // t1_pertest, t2_yearly, … per subject row and the card renders populated.
  const EXAMS = [
    {
      name: 'Half Yearly Examination', type: 'half_yearly',
      start: '2025-09-15', end: '2025-09-25',
      dist: [
        { type: 'pertest',    label: 'Per Test',    maxMarks: 10 },
        { type: 'nb',         label: 'Note Book',   maxMarks: 5  },
        { type: 'se',         label: 'Subject Enrichment', maxMarks: 5 },
        { type: 'halfyearly', label: 'Half Yearly', maxMarks: 80 },
      ],
    },
    {
      name: 'Annual Examination', type: 'annual',
      start: '2026-03-05', end: '2026-03-18',
      dist: [
        { type: 'pertest', label: 'Per Test',    maxMarks: 10 },
        { type: 'nb',      label: 'Note Book',   maxMarks: 5  },
        { type: 'se',      label: 'Subject Enrichment', maxMarks: 5 },
        { type: 'yearly',  label: 'Yearly Exam', maxMarks: 80 },
      ],
    },
  ];

  const exams = [];
  for (const e of EXAMS) {
    const { doc: exam } = await upsert(
      Exam,
      { name: e.name, session: session._id, schoolId },
      {
        name: e.name, type: e.type,
        description: 'Report card demo exam',
        session: session._id, classIds: [klass._id],
        startDate: new Date(e.start), endDate: new Date(e.end),
        status: 'completed',
        createdBy: admin._id, createdByRole: 'admin',
        schoolId,
      }
    );
    exams.push(exam);
    for (const sub of subjects) {
      // Config may pre-date this seed with different components — keep it current.
      await ExamSubjectConfig.findOneAndUpdate(
        { examId: exam._id, classId: klass._id, subjectId: sub._id, schoolId },
        {
          $set: {
            maxMarks: 100, passingMarks: 33,
            marksDistribution: e.dist,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`✅  Exam: ${exam.name} + ${subjects.length} subject configs`);
  }

  // 7. Optional marks
  // Off by default so the readiness gate starts at 0% and can be demoed.
  // SEED_DEMO_MARKS=1 fills every component for a fully-populated report card.
  if (process.env.SEED_DEMO_MARKS === '1') {
    const Marks = require('../src-old/models/MarksModel');
    const students = await StudentProfile.find({ classId: klass._id, session: session._id, schoolId })
      .select('_id userId rollNo').lean();

    // Deterministic per student+subject so re-runs produce identical cards.
    const pick = (seed, lo, hi) => lo + ((seed * 37) % (hi - lo + 1));

    const ops = [];
    students.forEach((stu, si) => {
      subjects.forEach((sub, bi) => {
        exams.forEach((exam, ei) => {
          const s = si * 13 + bi * 7 + ei * 3;
          const main = exam.type === 'half_yearly' ? 'halfyearly' : 'yearly';
          const fields = {
            pertest: pick(s + 1, 6, 10),
            nb:      pick(s + 2, 3, 5),
            se:      pick(s + 3, 3, 5),
            [main]:  pick(s + 4, 45, 78),
          };
          ops.push({
            updateOne: {
              filter: { examId: exam._id, studentId: stu._id, subjectId: sub._id, schoolId },
              update: {
                $set: {
                  classId: klass._id, sectionId: section._id, session: session._id,
                  schoolId, fields, marksType: 'fields',
                  uploadedBy: teacherUser._id,
                },
              },
              upsert: true,
            },
          });
        });
      });
    });
    if (ops.length) await Marks.bulkWrite(ops);
    console.log(`✅  Marks: ${ops.length} records (SEED_DEMO_MARKS=1)`);
  } else {
    console.log(`ℹ️   No marks seeded — readiness starts at 0%. Set SEED_DEMO_MARKS=1 to fill.`);
  }

  // Summary
  console.log(`\n${'═'.repeat(66)}`);
  console.log('  REPORT CARD DEMO — LOGIN CREDENTIALS');
  console.log('═'.repeat(66));
  console.log(`  School code : ${SCHOOL_CODE}`);
  console.log(`  Password    : ${PASSWORD}   (all demo accounts below)`);
  console.log('─'.repeat(66));
  console.log(`  Admin       : ${admin.email}   (existing — own password)`);
  console.log(`  Teacher     : ${teacherEmail}`);
  studentEmails.forEach((e, i) =>
    console.log(`  Student ${String(i + 1).padStart(2)}  : ${e}`)
  );
  console.log('═'.repeat(66));
  console.log('\n  Demo path:');
  console.log('   1. Student → Marks & Results → Report Card  → "not yet published"');
  console.log('   2. Teacher → Upload Marks → enter each subject → progress fills');
  console.log('   3. Student → refresh → card renders + Download PDF works\n');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  console.error(err);
  process.exit(1);
});
