// Full relational report card data so the admin, teacher and student dashboards all work.
// Idempotent — upserts, safe to re-run

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const connect  = require('../src/core/config/database');

// Helpers

const upsert = async (Model, query, data) => {
  let doc = await Model.findOne(query);
  let created = false;
  if (!doc) { doc = await Model.create(data); created = true; }
  return { doc, created };
};

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Must exactly match the controller's calculateGrade() function
const grade = (pct) => {
  if (pct >= 91) return 'A+';
  if (pct >= 81) return 'A';
  if (pct >= 71) return 'B+';
  if (pct >= 61) return 'B';
  if (pct >= 51) return 'C';
  if (pct >= 41) return 'D';
  return 'E';
};

// Must match the controller's calculateSubjectTotal() —
// total = sum of all 10 slots (fa1_1 through sa2), capped at 100
const calcTotal = (m) => {
  const sum = (m.fa1_1||0) + (m.fa1_2||0) + (m.fa2_1||0) + (m.fa2_2||0) + (m.sa1||0)
            + (m.fa3_1||0) + (m.fa3_2||0) + (m.fa4_1||0) + (m.fa4_2||0) + (m.sa2||0);
  return Math.min(100, +sum.toFixed(2));
};

// Main
const seed = async () => {
  await connect();

  const School                   = require('../src-old/models/School');
  const { User }                 = require('../src-old/models/user');
  const AcademicSession          = require('../src-old/models/AcademicSession');
  const ClassModel               = require('../src-old/models/ClassModel');
  const SectionModel             = require('../src-old/models/SectionModel');
  const SubjectMaster            = require('../src-old/models/SubjectMaster');
  const ClassSubjectMap          = require('../src-old/models/ClassSubjectMap');
  const TeacherProfile           = require('../src-old/models/TeacherProfile');
  const TeacherSubjectAssignment = require('../src-old/models/TeacherSubjectAssignment');
  const ClassTeacherAssignment   = require('../src-old/models/ClassTeacherAssignment');
  const StudentProfile           = require('../src-old/models/StudentProfile');
  const Exam                     = require('../src-old/models/Exam');
  const ExamSubjectConfig        = require('../src-old/models/ExamSubjectConfig');
  const Marks                    = require('../src-old/models/MarksModel');
  const ReportCard               = require('../src-old/models/ReportCard');
  const ReportCardMark           = require('../src-old/models/ReportCardMark');
  const CoScholasticMark         = require('../src-old/models/CoScholasticMark');

  console.log('\n🌱  Report Card Full Seed (v2) — starting...\n');

  // STEP 0 — School
  const school = await School.findByCode('DEMO2025');
  if (!school) {
    console.error('❌  School "DEMO2025" not found. Run seedMaster.js first.');
    process.exit(1);
  }
  console.log(`✅  Step 0 : School → ${school.name} (${school.code})`);

  // STEP 1 — Academic Session 2025-2026
  const { doc: session, created: sc } = await upsert(
    AcademicSession,
    { name: '2025-2026', schoolId: school._id },
    { name: '2025-2026', startDate: new Date('2025-04-01'), endDate: new Date('2026-03-31'), isActive: true, schoolId: school._id }
  );
  console.log(`✅  Step 1 : Academic Session → ${session.name} (${sc ? 'created' : 'exists'})`);

  // STEP 2 — Users (Admin, Teacher, 12 Students)
  console.log('\n── Step 2 : Creating / resolving Users ──');

  const ensureUser = async (email, firstName, lastName, role, pass = 'admin123') => {
    let user = await User.findOne({ email, schoolId: school._id });
    if (!user) user = await User.findOne({ email }); // fallback: legacy without schoolId
    if (user) {
      if (!user.schoolId || user.schoolId.toString() !== school._id.toString()) {
        user.schoolId = school._id; await user.save();
      }
      return { user, created: false };
    }
    const hashed = await bcrypt.hash(pass, 10);
    user = await User.create({ firstName, lastName, email, password: hashed, role, schoolId: school._id, isActive: true, isVerified: true });
    return { user, created: true };
  };

  // Admin
  const { user: adminUser }   = await ensureUser('admin@school.com',      'School',   'Admin',   'admin',   'admin123');

  // Teacher (class teacher for Class 10-A)
  const { user: teacherUser } = await ensureUser('rc_teacher@school.com', 'Kavita',   'Joshi',   'teacher', 'teacher123');

  // 12 Students — 4 toppers, 5 average, 3 weak
  const STUDENTS = [
    { roll:'01', email:'rc_s01@school.com', fn:'Arjun',  ln:'Sharma',     g:'male',   dob:'2009-06-10', admNo:'RC-A001', schNo:'RC-SCH001', stuId:'RC-STU001', tier:'top' },
    { roll:'02', email:'rc_s02@school.com', fn:'Ananya', ln:'Verma',      g:'female', dob:'2009-03-22', admNo:'RC-A002', schNo:'RC-SCH002', stuId:'RC-STU002', tier:'top' },
    { roll:'03', email:'rc_s03@school.com', fn:'Rohan',  ln:'Gupta',      g:'male',   dob:'2009-11-05', admNo:'RC-A003', schNo:'RC-SCH003', stuId:'RC-STU003', tier:'top' },
    { roll:'04', email:'rc_s04@school.com', fn:'Priya',  ln:'Singh',      g:'female', dob:'2009-07-18', admNo:'RC-A004', schNo:'RC-SCH004', stuId:'RC-STU004', tier:'top' },
    { roll:'05', email:'rc_s05@school.com', fn:'Aarav',  ln:'Mishra',     g:'male',   dob:'2009-02-14', admNo:'RC-A005', schNo:'RC-SCH005', stuId:'RC-STU005', tier:'avg' },
    { roll:'06', email:'rc_s06@school.com', fn:'Divya',  ln:'Patel',      g:'female', dob:'2009-08-30', admNo:'RC-A006', schNo:'RC-SCH006', stuId:'RC-STU006', tier:'avg' },
    { roll:'07', email:'rc_s07@school.com', fn:'Vikram', ln:'Yadav',      g:'male',   dob:'2009-12-01', admNo:'RC-A007', schNo:'RC-SCH007', stuId:'RC-STU007', tier:'avg' },
    { roll:'08', email:'rc_s08@school.com', fn:'Sneha',  ln:'Tiwari',     g:'female', dob:'2009-04-09', admNo:'RC-A008', schNo:'RC-SCH008', stuId:'RC-STU008', tier:'avg' },
    { roll:'09', email:'rc_s09@school.com', fn:'Kunal',  ln:'Joshi',      g:'male',   dob:'2009-09-25', admNo:'RC-A009', schNo:'RC-SCH009', stuId:'RC-STU009', tier:'avg' },
    { roll:'10', email:'rc_s10@school.com', fn:'Ritu',   ln:'Chauhan',    g:'female', dob:'2009-05-17', admNo:'RC-A010', schNo:'RC-SCH010', stuId:'RC-STU010', tier:'weak'},
    { roll:'11', email:'rc_s11@school.com', fn:'Mohit',  ln:'Rajput',     g:'male',   dob:'2009-01-28', admNo:'RC-A011', schNo:'RC-SCH011', stuId:'RC-STU011', tier:'weak'},
    { roll:'12', email:'rc_s12@school.com', fn:'Pooja',  ln:'Srivastava', g:'female', dob:'2009-10-03', admNo:'RC-A012', schNo:'RC-SCH012', stuId:'RC-STU012', tier:'weak'},
  ];

  const studentUsers = [];
  let uCreated = 0, uSkip = 0;
  for (const s of STUDENTS) {
    const { user, created } = await ensureUser(s.email, s.fn, s.ln, 'student', 'student123');
    studentUsers.push({ ...s, user });
    created ? uCreated++ : uSkip++;
  }
  console.log(`    Users — admin ✓  teacher ✓  students ${uCreated} created / ${uSkip} skipped`);

  // STEP 3 — Class 10 + Section A
  const { doc: class10 }   = await upsert(ClassModel,   { name: 'Class 10', session: session._id, schoolId: school._id }, { name: 'Class 10', numericOrder: 10, session: session._id, schoolId: school._id });
  const { doc: section10A }= await upsert(SectionModel, { name: 'Section A', classId: class10._id, session: session._id, schoolId: school._id }, { name: 'Section A', classId: class10._id, session: session._id, schoolId: school._id });
  console.log(`✅  Step 3 : Class 10 / Section A resolved`);

  // STEP 4 — 7 Subjects for the Report Card
  const SUBJECT_DEFS = [
    { name: 'English',         code: 'ENG'  },
    { name: 'Hindi',           code: 'HIN'  },
    { name: 'Mathematics',     code: 'MATH' },
    { name: 'Science',         code: 'SCI'  },
    { name: 'Social Science',  code: 'SST'  },
    { name: 'Computer / G.K.', code: 'COMP' },
    { name: 'Sanskrit',        code: 'SAN'  },
  ];

  const subjects = [];
  let sCreated = 0, sSkip = 0;
  for (const s of SUBJECT_DEFS) {
    const { doc, created } = await upsert(SubjectMaster, { code: s.code, schoolId: school._id }, { name: s.name, code: s.code, type: 'core', schoolId: school._id });
    subjects.push(doc);
    created ? sCreated++ : sSkip++;
  }
  console.log(`✅  Step 4 : Subjects — ${sCreated} created / ${sSkip} skipped`);

  // STEP 5 — Class-Subject Mapping
  let csmCreated = 0, csmSkip = 0;
  for (const sub of subjects) {
    const { created } = await upsert(ClassSubjectMap,
      { classId: class10._id, subjectId: sub._id, session: session._id, schoolId: school._id },
      { classId: class10._id, subjectId: sub._id, session: session._id, schoolId: school._id }
    );
    created ? csmCreated++ : csmSkip++;
  }
  console.log(`✅  Step 5 : Class-Subject Map — ${csmCreated} created / ${csmSkip} skipped`);

  // STEP 6 — Teacher Profile + Subject + Class Teacher Assignments

  // 6a. TeacherProfile
  const { doc: teacherProfile } = await upsert(
    TeacherProfile,
    { userId: teacherUser._id },
    {
      userId:      teacherUser._id,
      firstName:   teacherUser.firstName,
      lastName:    teacherUser.lastName,
      employeeId:  'RC-T001',
      teacherId:   'RC-TID001',
      qualification: 'M.Ed',
      experience:  7,
      gender:      'female',
      joiningDate: new Date('2018-07-01'),
      status:      'active',
      schoolId:    school._id,
    }
  );

  // 6b. Teacher–Subject assignments (all 7 subjects for Class 10-A)
  let tsaCreated = 0, tsaSkip = 0;
  for (const sub of subjects) {
    const { created } = await upsert(
      TeacherSubjectAssignment,
      { teacherId: teacherUser._id, subjectId: sub._id, classId: class10._id, sectionId: section10A._id, session: session._id, schoolId: school._id },
      { teacherId: teacherUser._id, subjectId: sub._id, classId: class10._id, sectionId: section10A._id, session: session._id, schoolId: school._id }
    );
    created ? tsaCreated++ : tsaSkip++;
  }

  // 6c. Class Teacher Assignment — teacher is THE class teacher for Class 10-A
  const { created: ctaCreated } = await upsert(
    ClassTeacherAssignment,
    { classId: class10._id, sectionId: section10A._id, session: session._id, schoolId: school._id },
    { teacherId: teacherUser._id, classId: class10._id, sectionId: section10A._id, session: session._id, schoolId: school._id }
  );

  console.log(`✅  Step 6 : Teacher profile ✓  | Subject assignments ${tsaCreated}cr  | Class teacher ${ctaCreated ? 'created' : 'exists'}`);

  // STEP 7 — Student Profiles
  let spCreated = 0, spSkip = 0;
  const profiles = []; // { user, profile, tier }

  for (const s of studentUsers) {
    const { doc: profile, created } = await upsert(
      StudentProfile,
      { userId: s.user._id, schoolId: school._id },
      {
        userId:          s.user._id,
        firstName:       s.fn,
        lastName:        s.ln,
        admissionNumber: s.admNo,
        scholarNo:       s.schNo,
        studentId:       s.stuId,
        rollNo:          s.roll,
        dateOfBirth:     new Date(s.dob),
        gender:          s.g,
        classId:         class10._id,
        sectionId:       section10A._id,
        session:         session._id,
        address:         '123 Demo Colony, New Delhi',
        city:            'New Delhi',
        state:           'Delhi',
        pincode:         '110001',
        parentDetails: {
          father: { name: `${s.fn} Father`, phone: '9999900000' },
          mother: { name: `${s.fn} Mother` },
        },
        status:   'active',
        schoolId: school._id,
      }
    );
    profiles.push({ user: s.user, profile, tier: s.tier });
    created ? spCreated++ : spSkip++;
  }
  console.log(`✅  Step 7 : Student Profiles — ${spCreated} created / ${spSkip} skipped`);

  // STEP 8 — Exams (10 exams — slot names match controller auto-mapping)
  //
  //  startDate order is CRITICAL — the controller sorts exams by startDate
  //  and assigns slots in this order:
  //    1. If half_yearly type → sa1
  //    2. If annual type      → sa2
  //    3. Everything else     → fa1_1 → fa1_2 → fa2_1 → fa2_2 →
  //                             fa3_1 → fa3_2 → fa4_1 → fa4_2 (in order)
  const EXAM_DEFS = [
    // Term I FA exams (come first chronologically → slots fa1_1…fa2_2)
    { name:'FA1 Exam 1',          type:'unit_test',  start:'2025-04-15', end:'2025-04-17', slot:'fa1_1' },
    { name:'FA1 Exam 2',          type:'unit_test',  start:'2025-05-10', end:'2025-05-12', slot:'fa1_2' },
    { name:'FA2 Exam 1',          type:'unit_test',  start:'2025-06-05', end:'2025-06-07', slot:'fa2_1' },
    { name:'FA2 Exam 2',          type:'unit_test',  start:'2025-07-02', end:'2025-07-04', slot:'fa2_2' },
    // SA-I → slot sa1 (half_yearly type takes priority)
    { name:'SA-I (Half Yearly)',   type:'half_yearly',start:'2025-09-10', end:'2025-09-20', slot:'sa1'  },
    // Term II FA exams → slots fa3_1…fa4_2
    { name:'FA3 Exam 1',          type:'unit_test',  start:'2025-10-07', end:'2025-10-09', slot:'fa3_1' },
    { name:'FA3 Exam 2',          type:'unit_test',  start:'2025-11-04', end:'2025-11-06', slot:'fa3_2' },
    { name:'FA4 Exam 1',          type:'unit_test',  start:'2025-12-02', end:'2025-12-04', slot:'fa4_1' },
    { name:'FA4 Exam 2',          type:'unit_test',  start:'2026-01-06', end:'2026-01-08', slot:'fa4_2' },
    // SA-II → slot sa2 (annual type takes priority)
    { name:'SA-II (Annual)',       type:'annual',     start:'2026-03-05', end:'2026-03-20', slot:'sa2'  },
  ];

  const examMap = {}; // slot → Exam doc
  let eCreated = 0, eSkip = 0;
  for (const ed of EXAM_DEFS) {
    const { doc, created } = await upsert(
      Exam,
      { name: ed.name, session: session._id, schoolId: school._id },
      {
        name:          ed.name,
        type:          ed.type,
        description:   `${ed.name} — Class 10 (2025-26)`,
        session:       session._id,
        classIds:      [class10._id],
        startDate:     new Date(ed.start),
        endDate:       new Date(ed.end),
        status:        'completed',
        createdBy:     adminUser._id,
        createdByRole: 'admin',
        schoolId:      school._id,
      }
    );
    examMap[ed.slot] = doc;
    created ? eCreated++ : eSkip++;
  }
  console.log(`✅  Step 8 : Exams — ${eCreated} created / ${eSkip} skipped`);

  // ExamSubjectConfig — max marks per exam+subject. The aggregator reads max
  // marks ONLY from here; without it every subject renders obtained/0 and the
  // percentage divides by zero. The real admin exam-creation flow writes these,
  // so the seed must too.
  let cCreated = 0, cSkip = 0;
  for (const ed of EXAM_DEFS) {
    const maxMarks = ed.slot.startsWith('sa') ? 60 : 10;
    for (const subj of subjects) {
      const { created } = await upsert(
        ExamSubjectConfig,
        { examId: examMap[ed.slot]._id, classId: class10._id, subjectId: subj._id, schoolId: school._id },
        {
          examId:       examMap[ed.slot]._id,
          classId:      class10._id,
          subjectId:    subj._id,
          maxMarks,
          passingMarks: Math.round(maxMarks * 0.33),
          examDate:     new Date(ed.start),
          schoolId:     school._id,
        }
      );
      created ? cCreated++ : cSkip++;
    }
  }
  console.log(`✅  Step 8b: ExamSubjectConfig — ${cCreated} created / ${cSkip} skipped`);

  // STEP 9 — Raw Marks (Marks collection)
  //   Marks per slot:
  //     FA slots (fa*): range 5–10 out of 10   (distinct per tier)
  //     SA slots (sa*): range   out of 60      (distinct per tier)
  //
  //   Controller total formula = sum of all 10 slots (capped at 100).
  //   So we pick marks such that totals land in expected ranges:
  //     top  → fa: 8-10,  sa: 48-57  → total ~90-92
  //     avg  → fa: 6-8,   sa: 35-46  → total ~65-75
  //     weak → fa: 5-7,   sa: 22-34  → total ~45-55
  const TIER = {
    top:  { fa: [8, 10], sa: [48, 57] },
    avg:  { fa: [6,  8], sa: [35, 46] },
    weak: { fa: [5,  7], sa: [22, 34] },
  };

  let mCreated = 0, mSkip = 0;
  for (const { user, tier } of profiles) {
    const r = TIER[tier];
    for (const sub of subjects) {
      for (const ed of EXAM_DEFS) {
        const isSA = ed.slot === 'sa1' || ed.slot === 'sa2';
        const [lo, hi] = isSA ? r.sa : r.fa;
        const obtained  = randInt(lo, hi);

        const { created } = await upsert(
          Marks,
          { examId: examMap[ed.slot]._id, studentId: user._id, subjectId: sub._id, schoolId: school._id },
          {
            examId:        examMap[ed.slot]._id,
            studentId:     user._id,
            subjectId:     sub._id,
            classId:       class10._id,
            sectionId:     section10A._id,
            session:       session._id,
            marksObtained: obtained,
            uploadedBy:    adminUser._id,
            schoolId:      school._id,
          }
        );
        created ? mCreated++ : mSkip++;
      }
    }
  }
  console.log(`✅  Step 9 : Raw Marks — ${mCreated} created / ${mSkip} skipped`);

  // STEP 10 — ReportCards + ReportCardMarks + CoScholasticMarks
  //
  //  IMPORTANT: Co-scholastic skill names must EXACTLY match
  //  DEFAULT_CO_SCHOLASTIC_SKILLS in reportCardController.js
  const CO_SKILLS = [
    'Punctuality / Regularity',
    'Personal Cleanliness',
    'Discipline / Confidence',
    'Enjoy All Activities',
    'Completes work in time',
    'Maintain Book / Copies',
    'Concentration',
    'Vocabulary / Pronunciation',
  ];

  let rcCreated = 0, rcSkip = 0;
  let rcmCreated = 0, rcmSkip = 0;
  let coCreated = 0, coSkip = 0;

  for (const { user, profile, tier } of profiles) {
    // 10a — ReportCard (one per student per session)
    const { doc: rc, created: rcNew } = await upsert(
      ReportCard,
      { studentId: profile._id, session: session._id, schoolId: school._id },
      {
        studentId:    profile._id,
        classId:      class10._id,
        session:      session._id,
        rank:         '',
        remarksTerm1: 'Satisfactory effort. Continue working hard.',
        remarksTerm2: 'Shows good improvement. Keep it up.',
        healthTerm1:  { height: '158', weight: '48' },
        healthTerm2:  { height: '160', weight: '50' },
        isFinalized:  false,
        schoolId:     school._id,
      }
    );
    rcNew ? rcCreated++ : rcSkip++;

    // 10b — ReportCardMarks (fetch real stored marks and compute totals)
    for (const sub of subjects) {
      const rawMarks = {};
      for (const ed of EXAM_DEFS) {
        const m = await Marks.findOne({
          examId:    examMap[ed.slot]._id,
          studentId: user._id,
          subjectId: sub._id,
          schoolId:  school._id,
        });
        rawMarks[ed.slot] = m ? m.marksObtained : 0;
      }

      const slots = {
        fa1_1: rawMarks.fa1_1, fa1_2: rawMarks.fa1_2,
        fa2_1: rawMarks.fa2_1, fa2_2: rawMarks.fa2_2,
        sa1:   rawMarks.sa1,
        fa3_1: rawMarks.fa3_1, fa3_2: rawMarks.fa3_2,
        fa4_1: rawMarks.fa4_1, fa4_2: rawMarks.fa4_2,
        sa2:   rawMarks.sa2,
      };
      const total = calcTotal(slots);

      const { created: rcmNew } = await upsert(
        ReportCardMark,
        { reportCardId: rc._id, subject: sub.name, schoolId: school._id },
        { reportCardId: rc._id, subject: sub.name, subjectId: sub._id, ...slots, total, grade: grade(total), isEdited: false, schoolId: school._id }
      );
      rcmNew ? rcmCreated++ : rcmSkip++;
    }

    // 10c — CoScholasticMarks
    const r = TIER[tier];
    for (const skill of CO_SKILLS) {
      const t1 = randInt(r.fa[0], r.fa[1]);
      const t2 = randInt(r.fa[0], r.fa[1]);
      const avg = (t1 + t2) / 2;
      const { created: coNew } = await upsert(
        CoScholasticMark,
        { reportCardId: rc._id, skillName: skill, schoolId: school._id },
        { reportCardId: rc._id, skillName: skill, term1Marks: t1, term2Marks: t2, grade: grade(avg * 10), schoolId: school._id }
      );
      coNew ? coCreated++ : coSkip++;
    }
  }

  console.log(`✅  Step 10: ReportCards — ${rcCreated} created / ${rcSkip} skipped`);
  console.log(`            ReportCardMarks — ${rcmCreated} created / ${rcmSkip} skipped`);
  console.log(`            CoScholasticMarks — ${coCreated} created / ${coSkip} skipped`);

  // SUMMARY
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('🎉  Seed Complete!');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log(`\n  School code  : DEMO2025`);
  console.log(`  Session      : 2025-2026`);
  console.log(`  Class        : Class 10 — Section A`);
  console.log(`  Subjects     : ${subjects.length}`);
  console.log(`  Students     : ${profiles.length}  (4 toppers / 5 avg / 3 weak)`);
  console.log(`  Exams        : ${EXAM_DEFS.length}  (FA1×2, FA2×2, SA-I, FA3×2, FA4×2, SA-II)`);

  console.log('\n  ┌──────────────────────────────────────────────────────────┐');
  console.log('  │                    DASHBOARD LOGINS                      │');
  console.log('  ├──────────────┬───────────────────────────┬──────────────┤');
  console.log('  │ Role         │ Email / Roll No.           │ Password     │');
  console.log('  ├──────────────┼───────────────────────────┼──────────────┤');
  console.log('  │ Admin        │ admin@school.com           │ admin123     │');
  console.log('  │ Teacher      │ rc_teacher@school.com      │ teacher123   │');
  console.log('  │ Student (×12)│ rc_s01@school.com … rc_s12 │ student123   │');
  console.log('  │              │ OR   roll no:  01 … 12     │             │');
  console.log('  └──────────────┴───────────────────────────┴──────────────┘');
  console.log('  School Code (all roles) : DEMO2025\n');
  console.log('  ► Admin   : select Class 10 → Section A → Generate Report Cards');
  console.log('  ► Teacher : same flow — already assigned as class teacher');
  console.log('  ► Student : Report Card page auto-loads for the logged-in student\n');

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('\n💥  Seed failed:', err);
  mongoose.connection.close();
  process.exit(1);
});
