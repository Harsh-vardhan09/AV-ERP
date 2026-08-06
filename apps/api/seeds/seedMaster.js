// Superset seed covering every module end-to-end, correctly school-scoped.
// Idempotent — overlaps seedSchool/seedAdmin/admissionSeed/teacherSeed, so do not run both
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const connect  = require('../src/core/config/database');

// Receipt number generator (mirrors utils/helpers.js)
const generateReceiptNumber = () => {
  const d = new Date();
  const dp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rp = Math.random().toString(16).slice(2,8).toUpperCase();
  return `RCP-${dp}-${rp}`;
};

// Upsert helper — findOne then create
const upsert = async (Model, query, data) => {
  let doc = await Model.findOne(query);
  let created = false;
  if (!doc) { doc = await Model.create(data); created = true; }
  return { doc, created };
};

// Main
const seedMaster = async () => {
  await connect();

  // Import models AFTER connection
  const School                  = require('../src/modules/tenancy').School;
  const { User }                = require('../src/modules/identity');
  const AcademicSession         = require('../src-old/models/AcademicSession');
  const ClassModel              = require('../src-old/models/ClassModel');
  const SectionModel            = require('../src-old/models/SectionModel');
  const SubjectMaster           = require('../src-old/models/SubjectMaster');
  const TeacherProfile          = require('../src-old/models/TeacherProfile');
  const StudentProfile          = require('../src-old/models/StudentProfile');
  const ClassSubjectMap         = require('../src-old/models/ClassSubjectMap');
  const ClassTeacherAssignment  = require('../src-old/models/ClassTeacherAssignment');
  const TeacherSubjectAssignment= require('../src-old/models/TeacherSubjectAssignment');
  const FeeHead                 = require('../src-old/models/fee/FeeHead');
  const FeeStructure            = require('../src-old/models/fee/FeeStructure');
  const StudentFee              = require('../src-old/models/fee/StudentFee');
  const Installment             = require('../src-old/models/fee/Installment');
  const LedgerEntry             = require('../src-old/models/fee/LedgerEntry');
  const Payment                 = require('../src-old/models/fee/Payment');
  const FeeSession              = require('../src-old/models/fee/Session');
  const BillingPeriod           = require('../src-old/models/fee/BillingPeriod');
  const AccountFee              = require('../src-old/models/fee/AccountFee');
  const Exam                    = require('../src-old/models/Exam');
  const Marks                   = require('../src-old/models/MarksModel');
  const Attendance              = require('../src-old/models/attendance');
  const Leave                   = require('../src-old/models/leave');
  const Notice                  = require('../src-old/models/notice');

  console.log('\n🌱 Starting Master Seed...\n');

  // STEP 1 — School
  let school;
  try {
    school = await School.findByCode('DEMO2025');
    if (school) {
      console.log('✅ Step 1: School — Already exists:', school.name);
    } else {
      school = await School.create({
        name: 'Demo Public School',
        code: 'DEMO2025',
        address: '123 Education Lane, New Delhi',
        phone: '9876543210',
        email: 'info@demopublicschool.com',
        isActive: true,
      });
      console.log('✅ Step 1: School — Created:', school.name);
    }
  } catch (err) {
    console.error('❌ Step 1 failed:', err.message);
    throw err;
  }

  // STEP 2 — Users (all roles)
  let createdUsers = 0, skippedUsers = 0;
  const usersToCreate = [
    { email: 'admin@school.com',     pass: 'admin123',     role: 'admin',     firstName: 'School',  lastName: 'Admin'  },
    { email: 'admission@school.com', pass: 'admission123', role: 'admission', firstName: 'Admission',lastName: 'Dept'   },
    { email: 'accounts@school.com',  pass: 'accounts123',  role: 'accounts',  firstName: 'Accounts', lastName: 'Dept'  },
    { email: 'teacher1@school.com',  pass: 'teacher123',   role: 'teacher',   firstName: 'Ramesh',  lastName: 'Sharma' },
    { email: 'teacher2@school.com',  pass: 'teacher123',   role: 'teacher',   firstName: 'Priya',   lastName: 'Verma'  },
    { email: 'teacher3@school.com',  pass: 'teacher123',   role: 'teacher',   firstName: 'Amit',    lastName: 'Singh'  },
    { email: 'student1@school.com',  pass: 'student123',   role: 'student',   firstName: 'Rahul',   lastName: 'Gupta'  },
    { email: 'student2@school.com',  pass: 'student123',   role: 'student',   firstName: 'Priya',   lastName: 'Sharma' },
    { email: 'student3@school.com',  pass: 'student123',   role: 'student',   firstName: 'Amit',    lastName: 'Kumar'  },
    { email: 'student4@school.com',  pass: 'student123',   role: 'student',   firstName: 'Sneha',   lastName: 'Patel'  },
    { email: 'student5@school.com',  pass: 'student123',   role: 'student',   firstName: 'Vikram',  lastName: 'Singh'  },
    { email: 'student6@school.com',  pass: 'student123',   role: 'student',   firstName: 'Anjali',  lastName: 'Mehta'  },
  ];

  const userMap = {}; // email → user doc
  try {
    for (const u of usersToCreate) {
      // First try exact match (email + schoolId)
      let user = await User.findOne({ email: u.email, schoolId: school._id });
      // Fallback: user exists but schoolId differs (orphaned from prior partial run)
      if (!user) user = await User.findOne({ email: u.email });

      if (user) {
        // Ensure schoolId is correct
        if (!user.schoolId || user.schoolId.toString() !== school._id.toString()) {
          user.schoolId = school._id;
          await user.save();
        }
        skippedUsers++;
      } else {
        const hashed = await bcrypt.hash(u.pass, 10);
        user = await User.create({
          firstName: u.firstName, lastName: u.lastName,
          email: u.email, password: hashed,
          role: u.role, schoolId: school._id,
          isActive: true, isVerified: true,
        });
        // Link admin to school
        if (u.role === 'admin' && !school.adminUserId) {
          school.adminUserId = user._id;
          await school.save();
        }
        createdUsers++;
      }
      userMap[u.email] = user;
    }
    console.log(`✅ Step 2: Users — ${createdUsers} created / ${skippedUsers} skipped`);
  } catch (err) {
    console.error('❌ Step 2 failed:', err.message);
    throw err;
  }

  const adminUser    = userMap['admin@school.com'];
  const teacher1User = userMap['teacher1@school.com'];
  const teacher2User = userMap['teacher2@school.com'];
  const teacher3User = userMap['teacher3@school.com'];
  const student1User = userMap['student1@school.com'];
  const student2User = userMap['student2@school.com'];
  const student3User = userMap['student3@school.com'];
  const student4User = userMap['student4@school.com'];
  const student5User = userMap['student5@school.com'];
  const student6User = userMap['student6@school.com'];

  // STEP 3 — Academic Session
  let session;
  try {
    const { doc, created } = await upsert(
      AcademicSession,
      { name: '2025-2026', schoolId: school._id },
      {
        name: '2025-2026',
        startDate: new Date('2025-04-01'),
        endDate:   new Date('2026-03-31'),
        isActive:  true,
        schoolId:  school._id,
      }
    );
    session = doc;
    console.log(`✅ Step 3: Academic Session — ${created ? 'Created' : 'Already exists'}: ${session.name}`);
  } catch (err) {
    console.error('❌ Step 3 failed:', err.message);
    throw err;
  }

  // STEP 4 — Classes
  let class10, class11, class12;
  let classCreated = 0, classSkipped = 0;
  try {
    const classData = [
      { name: 'Class 10', numericOrder: 10 },
      { name: 'Class 11', numericOrder: 11 },
      { name: 'Class 12', numericOrder: 12 },
    ];
    const createdClasses = [];
    for (const c of classData) {
      const { doc, created } = await upsert(
        ClassModel,
        { name: c.name, session: session._id, schoolId: school._id },
        { name: c.name, numericOrder: c.numericOrder, session: session._id, schoolId: school._id }
      );
      createdClasses.push(doc);
      created ? classCreated++ : classSkipped++;
    }
    [class10, class11, class12] = createdClasses;
    console.log(`✅ Step 4: Classes — ${classCreated} created / ${classSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 4 failed:', err.message);
    throw err;
  }

  // STEP 5 — Sections
  let sec10A, sec10B, sec11A, sec12A;
  let secCreated = 0, secSkipped = 0;
  try {
    const sectionData = [
      { name: 'Section A', classId: class10._id },
      { name: 'Section B', classId: class10._id },
      { name: 'Section A', classId: class11._id },
      { name: 'Section A', classId: class12._id },
    ];
    const createdSections = [];
    for (const s of sectionData) {
      const { doc, created } = await upsert(
        SectionModel,
        { name: s.name, classId: s.classId, session: session._id, schoolId: school._id },
        { name: s.name, classId: s.classId, session: session._id, schoolId: school._id }
      );
      createdSections.push(doc);
      created ? secCreated++ : secSkipped++;
    }
    [sec10A, sec10B, sec11A, sec12A] = createdSections;
    console.log(`✅ Step 5: Sections — ${secCreated} created / ${secSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 5 failed:', err.message);
    throw err;
  }

  // STEP 6 — Subjects
  let subMath, subPhysics, subChem, subEng, subHindi, subCS;
  let subCreated = 0, subSkipped = 0;
  try {
    const subjectsData = [
      { name: 'Mathematics',      code: 'MATH' },
      { name: 'Physics',          code: 'PHY'  },
      { name: 'Chemistry',        code: 'CHEM' },
      { name: 'English',          code: 'ENG'  },
      { name: 'Hindi',            code: 'HIN'  },
      { name: 'Computer Science', code: 'CS'   },
    ];
    const createdSubjects = [];
    for (const s of subjectsData) {
      const { doc, created } = await upsert(
        SubjectMaster,
        { code: s.code, schoolId: school._id },
        { name: s.name, code: s.code, type: 'core', schoolId: school._id }
      );
      createdSubjects.push(doc);
      created ? subCreated++ : subSkipped++;
    }
    [subMath, subPhysics, subChem, subEng, subHindi, subCS] = createdSubjects;
    console.log(`✅ Step 6: Subjects — ${subCreated} created / ${subSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 6 failed:', err.message);
    throw err;
  }

  // STEP 7 — Teacher Profiles
  let tProfile1, tProfile2, tProfile3;
  let tpCreated = 0, tpSkipped = 0;
  try {
    const tProfilesData = [
      { user: teacher1User, empId: 'T-001', teacherId: 'TID-001', qual: 'M.Sc Mathematics', exp: 8,  jDate: new Date('2018-07-01') },
      { user: teacher2User, empId: 'T-002', teacherId: 'TID-002', qual: 'M.Sc Chemistry',   exp: 6,  jDate: new Date('2020-07-01') },
      { user: teacher3User, empId: 'T-003', teacherId: 'TID-003', qual: 'M.C.A',            exp: 5,  jDate: new Date('2021-07-01') },
    ];
    const createdTProfiles = [];
    for (const tp of tProfilesData) {
      if (!tp.user || !tp.user._id) {
        console.warn(`  ⚠️  Skipping teacher profile — user not found for empId ${tp.empId}`);
        createdTProfiles.push(null);
        tpSkipped++;
        continue;
      }
      // TeacherProfile has unique: true on userId alone (not composite)
      const { doc, created } = await upsert(
        TeacherProfile,
        { userId: tp.user._id },
        {
          userId:        tp.user._id,
          firstName:     tp.user.firstName,
          lastName:      tp.user.lastName,
          employeeId:    tp.empId,
          teacherId:     tp.teacherId,
          qualification: tp.qual,
          experience:    tp.exp,
          joiningDate:   tp.jDate,
          status:        'active',
          schoolId:      school._id,
        }
      );
      createdTProfiles.push(doc);
      created ? tpCreated++ : tpSkipped++;
    }
    [tProfile1, tProfile2, tProfile3] = createdTProfiles;
    console.log(`✅ Step 7: Teacher Profiles — ${tpCreated} created / ${tpSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 7 failed:', err.message);
    throw err;
  }

  // STEP 8 — Student Profiles
  let sp1, sp2, sp3, sp4, sp5, sp6;
  let spCreated = 0, spSkipped = 0;
  try {
    const spData = [
      { user: student1User, admNo: 'A-001', scholarNo: 'SCH-001', studentId: 'STU-001', rollNo: '1', classId: class10._id, sectionId: sec10A._id, dob: new Date('2008-05-15') },
      { user: student2User, admNo: 'A-002', scholarNo: 'SCH-002', studentId: 'STU-002', rollNo: '2', classId: class10._id, sectionId: sec10A._id, dob: new Date('2008-08-20') },
      { user: student3User, admNo: 'A-003', scholarNo: 'SCH-003', studentId: 'STU-003', rollNo: '3', classId: class11._id, sectionId: sec11A._id, dob: new Date('2007-03-10') },
      { user: student4User, admNo: 'A-004', scholarNo: 'SCH-004', studentId: 'STU-004', rollNo: '4', classId: class11._id, sectionId: sec11A._id, dob: new Date('2007-11-25') },
      { user: student5User, admNo: 'A-005', scholarNo: 'SCH-005', studentId: 'STU-005', rollNo: '5', classId: class12._id, sectionId: sec12A._id, dob: new Date('2006-07-04') },
      { user: student6User, admNo: 'A-006', scholarNo: 'SCH-006', studentId: 'STU-006', rollNo: '6', classId: class12._id, sectionId: sec12A._id, dob: new Date('2006-12-18') },
    ];
    const createdSProfiles = [];
    for (const sp of spData) {
      const { doc, created } = await upsert(
        StudentProfile,
        { userId: sp.user._id, schoolId: school._id },
        {
          userId:          sp.user._id,
          firstName:       sp.user.firstName,
          lastName:        sp.user.lastName,
          admissionNumber: sp.admNo,
          scholarNo:       sp.scholarNo,
          studentId:       sp.studentId,
          rollNo:          sp.rollNo,
          dateOfBirth:     sp.dob,
          gender:          'male',
          classId:         sp.classId,
          sectionId:       sp.sectionId,
          session:         session._id,
          address:         '123 Main Street, New Delhi',
          city:            'New Delhi',
          state:           'Delhi',
          pincode:         '110001',
          parentDetails: {
            father: { name: `${sp.user.lastName} Father`, phone: '9999988888' }
          },
          status:   'active',
          schoolId: school._id,
        }
      );
      createdSProfiles.push(doc);
      created ? spCreated++ : spSkipped++;
    }
    [sp1, sp2, sp3, sp4, sp5, sp6] = createdSProfiles;
    console.log(`✅ Step 8: Student Profiles — ${spCreated} created / ${spSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 8 failed:', err.message);
    throw err;
  }

  // STEP 9 — Class-Subject Mapping
  let csmCreated = 0, csmSkipped = 0;
  try {
    const allSubjects = [subMath, subPhysics, subChem, subEng, subHindi, subCS];
    const allClasses  = [class10, class11, class12];
    for (const cls of allClasses) {
      for (const sub of allSubjects) {
        const { created } = await upsert(
          ClassSubjectMap,
          { classId: cls._id, subjectId: sub._id, session: session._id, schoolId: school._id },
          { classId: cls._id, subjectId: sub._id, session: session._id, schoolId: school._id }
        );
        created ? csmCreated++ : csmSkipped++;
      }
    }
    console.log(`✅ Step 9: Class-Subject Map — ${csmCreated} created / ${csmSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 9 failed:', err.message);
    throw err;
  }

  // STEP 10 — Teacher-Subject Assignments
  let tsaCreated = 0, tsaSkipped = 0;
  try {
    // teacher1 → Math + Physics for Class 10 (SecA) & Class 11 (SecA)
    // teacher2 → Chem + English for Class 10 (SecA) & Class 12 (SecA)
    // teacher3 → Hindi + CS for Class 11 (SecA) & Class 12 (SecA)
    const tsaData = [
      { teacher: teacher1User, subject: subMath,   cls: class10, sec: sec10A },
      { teacher: teacher1User, subject: subPhysics, cls: class10, sec: sec10A },
      { teacher: teacher1User, subject: subMath,   cls: class11, sec: sec11A },
      { teacher: teacher1User, subject: subPhysics, cls: class11, sec: sec11A },
      { teacher: teacher2User, subject: subChem,   cls: class10, sec: sec10A },
      { teacher: teacher2User, subject: subEng,    cls: class10, sec: sec10A },
      { teacher: teacher2User, subject: subChem,   cls: class12, sec: sec12A },
      { teacher: teacher2User, subject: subEng,    cls: class12, sec: sec12A },
      { teacher: teacher3User, subject: subHindi,  cls: class11, sec: sec11A },
      { teacher: teacher3User, subject: subCS,     cls: class11, sec: sec11A },
      { teacher: teacher3User, subject: subHindi,  cls: class12, sec: sec12A },
      { teacher: teacher3User, subject: subCS,     cls: class12, sec: sec12A },
    ];
    for (const t of tsaData) {
      if (!t.teacher || !t.teacher._id) { tsaSkipped++; continue; }
      const { created } = await upsert(
        TeacherSubjectAssignment,
        { teacherId: t.teacher._id, subjectId: t.subject._id, classId: t.cls._id, sectionId: t.sec._id, session: session._id, schoolId: school._id },
        { teacherId: t.teacher._id, subjectId: t.subject._id, classId: t.cls._id, sectionId: t.sec._id, session: session._id, schoolId: school._id }
      );
      created ? tsaCreated++ : tsaSkipped++;
    }
    console.log(`✅ Step 10: Teacher-Subject Assignments — ${tsaCreated} created / ${tsaSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 10 failed:', err.message);
    throw err;
  }

  // STEP 11 — Class Teacher Assignments
  let ctaCreated = 0, ctaSkipped = 0;
  try {
    const ctaData = [
      { teacher: teacher1User, cls: class10, sec: sec10A },
      { teacher: teacher2User, cls: class11, sec: sec11A },
      { teacher: teacher3User, cls: class12, sec: sec12A },
    ];
    for (const c of ctaData) {
      if (!c.teacher || !c.teacher._id) { ctaSkipped++; continue; }
      const { created } = await upsert(
        ClassTeacherAssignment,
        { classId: c.cls._id, sectionId: c.sec._id, session: session._id, schoolId: school._id },
        { teacherId: c.teacher._id, classId: c.cls._id, sectionId: c.sec._id, session: session._id, schoolId: school._id }
      );
      created ? ctaCreated++ : ctaSkipped++;
    }
    console.log(`✅ Step 11: Class Teacher Assignments — ${ctaCreated} created / ${ctaSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 11 failed:', err.message);
    throw err;
  }

  // STEP 12 — Fee Session (separate from AcademicSession)
  let feeSession;
  try {
    const { doc, created } = await upsert(
      FeeSession,
      { name: 'FEE-2025-2026', schoolId: school._id },
      {
        name:      'FEE-2025-2026',
        startDate: new Date('2025-04-01'),
        endDate:   new Date('2026-03-31'),
        isActive:  true,
        schoolId:  school._id,
      }
    );
    feeSession = doc;
    console.log(`✅ Step 12: Fee Session — ${created ? 'Created' : 'Already exists'}`);
  } catch (err) {
    console.error('❌ Step 12 failed:', err.message);
    throw err;
  }

  // STEP 13 — Fee Heads
  let fhTuition, fhTransport, fhLibrary, fhExam;
  let fhCreated = 0, fhSkipped = 0;
  try {
    const fhData = [
      { name: 'Tuition Fee',   category: 'yearly',   desc: 'Annual tuition fee' },
      { name: 'Transport Fee', category: 'yearly',   desc: 'Annual transport fee' },
      { name: 'Library Fee',   category: 'one-time', desc: 'Library membership fee' },
      { name: 'Exam Fee',      category: 'yearly',   desc: 'Examination fee' },
    ];
    const createdFH = [];
    for (const fh of fhData) {
      // Try exact match first, then fall back to name-only to handle legacy docs without schoolId
      let doc = await FeeHead.findOne({ name: fh.name, schoolId: school._id });
      if (!doc) doc = await FeeHead.findOne({ name: fh.name });
      let created = false;
      if (!doc) {
        doc = await FeeHead.create({ name: fh.name, category: fh.category, description: fh.desc, isActive: true, schoolId: school._id });
        created = true;
      } else if (!doc.schoolId || doc.schoolId.toString() !== school._id.toString()) {
        doc.schoolId = school._id;
        await doc.save();
      }
      createdFH.push(doc);
      created ? fhCreated++ : fhSkipped++;
    }
    [fhTuition, fhTransport, fhLibrary, fhExam] = createdFH;
    console.log(`✅ Step 13: Fee Heads — ${fhCreated} created / ${fhSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 13 failed:', err.message);
    throw err;
  }

  // STEP 14 — Fee Structures (per class)
  // totalAmount is auto-computed by pre-save hook from feeComponents sum
  let fs10, fs11, fs12;
  let fsCreated = 0, fsSkipped = 0;
  try {
    const fsData = [
      {
        cls: class10,
        components: [
          { feeHeadId: fhTuition._id,  amount: 25000 },
          { feeHeadId: fhTransport._id, amount: 8000  },
          { feeHeadId: fhLibrary._id,  amount: 2000  },
          { feeHeadId: fhExam._id,     amount: 1500  },
        ],
      },
      {
        cls: class11,
        components: [
          { feeHeadId: fhTuition._id,  amount: 30000 },
          { feeHeadId: fhTransport._id, amount: 8000  },
          { feeHeadId: fhLibrary._id,  amount: 2000  },
          { feeHeadId: fhExam._id,     amount: 2000  },
        ],
      },
      {
        cls: class12,
        components: [
          { feeHeadId: fhTuition._id,  amount: 35000 },
          { feeHeadId: fhTransport._id, amount: 8000  },
          { feeHeadId: fhLibrary._id,  amount: 2000  },
          { feeHeadId: fhExam._id,     amount: 2500  },
        ],
      },
    ];
    const createdFS = [];
    for (const fs of fsData) {
      const { doc, created } = await upsert(
        FeeStructure,
        { classId: fs.cls._id, sessionId: session._id, schoolId: school._id },
        {
          sessionId:     session._id,
          classId:       fs.cls._id,
          feeComponents: fs.components,
          feeCycle:      'QUARTERLY',
          isActive:      true,
          schoolId:      school._id,
        }
      );
      createdFS.push(doc);
      created ? fsCreated++ : fsSkipped++;
    }
    [fs10, fs11, fs12] = createdFS;
    console.log(`✅ Step 14: Fee Structures — ${fsCreated} created / ${fsSkipped} skipped`);
    console.log(`   Class 10: ₹${fs10.totalAmount} | Class 11: ₹${fs11.totalAmount} | Class 12: ₹${fs12.totalAmount}`);
  } catch (err) {
    console.error('❌ Step 14 failed:', err.message);
    throw err;
  }

  // STEP 15 — Assign Fees to Students via studentFeeService
  let sfCreated = 0, sfSkipped = 0;
  // Maps studentProfileId → studentFee doc
  const studentFeeMap = {};
  try {
    const { assignFeeToStudent } = require('../src-old/services/fee/studentFeeService');
    const assignments = [sp1, sp2, sp3, sp4, sp5, sp6];
    for (const sp of assignments) {
      // Idempotent check: skip if already assigned
      const existing = await StudentFee.findOne({ studentId: sp._id, sessionId: session._id });
      if (existing) {
        studentFeeMap[sp._id.toString()] = existing;
        sfSkipped++;
        continue;
      }
      try {
        const result = await assignFeeToStudent(sp._id.toString());
        studentFeeMap[sp._id.toString()] = result.studentFee;
        sfCreated++;
      } catch (serviceErr) {
        console.warn(`  ⚠️  Fee assignment skipped for ${sp.firstName}: ${serviceErr.message}`);
        sfSkipped++;
      }
    }
    console.log(`✅ Step 15: Fee Assignments — ${sfCreated} created / ${sfSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 15 failed:', err.message);
    throw err;
  }

  // STEP 16 — Sample Payments (direct update on StudentFee + Installment)
  //
  // NOTE: paymentService.processPayment operates on AccountFee model.
  // StudentFee is the model used by studentFeeService (school-ERP specific).
  // We directly handle payments here to stay within the same model space.
  let pmtCreated = 0, pmtSkipped = 0;

  const makePayment = async (studentProfile, payAmount, method, note) => {
    const sfId = studentFeeMap[studentProfile._id.toString()]?._id;
    if (!sfId) { console.warn(`  ⚠️  No StudentFee for ${studentProfile.firstName}, skipping payment`); return; }

    const existingPmt = await Payment.findOne({ studentFeeId: sfId });
    if (existingPmt) { pmtSkipped++; return; }

    const sf = await StudentFee.findById(sfId);
    if (!sf || sf.totalDue <= 0) { pmtSkipped++; return; }

    const toPay = Math.min(payAmount, sf.totalDue);

    // Update installments FIFO
    const installments = await Installment.find({ studentFeeId: sfId, status: { $ne: 'paid' } }).sort({ installmentNo: 1 });
    let remaining = toPay;
    const settledIds = [];
    for (const inst of installments) {
      if (remaining <= 0) break;
      settledIds.push(inst._id);
      if (remaining >= inst.amount) {
        inst.paidAmount = inst.amount;
        inst.remainingAmount = 0;
        inst.status = 'paid';
        remaining -= inst.amount;
      } else {
        inst.paidAmount = remaining;
        inst.remainingAmount = inst.amount - remaining;
        inst.status = 'partial';
        remaining = 0;
      }
      await inst.save();
    }

    // Update StudentFee
    sf.totalPaid = (sf.totalPaid || 0) + toPay;
    sf.totalDue  = Math.max(0, sf.totalAssigned - sf.totalPaid);
    if (sf.totalPaid >= sf.totalAssigned) sf.status = 'paid';
    else if (sf.totalPaid > 0)            sf.status = 'partial';
    else                                  sf.status = 'pending';
    await sf.save();

    // Create Payment record
    const rcpt = generateReceiptNumber();
    const [payment] = await Payment.create([{
      studentFeeId:   sfId,
      installmentIds: settledIds,
      amount:         toPay,
      fineAmount:     0,
      receiptNumber:  rcpt,
      method,
      note,
    }]);

    // Ledger credit entry
    await LedgerEntry.create([{
      studentFeeId: sfId,
      type:         'credit',
      amount:       toPay,
      fineAmount:   0,
      referenceId:  payment._id,
      referenceModel: 'Payment',
      balance:      sf.totalDue,
      description:  `Fee payment via ${method.toUpperCase()}. Receipt: ${rcpt}`,
    }]);

    pmtCreated++;
  };

  try {
    // Refresh StudentFee map from DB (in case it was created above)
    for (const sp of [sp1,sp2,sp3,sp4,sp5,sp6]) {
      if (!studentFeeMap[sp._id.toString()]) {
        const sf = await StudentFee.findOne({ studentId: sp._id, sessionId: session._id });
        if (sf) studentFeeMap[sp._id.toString()] = sf;
      }
    }

    // student1 → Full payment (cash)
    const sf1 = studentFeeMap[sp1._id.toString()];
    if (sf1) await makePayment(sp1, sf1.totalAssigned, 'cash', 'Full payment by Rahul Gupta');

    // student2 → 50% partial (online)
    const sf2 = studentFeeMap[sp2._id.toString()];
    if (sf2) await makePayment(sp2, Math.floor(sf2.totalAssigned * 0.5), 'online', 'Partial payment by Priya Sharma');

    // student3 → Full payment (cheque)
    const sf3 = studentFeeMap[sp3._id.toString()];
    if (sf3) await makePayment(sp3, sf3.totalAssigned, 'cheque', 'Full payment by Amit Kumar');

    // student4 → No payment (pending — skip)
    pmtSkipped++;

    // student5 → 25% partial (cash)
    const sf5 = studentFeeMap[sp5._id.toString()];
    if (sf5) await makePayment(sp5, Math.floor(sf5.totalAssigned * 0.25), 'cash', 'Partial payment by Vikram Singh');

    // student6 → No payment, mark first installment overdue
    const sf6 = studentFeeMap[sp6._id.toString()];
    if (sf6) {
      const existing6 = await Payment.findOne({ studentFeeId: sf6._id });
      if (!existing6) {
        await Installment.updateOne(
          { studentFeeId: sf6._id, installmentNo: 1 },
          { $set: { status: 'overdue', dueDate: new Date('2025-07-01') } }
        );
        pmtSkipped++;
      } else { pmtSkipped++; }
    }

    console.log(`✅ Step 16: Payments — ${pmtCreated} created / ${pmtSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 16 failed:', err.message);
    throw err;
  }

  // STEP 16b — Billing Period (required by AccountFee / dashboard)
  let billingPeriod;
  try {
    const { doc, created } = await upsert(
      BillingPeriod,
      { name: 'Academic Year 2025-2026', schoolId: school._id },
      {
        name:      'Academic Year 2025-2026',
        startDate: new Date('2025-04-01'),
        endDate:   new Date('2026-03-31'),
        isActive:  true,
        isLocked:  false,
        createdBy: adminUser._id,
        schoolId:  school._id,
      }
    );
    billingPeriod = doc;
    console.log(`✅ Step 16b: Billing Period — ${created ? 'Created' : 'Already exists'}: ${billingPeriod.name}`);
  } catch (err) {
    console.error('❌ Step 16b failed:', err.message);
    throw err;
  }

  // STEP 16c — AccountFee records  ← THIS is what the dashboard reads
  //
  // The Fee Dashboard (reportController.getFeeDashboard) queries AccountFee.
  // We create one AccountFee per student, using their userId as accountHolderId,
  // and the FeeStructure already seeded for their class.
  // Payment states mirror Step 16 exactly:
  //   student1 (Class10) → PAID   student4 (Class11) → PENDING
  //   student2 (Class10) → PARTIAL 50%  student5 (Class12) → PARTIAL 25%
  //   student3 (Class11) → PAID   student6 (Class12) → OVERDUE
  let afCreated = 0, afSkipped = 0;
  try {
    // Helper: create installments for an AccountFee (QUARTERLY = 4 installments)
    const buildInstallments = (accountFeeId, totalAmount) => {
      const quarterly = Math.floor(totalAmount / 4);
      const remainder = totalAmount - quarterly * 3;
      const now = new Date('2025-04-01');
      return [
        { studentFeeId: accountFeeId, installmentNo: 1, dueDate: new Date('2025-07-10'), amount: quarterly, paidAmount: 0, remainingAmount: quarterly, fineAmount: 0, status: 'pending' },
        { studentFeeId: accountFeeId, installmentNo: 2, dueDate: new Date('2025-10-10'), amount: quarterly, paidAmount: 0, remainingAmount: quarterly, fineAmount: 0, status: 'pending' },
        { studentFeeId: accountFeeId, installmentNo: 3, dueDate: new Date('2026-01-10'), amount: quarterly, paidAmount: 0, remainingAmount: quarterly, fineAmount: 0, status: 'pending' },
        { studentFeeId: accountFeeId, installmentNo: 4, dueDate: new Date('2026-04-10'), amount: remainder, paidAmount: 0, remainingAmount: remainder, fineAmount: 0, status: 'pending' },
      ];
    };

    // Map: studentUser → { feeStructure, paymentState }
    const afData = [
      { user: student1User, profile: sp1, feeStr: fs10, state: 'paid',    paidPct: 1.0,   label: 'Full payment — Rahul Gupta' },
      { user: student2User, profile: sp2, feeStr: fs10, state: 'partial', paidPct: 0.5,   label: 'Partial 50% — Priya Sharma' },
      { user: student3User, profile: sp3, feeStr: fs11, state: 'paid',    paidPct: 1.0,   label: 'Full payment — Amit Kumar' },
      { user: student4User, profile: sp4, feeStr: fs11, state: 'pending', paidPct: 0,     label: 'No payment — Sneha Patel' },
      { user: student5User, profile: sp5, feeStr: fs12, state: 'partial', paidPct: 0.25,  label: 'Partial 25% — Vikram Singh' },
      { user: student6User, profile: sp6, feeStr: fs12, state: 'overdue', paidPct: 0,     label: 'Overdue — Anjali Mehta' },
    ];

    for (const item of afData) {
      // Idempotency: skip if already exists
      const existing = await AccountFee.findOne({
        accountHolderId: item.user._id,
        billingPeriodId: billingPeriod._id,
      });
      if (existing) { afSkipped++; continue; }

      const total     = item.feeStr.totalAmount;
      const paid      = Math.floor(total * item.paidPct);
      const due       = total - paid;
      const status    = item.state === 'overdue' ? 'pending' : item.state;

      // Create AccountFee
      const [af] = await AccountFee.create([{
        accountHolderId: item.user._id,
        billingPeriodId: billingPeriod._id,
        feeStructureId:  item.feeStr._id,
        totalAssigned:   total,
        totalPaid:       paid,
        totalDue:        due,
        totalFine:       0,
        status,
      }]);

      // Create installment records
      const instDocs = buildInstallments(af._id, total);

      // Adjust installments based on payment state
      if (item.paidPct >= 1.0) {
        // All paid
        instDocs.forEach(d => { d.paidAmount = d.amount; d.remainingAmount = 0; d.status = 'paid'; });
      } else if (item.paidPct > 0) {
        // Pay first N installments partially
        let remaining = paid;
        for (const d of instDocs) {
          if (remaining <= 0) break;
          if (remaining >= d.amount) {
            d.paidAmount = d.amount; d.remainingAmount = 0; d.status = 'paid';
            remaining -= d.amount;
          } else {
            d.paidAmount = remaining; d.remainingAmount = d.amount - remaining; d.status = 'partial';
            remaining = 0;
          }
        }
      } else if (item.state === 'overdue') {
        // First installment overdue
        instDocs[0].status = 'overdue';
        instDocs[0].dueDate = new Date('2025-07-01');
      }

      await Installment.insertMany(instDocs);

      // Initial debit ledger entry
      await LedgerEntry.create([{
        studentFeeId: af._id,
        type:         'debit',
        amount:       total,
        fineAmount:   0,
        description:  `Fee charged — ${item.label}`,
        balance:      due,
      }]);

      // Credit ledger entry if payment was made
      if (paid > 0) {
        await LedgerEntry.create([{
          studentFeeId: af._id,
          type:         'credit',
          amount:       paid,
          fineAmount:   0,
          description:  `Payment received — ${item.label}`,
          balance:      due,
        }]);
        // Payment record
        await Payment.create([{
          studentFeeId:  af._id,
          amount:        paid,
          fineAmount:    0,
          receiptNumber: generateReceiptNumber(),
          method:        item.paidPct >= 1.0 ? 'cash' : 'online',
          note:          item.label,
        }]);
      }

      afCreated++;
    }
    console.log(`✅ Step 16c: AccountFee (Dashboard) — ${afCreated} created / ${afSkipped} skipped`);

    // Show totals that should appear on dashboard
    const totals = await AccountFee.aggregate([{
      $group: { _id: null, assigned: { $sum: '$totalAssigned' }, paid: { $sum: '$totalPaid' }, due: { $sum: '$totalDue' }, count: { $sum: 1 } }
    }]);
    if (totals[0]) {
      const t = totals[0];
      const rate = t.assigned > 0 ? ((t.paid / t.assigned) * 100).toFixed(1) : 0;
      console.log(`   Dashboard should show: Assigned=₹${t.assigned} | Collected=₹${t.paid} | Outstanding=₹${t.due} | Accounts=${t.count} | Rate=${rate}%`);
    }
  } catch (err) {
    console.error('❌ Step 16c failed:', err.message);
    throw err;
  }

  // STEP 17 — Exams
  let exam1, exam2;
  let exCreated = 0, exSkipped = 0;
  try {
    const examData = [
      {
        name: 'Mid Term 2025', type: 'half_yearly',
        startDate: new Date('2025-10-01'), endDate: new Date('2025-10-15'), status: 'completed',
      },
      {
        name: 'Annual Exam 2026', type: 'annual',
        startDate: new Date('2026-03-01'), endDate: new Date('2026-03-20'), status: 'upcoming',
      },
    ];
    const createdExams = [];
    for (const ex of examData) {
      const { doc, created } = await upsert(
        Exam,
        { name: ex.name, session: session._id, schoolId: school._id },
        {
          name:         ex.name,
          type:         ex.type,
          description:  ex.name,
          session:      session._id,
          classIds:     [class10._id, class11._id, class12._id],
          startDate:    ex.startDate,
          endDate:      ex.endDate,
          status:       ex.status,
          createdBy:    adminUser._id,
          createdByRole:'admin',
          schoolId:     school._id,
        }
      );
      createdExams.push(doc);
      created ? exCreated++ : exSkipped++;
    }
    [exam1, exam2] = createdExams;
    console.log(`✅ Step 17: Exams — ${exCreated} created / ${exSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 17 failed:', err.message);
    throw err;
  }

  // STEP 17b — Sample Marks for Mid Term (exam1)
  try {
    const marksData = [
      { student: student1User, sp: sp1, cls: class10, sec: sec10A, subject: subMath,    marks: 85 },
      { student: student1User, sp: sp1, cls: class10, sec: sec10A, subject: subPhysics, marks: 78 },
      { student: student2User, sp: sp2, cls: class10, sec: sec10A, subject: subMath,    marks: 92 },
      { student: student2User, sp: sp2, cls: class10, sec: sec10A, subject: subPhysics, marks: 88 },
      { student: student3User, sp: sp3, cls: class11, sec: sec11A, subject: subMath,    marks: 75 },
      { student: student3User, sp: sp3, cls: class11, sec: sec11A, subject: subChem,    marks: 82 },
      { student: student4User, sp: sp4, cls: class11, sec: sec11A, subject: subMath,    marks: 68 },
      { student: student4User, sp: sp4, cls: class11, sec: sec11A, subject: subChem,    marks: 71 },
      { student: student5User, sp: sp5, cls: class12, sec: sec12A, subject: subMath,    marks: 90 },
      { student: student5User, sp: sp5, cls: class12, sec: sec12A, subject: subCS,      marks: 95 },
      { student: student6User, sp: sp6, cls: class12, sec: sec12A, subject: subMath,    marks: 72 },
      { student: student6User, sp: sp6, cls: class12, sec: sec12A, subject: subCS,      marks: 80 },
    ];
    let mkCreated = 0, mkSkipped = 0;
    for (const m of marksData) {
      const { created } = await upsert(
        Marks,
        { examId: exam1._id, studentId: m.student._id, subjectId: m.subject._id, schoolId: school._id },
        {
          examId:        exam1._id,
          studentId:     m.student._id,
          subjectId:     m.subject._id,
          classId:       m.cls._id,
          sectionId:     m.sec._id,
          session:       session._id,
          marksObtained: m.marks,
          uploadedBy:    teacher1User._id,
          schoolId:      school._id,
        }
      );
      created ? mkCreated++ : mkSkipped++;
    }
    console.log(`   Marks seeded — ${mkCreated} created / ${mkSkipped} skipped`);
  } catch (err) {
    console.warn('  ⚠️  Marks seeding partially failed:', err.message);
  }

  // STEP 18 — Attendance (last 5 school days)
  let attCreated = 0, attSkipped = 0;
  try {
    // Build last 5 weekdays from today
    const getLastNWeekdays = (n) => {
      const days = [];
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      while (days.length < n) {
        d.setDate(d.getDate() - 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
      }
      return days;
    };
    const attendanceDays = getLastNWeekdays(5);

    // Class 10 — sec10A — students sp1, sp2
    const statusPatterns10 = [
      ['present','present','present','absent','present'],   // sp1
      ['present','late','present','present','present'],     // sp2
    ];
    // Class 11 — sec11A — students sp3, sp4
    const statusPatterns11 = [
      ['present','present','absent','present','present'],   // sp3
      ['late','present','present','present','absent'],      // sp4
    ];
    // Class 12 — sec12A — students sp5, sp6
    const statusPatterns12 = [
      ['present','present','present','present','present'],  // sp5
      ['absent','present','present','late','present'],      // sp6
    ];

    const attGroups = [
      { cls: class10, sec: sec10A, teacher: teacher1User, sps: [sp1, sp2], patterns: statusPatterns10 },
      { cls: class11, sec: sec11A, teacher: teacher2User, sps: [sp3, sp4], patterns: statusPatterns11 },
      { cls: class12, sec: sec12A, teacher: teacher3User, sps: [sp5, sp6], patterns: statusPatterns12 },
    ];

    for (const grp of attGroups) {
      for (let i = 0; i < attendanceDays.length; i++) {
        const day = attendanceDays[i];
        const existing = await Attendance.findOne({
          classId: grp.cls._id, sectionId: grp.sec._id,
          date: day, attendanceType: 'hall',
        });
        if (existing) { attSkipped++; continue; }

        await Attendance.create({
          classId:        grp.cls._id,
          sectionId:      grp.sec._id,
          subjectId:      null,
          attendanceType: 'hall',
          session:        session._id,
          date:           day,
          takenBy:        grp.teacher._id,
          schoolId:       school._id,
          records: grp.sps.map((sp, sIdx) => ({
            studentId: sp._id,
            status:    grp.patterns[sIdx][i],
          })),
        });
        attCreated++;
      }
    }
    console.log(`✅ Step 18: Attendance — ${attCreated} created / ${attSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 18 failed:', err.message);
    throw err;
  }

  // STEP 19 — Leave Applications
  let lvCreated = 0, lvSkipped = 0;
  try {
    const leaveData = [
      {
        appliedBy: student1User._id, role: 'student',
        leaveType: 'sick', startDate: new Date('2025-10-05'), endDate: new Date('2025-10-06'),
        reason: 'High fever', status: 'approved', approvedBy: adminUser._id,
        approvalRemarks: 'Approved', classId: class10._id, sectionId: sec10A._id,
      },
      {
        appliedBy: student3User._id, role: 'student',
        leaveType: 'personal', startDate: new Date('2025-11-10'), endDate: new Date('2025-11-10'),
        reason: 'Family function', status: 'pending',
        classId: class11._id, sectionId: sec11A._id,
      },
      {
        appliedBy: teacher1User._id, role: 'teacher',
        leaveType: 'casual', startDate: new Date('2025-09-15'), endDate: new Date('2025-09-15'),
        reason: 'Personal work', status: 'approved', approvedBy: adminUser._id,
        approvalRemarks: 'Approved',
      },
      {
        appliedBy: teacher2User._id, role: 'teacher',
        leaveType: 'sick', startDate: new Date('2025-12-01'), endDate: new Date('2025-12-02'),
        reason: 'Viral fever', status: 'pending',
      },
    ];

    for (const lv of leaveData) {
      const existing = await Leave.findOne({
        appliedBy: lv.appliedBy,
        startDate: lv.startDate,
        endDate:   lv.endDate,
        schoolId:  school._id,
      });
      if (existing) { lvSkipped++; continue; }
      await Leave.create({ ...lv, session: session._id, schoolId: school._id });
      lvCreated++;
    }
    console.log(`✅ Step 19: Leave Applications — ${lvCreated} created / ${lvSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 19 failed:', err.message);
    throw err;
  }

  // STEP 20 — Notices
  let ntCreated = 0, ntSkipped = 0;
  try {
    const noticeData = [
      {
        title:    'School Annual Day Notice',
        Body:     'The Annual Day celebrations will be held on 15th February 2026. All students, teachers, and parents are cordially invited.',
        category: 'general',
        member:   ['admin', 'teacher', 'student', 'admission', 'accounts'],
        createdByID: adminUser._id,
      },
      {
        title:    'Fee Payment Reminder',
        Body:     'This is a reminder to all students to pay their pending fee by 31st January 2026 to avoid a late fee penalty.',
        category: 'fee',
        member:   ['student'],
        createdByID: adminUser._id,
      },
    ];
    for (const nt of noticeData) {
      const existing = await Notice.findOne({ title: nt.title });
      if (existing) { ntSkipped++; continue; }
      await Notice.create(nt);
      ntCreated++;
    }
    console.log(`✅ Step 20: Notices — ${ntCreated} created / ${ntSkipped} skipped`);
  } catch (err) {
    console.error('❌ Step 20 failed:', err.message);
    throw err;
  }

  // SEED COMPLETE
  console.log('\n════════════════════════════════════════════════════');
  console.log('  SEED COMPLETE — TEST CREDENTIALS');
  console.log('════════════════════════════════════════════════════');
  console.log('  SCHOOL CODE : DEMO2025');
  console.log('════════════════════════════════════════════════════');
  console.log('  ADMIN      : admin@school.com      / admin123');
  console.log('  ADMISSION  : admission@school.com  / admission123');
  console.log('  ACCOUNTS   : accounts@school.com   / accounts123');
  console.log('────────────────────────────────────────────────────');
  console.log('  TEACHER 1  : teacher1@school.com   / teacher123  (Ramesh Sharma — Math/Physics)');
  console.log('  TEACHER 2  : teacher2@school.com   / teacher123  (Priya Verma — Chem/English)');
  console.log('  TEACHER 3  : teacher3@school.com   / teacher123  (Amit Singh — Hindi/CS)');
  console.log('────────────────────────────────────────────────────');
  console.log('  STUDENT 1  : student1@school.com   / student123  (Class 10 | PAID)');
  console.log('  STUDENT 2  : student2@school.com   / student123  (Class 10 | PARTIAL 50%)');
  console.log('  STUDENT 3  : student3@school.com   / student123  (Class 11 | PAID)');
  console.log('  STUDENT 4  : student4@school.com   / student123  (Class 11 | PENDING)');
  console.log('  STUDENT 5  : student5@school.com   / student123  (Class 12 | PARTIAL 25%)');
  console.log('  STUDENT 6  : student6@school.com   / student123  (Class 12 | OVERDUE)');
  console.log('════════════════════════════════════════════════════\n');

  process.exit(0);
};

seedMaster().catch(err => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err);
  process.exit(1);
});
