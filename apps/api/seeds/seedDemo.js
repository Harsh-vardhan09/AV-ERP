// Demo data for the dynamic report card module, school DEMOABC001

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// Models
const School                  = require('../src/modules/tenancy').School;
const { User }                = require('../src/modules/identity');
const AcademicSession         = require('../src-old/models/AcademicSession');
const ClassModel              = require('../src-old/models/ClassModel');
const SectionModel            = require('../src-old/models/SectionModel');
const SubjectMaster           = require('../src-old/models/SubjectMaster');
const ClassSubjectMap         = require('../src-old/models/ClassSubjectMap');
const TeacherSubjectAssignment= require('../src-old/models/TeacherSubjectAssignment');
const TeacherProfile          = require('../src-old/models/TeacherProfile');
const StudentProfile          = require('../src-old/models/StudentProfile');
const Exam                    = require('../src-old/models/Exam');
const ExamSubjectConfig       = require('../src-old/models/ExamSubjectConfig');
const Marks                   = require('../src-old/models/MarksModel');
const ReportTemplate          = require('../src-old/models/ReportTemplate');

const HASH = async (pw) => bcrypt.hash(pw, 10);
const oid  = () => new mongoose.Types.ObjectId();

// HTML template with dynamic + custom fields
const TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; }
  th { background: #f0f0f0; }
  .header { text-align: center; margin-bottom: 16px; }
  .info { display: flex; gap: 40px; margin-bottom: 12px; }
</style></head>
<body>
<div class="header">
  <h2>{{school-name}}</h2>
  <h3>Report Card — {{exam-name}}</h3>
</div>
<div class="info">
  <span><b>Name:</b> {{student-name}}</span>
  <span><b>Roll No:</b> {{rollNo}}</span>
  <span><b>Class:</b> {{class}} - {{section}}</span>
  <span><b>Scholar No:</b> {{scholarNo}}</span>
</div>
<table>
  <thead>
    <tr>
      <th>Subject</th>
      <th>Theory (80)</th>
      <th>Practical (20)</th>
      <th>Quiz (10)</th>
      <th>Assignment (10)</th>
      <th>Total (120)</th>
      <th>Grade</th>
    </tr>
  </thead>
  <tbody>
    {{#subjects}}
    <tr>
      <td>{{name}}</td>
      <td>{{obt_theory}}</td>
      <td>{{obt_practical}}</td>
      <td>{{math_quiz}}</td>
      <td>{{science_assignment}}</td>
      <td>{{total}}</td>
      <td>{{grade}}</td>
    </tr>
    {{/subjects}}
  </tbody>
</table>
<br>
<table>
  <tr>
    <th>Total Marks</th><td>{{total-marks}}</td>
    <th>Percentage</th><td>{{percentage}}%</td>
    <th>Rank</th><td>{{rank}}</td>
    <th>Result</th><td>{{result}}</td>
  </tr>
</table>
<p><b>Remarks:</b> {{remarks}}</p>
</body>
</html>`;

// Template schema (pre-extracted so teachers see fields immediately)
const TEMPLATE_SCHEMA = {
  fields: [
    { name: 'student-name',       label: 'Student Name',   category: 'meta',    isLoop: false },
    { name: 'rollNo',             label: 'Roll No',        category: 'meta',    isLoop: false },
    { name: 'class',              label: 'Class',          category: 'meta',    isLoop: false },
    { name: 'section',            label: 'Section',        category: 'meta',    isLoop: false },
    { name: 'scholarNo',          label: 'Scholar No',     category: 'meta',    isLoop: false },
    { name: 'school-name',        label: 'School Name',    category: 'meta',    isLoop: false },
    { name: 'exam-name',          label: 'Exam Name',      category: 'meta',    isLoop: false },
    { name: 'obt_theory',         label: 'Theory Marks',   category: 'marks',   isLoop: true,  subject: '',           component: 'theory' },
    { name: 'obt_practical',      label: 'Practical Marks',category: 'marks',   isLoop: true,  subject: '',           component: 'practical' },
    { name: 'math_quiz',          label: 'Math Quiz',      category: 'marks',   isLoop: false, subject: 'mathematics', component: 'quiz' },
    { name: 'science_assignment', label: 'Science Assign', category: 'marks',   isLoop: false, subject: 'science',     component: 'assignment' },
    { name: 'total',              label: 'Total',          category: 'derived', isLoop: true  },
    { name: 'grade',              label: 'Grade',          category: 'derived', isLoop: true  },
    { name: 'percentage',         label: 'Percentage',     category: 'derived', isLoop: false },
    { name: 'rank',               label: 'Rank',           category: 'derived', isLoop: false },
    { name: 'result',             label: 'Result',         category: 'derived', isLoop: false },
    { name: 'total-marks',        label: 'Total Marks',    category: 'derived', isLoop: false },
    { name: 'remarks',            label: 'Remarks',        category: 'other',   isLoop: false },
  ],
  marksFields: ['obt_theory', 'obt_practical', 'math_quiz', 'science_assignment'],
  metaFields:  ['student-name', 'rollNo', 'class', 'section', 'scholarNo', 'school-name', 'exam-name'],
  subjectBlock: { start: '{{#subjects}}', end: '{{/subjects}}' },
};

// Seed
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // 0. Clean previous demo data
  const existingSchool = await School.findOne({ code: 'DEMOABC001' });
  if (existingSchool) {
    const sid = existingSchool._id;
    await Promise.all([
      Marks.deleteMany({ schoolId: sid }),
      ExamSubjectConfig.deleteMany({ schoolId: sid }),
      Exam.deleteMany({ schoolId: sid }),
      ReportTemplate.deleteMany({ schoolId: sid }),
      TeacherSubjectAssignment.deleteMany({ schoolId: sid }),
      ClassSubjectMap.deleteMany({ schoolId: sid }),
      StudentProfile.deleteMany({ schoolId: sid }),
      TeacherProfile.deleteMany({ schoolId: sid }),
      SectionModel.deleteMany({ schoolId: sid }),
      ClassModel.deleteMany({ schoolId: sid }),
      SubjectMaster.deleteMany({ schoolId: sid }),
      AcademicSession.deleteMany({ schoolId: sid }),
      User.deleteMany({ schoolId: sid }),
      School.deleteOne({ _id: sid }),
    ]);
    console.log('🧹 Cleaned previous DEMOABC001 data');
  }

  // 1. School
  const school = await School.create({
    name: 'Demo ABC School',
    code: 'DEMOABC001',
    address: '123 Demo Street, Demo City',
    phone:   '9876543210',
    email:   'info@demoabc.edu',
    isActive: true,
  });
  const schoolId = school._id;
  console.log('🏫 School created:', school.code);

  // 2. Admin user
  const adminUser = await User.create({
    firstName: 'Demo',
    lastName:  'Admin',
    email:     'admin@demoabc.edu',
    password:  await HASH('Admin@123'),
    role:      'admin',
    schoolId,
    isActive:  true,
    isVerified: true,
  });
  await School.findByIdAndUpdate(schoolId, { adminUserId: adminUser._id });

  // 3. Academic Session
  const session = await AcademicSession.create({
    name:      '2024-25',
    startDate: new Date('2024-04-01'),
    endDate:   new Date('2025-03-31'),
    isActive:  true,
    schoolId,
  });
  const sessionId = session._id;
  console.log('📅 Session created:', session.name);

  // 4. Classes
  const [cls9, cls10] = await ClassModel.insertMany([
    { name: 'Class 9',  numericOrder: 9,  session: sessionId, schoolId },
    { name: 'Class 10', numericOrder: 10, session: sessionId, schoolId },
  ]);
  const cls9Id  = cls9._id;
  const cls10Id = cls10._id;
  console.log('🏛 Classes created: Class 9, Class 10');

  // 5. Sections
  const [sec9A, sec10A] = await SectionModel.insertMany([
    { name: 'A', classId: cls9Id,  session: sessionId, schoolId },
    { name: 'A', classId: cls10Id, session: sessionId, schoolId },
  ]);
  const sec9AId  = sec9A._id;
  const sec10AId = sec10A._id;

  // 6. Subjects
  const subjectData = [
    { name: 'English',        code: 'ENG' },
    { name: 'Mathematics',    code: 'MAT' },
    { name: 'Science',        code: 'SCI' },
    { name: 'Social Science', code: 'SST' },
    { name: 'Hindi',          code: 'HIN' },
  ];
  const subjects = await SubjectMaster.insertMany(
    subjectData.map(s => ({ ...s, schoolId }))
  );
  const subMap = Object.fromEntries(subjects.map(s => [s.code, s]));
  console.log('📚 Subjects created:', subjects.map(s => s.name).join(', '));

  // 7. Class-Subject mappings (both classes get all 5 subjects)
  const csmDocs = [];
  for (const clsId of [cls9Id, cls10Id]) {
    for (const sub of subjects) {
      csmDocs.push({ classId: clsId, subjectId: sub._id, session: sessionId, schoolId });
    }
  }
  await ClassSubjectMap.insertMany(csmDocs);

  // 8. Teachers
  const teacherDefs = [
    { fn: 'Rajan',  ln: 'Sharma',  email: 'math.teacher@demoabc.edu',  emp: 'TCH001', subCode: 'MAT', clsId: cls10Id, secId: sec10AId },
    { fn: 'Sunita', ln: 'Verma',   email: 'eng.teacher@demoabc.edu',   emp: 'TCH002', subCode: 'ENG', clsId: cls9Id,  secId: sec9AId  },
    { fn: 'Arvind', ln: 'Mishra',  email: 'sci.teacher@demoabc.edu',   emp: 'TCH003', subCode: 'SCI', clsId: cls9Id,  secId: sec9AId  },
    { fn: 'Meena',  ln: 'Joshi',   email: 'sst.teacher@demoabc.edu',   emp: 'TCH004', subCode: 'SST', clsId: cls10Id, secId: sec10AId },
    { fn: 'Vikash', ln: 'Pandey',  email: 'hin.teacher@demoabc.edu',   emp: 'TCH005', subCode: 'HIN', clsId: cls9Id,  secId: sec9AId  },
  ];

  const teacherUsers    = [];
  const teacherProfiles = [];
  const teacherAssigns  = [];

  for (const t of teacherDefs) {
    const u = await User.create({
      firstName: t.fn, lastName: t.ln,
      email: t.email, password: await HASH('Teacher@123'),
      role: 'teacher', schoolId, isActive: true, isVerified: true,
    });
    teacherUsers.push(u);

    const tp = await TeacherProfile.create({
      userId: u._id, firstName: t.fn, lastName: t.ln,
      employeeId: t.emp,
      teacherId:  t.emp,   // use employeeId value — keeps sparse index unique per teacher
      schoolId, status: 'active',
    });
    teacherProfiles.push(tp);

    // Assign teacher to subject for both class groups
    for (const [clsId, secId] of [[cls9Id, sec9AId], [cls10Id, sec10AId]]) {
      await TeacherSubjectAssignment.create({
        teacherId: u._id,
        subjectId: subMap[t.subCode]._id,
        classId:   clsId,
        sectionId: secId,
        session:   sessionId,
        schoolId,
      });
    }
  }
  console.log('👨‍🏫 Teachers created:', teacherDefs.map(t => `${t.fn} ${t.ln}`).join(', '));

  // Reference math teacher user for marks upload
  const mathTeacherUser = teacherUsers[0]; // Rajan Sharma

  // 9. Students
  const studentDefs = [
    // Class 9 A
    { fn:'Aarav',  ln:'Singh',    roll:'01', scholar:'SCH2401', dob:'2010-05-12', clsId:cls9Id,  secId:sec9AId,  father:'Rajesh Singh',    mother:'Priya Singh'   },
    { fn:'Priya',  ln:'Sharma',   roll:'02', scholar:'SCH2402', dob:'2010-08-22', clsId:cls9Id,  secId:sec9AId,  father:'Suresh Sharma',   mother:'Kavita Sharma'  },
    { fn:'Rohit',  ln:'Verma',    roll:'03', scholar:'SCH2403', dob:'2010-03-15', clsId:cls9Id,  secId:sec9AId,  father:'Dinesh Verma',    mother:'Sunita Verma'   },
    { fn:'Sneha',  ln:'Patel',    roll:'04', scholar:'SCH2404', dob:'2010-11-30', clsId:cls9Id,  secId:sec9AId,  father:'Mahesh Patel',    mother:'Asha Patel'     },
    { fn:'Karan',  ln:'Gupta',    roll:'05', scholar:'SCH2405', dob:'2010-07-04', clsId:cls9Id,  secId:sec9AId,  father:'Vikas Gupta',     mother:'Rekha Gupta'    },
    // Class 10 A
    { fn:'Ananya', ln:'Mishra',   roll:'01', scholar:'SCH2406', dob:'2009-02-18', clsId:cls10Id, secId:sec10AId, father:'Alok Mishra',     mother:'Geeta Mishra'   },
    { fn:'Vivek',  ln:'Kumar',    roll:'02', scholar:'SCH2407', dob:'2009-06-09', clsId:cls10Id, secId:sec10AId, father:'Sunil Kumar',     mother:'Mamta Kumar'    },
    { fn:'Pooja',  ln:'Yadav',    roll:'03', scholar:'SCH2408', dob:'2009-09-25', clsId:cls10Id, secId:sec10AId, father:'Ramesh Yadav',    mother:'Lata Yadav'     },
    { fn:'Amit',   ln:'Tiwari',   roll:'04', scholar:'SCH2409', dob:'2009-04-14', clsId:cls10Id, secId:sec10AId, father:'Girish Tiwari',   mother:'Nisha Tiwari'   },
    { fn:'Deepika',ln:'Joshi',    roll:'05', scholar:'SCH2410', dob:'2009-12-01', clsId:cls10Id, secId:sec10AId, father:'Pramod Joshi',    mother:'Sangeeta Joshi' },
  ];

  const studentProfiles = [];
  for (const s of studentDefs) {
    const u = await User.create({
      firstName: s.fn, lastName: s.ln,
      email: `${s.scholar.toLowerCase()}@demoabc.edu`,
      password: await HASH('Student@123'),
      role: 'student', schoolId, isActive: true, isVerified: true,
    });
    const sp = await StudentProfile.create({
      userId:          u._id,
      firstName:       s.fn,
      lastName:        s.ln,
      rollNo:          s.roll,
      scholarNo:       s.scholar,
      admissionNumber: `ADM-${s.scholar}`,  // unique per student — avoids admissionNumber_1 dup key
      studentId:       `STU-${s.scholar}`,
      dateOfBirth:     new Date(s.dob),
      classId:         s.clsId,
      sectionId:       s.secId,
      session:         sessionId,
      schoolId,
      address: 'Demo City, India',
      parentDetails: {
        father: { name: s.father, phone: '9800000000' },
        mother: { name: s.mother },
      },
      status: 'active',
    });
    studentProfiles.push({ user: u, profile: sp, clsId: s.clsId, secId: s.secId });
  }
  console.log('👨‍🎓 Students created:', studentProfiles.length);

  // 10. Report Template
  const template = await ReportTemplate.create({
    name:          'Demo Half-Yearly Template',
    description:   'Dynamic template with theory, practical, quiz, assignment fields',
    templateType:  'half_yearly',
    htmlContent:   TEMPLATE_HTML,
    templateSchema: TEMPLATE_SCHEMA,
    isDefault:     true,
    isActive:      true,
    schoolId,
    createdBy:     adminUser._id,
    usageCount:    0,
  });
  console.log('📄 Report template created:', template.name);

  // 11. Exams
  const [examHY, examAnnual] = await Exam.insertMany([
    {
      name:     'Half Yearly Examination 2024',
      type:     'half_yearly',
      session:  sessionId,
      classIds: [cls9._id, cls10._id],
      templateId: template._id,
      createdBy: adminUser._id,
      createdByRole: 'admin',
      schoolId,
      startDate: new Date('2024-09-16'),
      endDate:   new Date('2024-09-28'),
      evaluationStatus: 'in_progress',
    },
    {
      name:     'Annual Examination 2025',
      type:     'annual',
      session:  sessionId,
      classIds: [cls9._id, cls10._id],
      templateId: template._id,
      createdBy: adminUser._id,
      createdByRole: 'admin',
      schoolId,
      startDate: new Date('2025-02-10'),
      endDate:   new Date('2025-02-28'),
      evaluationStatus: 'pending',
    },
  ]);
  console.log('📝 Exams created: Half Yearly, Annual');

  // 12. ExamSubjectConfigs
  const escDocs = [];
  for (const exam of [examHY, examAnnual]) {
    for (const clsId of [cls9Id, cls10Id]) {
      for (const sub of subjects) {
        escDocs.push({
          examId:    exam._id,
          classId:   clsId,
          subjectId: sub._id,
          maxMarks:  80,
          practicalMaxMarks: 20,
          passingMarks: 27,
          marksDistribution: [
            { type: 'theory',    label: 'Theory',    maxMarks: 80 },
            { type: 'practical', label: 'Practical', maxMarks: 20 },
            { type: 'quiz',      label: 'Quiz',      maxMarks: 10 },
          ],
          schoolId,
        });
      }
    }
  }
  await ExamSubjectConfig.insertMany(escDocs);

  // 13. Marks (Half Yearly only)
  // Profiles: topper=Ananya(cls10), average=Vivek/Pooja, fail=Amit
  const marksDefs = {
    // Class 10 A students
    'SCH2406': { // Ananya — TOPPER
      english:        { english_theory: 76, english_practical: 19 },
      mathematics:    { mathematics_theory: 79, mathematics_practical: 20, math_quiz: 10 },
      science:        { science_theory: 75, science_practical: 18, science_assignment: 10 },
      'social-science':{ socialscience_theory: 74, socialscience_practical: 18 },
      hindi:          { hindi_theory: 77, hindi_practical: 19 },
    },
    'SCH2407': { // Vivek — AVERAGE
      english:        { english_theory: 58, english_practical: 13 },
      mathematics:    { mathematics_theory: 55, mathematics_practical: 14, math_quiz: 7  },
      science:        { science_theory: 52, science_practical: 12, science_assignment: 6  },
      'social-science':{ socialscience_theory: 56, socialscience_practical: 13 },
      hindi:          { hindi_theory: 60, hindi_practical: 14 },
    },
    'SCH2408': { // Pooja — AVERAGE
      english:        { english_theory: 62, english_practical: 15 },
      mathematics:    { mathematics_theory: 59, mathematics_practical: 16, math_quiz: 8  },
      science:        { science_theory: 60, science_practical: 14, science_assignment: 7  },
      'social-science':{ socialscience_theory: 61, socialscience_practical: 15 },
      hindi:          { hindi_theory: 65, hindi_practical: 16 },
    },
    'SCH2409': { // Amit — FAIL
      english:        { english_theory: 24, english_practical: 5  },
      mathematics:    { mathematics_theory: 21, mathematics_practical: 4,  math_quiz: 2  },
      science:        { science_theory: 23, science_practical: 5,  science_assignment: 3  },
      'social-science':{ socialscience_theory: 22, socialscience_practical: 4  },
      hindi:          { hindi_theory: 26, hindi_practical: 6  },
    },
    'SCH2410': { // Deepika — ABOVE AVERAGE
      english:        { english_theory: 70, english_practical: 17 },
      mathematics:    { mathematics_theory: 68, mathematics_practical: 17, math_quiz: 9  },
      science:        { science_theory: 67, science_practical: 16, science_assignment: 8  },
      'social-science':{ socialscience_theory: 69, socialscience_practical: 17 },
      hindi:          { hindi_theory: 71, hindi_practical: 17 },
    },
  };

  const marksDocs = [];
  for (const sp of studentProfiles.filter(s => s.clsId.toString() === cls10Id.toString())) {
    const scholar = sp.profile.scholarNo;
    const subjectMarks = marksDefs[scholar];
    if (!subjectMarks) continue;
    for (const sub of subjects) {
      const fields = subjectMarks[sub.slug] || {};
      if (Object.keys(fields).length === 0) continue;
      marksDocs.push({
        examId:    examHY._id,
        studentId: sp.user._id,
        subjectId: sub._id,
        classId:   sp.clsId,
        sectionId: sp.secId,
        session:   sessionId,
        schoolId,
        fields:    new Map(Object.entries(fields)),
        marksType: 'fields',
        templateId: template._id,
        uploadedBy: mathTeacherUser._id,
        status:    'submitted',
      });
    }
  }
  await Marks.insertMany(marksDocs);
  console.log('📊 Marks seeded for Class 10 A:', marksDocs.length, 'records');

  // 14. Print credentials
  console.log('\n' + '═'.repeat(60));
  console.log('🔑  DEMO LOGIN CREDENTIALS');
  console.log('═'.repeat(60));
  console.log('\n👤 Admin');
  console.log('   Email   : admin@demoabc.edu');
  console.log('   Password: Admin@123');
  console.log('   School  : DEMOABC001');
  console.log('\n👨‍🏫 Teachers');
  teacherDefs.forEach(t =>
    console.log(`   ${t.fn} ${t.ln.padEnd(10)} | ${t.email.padEnd(32)} | Teacher@123 | ${t.subSlug}`)
  );
  console.log('\n👨‍🎓 Students (Class 10 A — marks seeded)');
  studentDefs.filter(s => s.cls._id.equals(cls10._id)).forEach(s =>
    console.log(`   ${(s.fn+' '+s.ln).padEnd(16)} | ${s.scholar}@demoabc.edu | Student@123 | Roll ${s.roll}`)
  );
  console.log('\n📝 Exam IDs');
  console.log('   Half Yearly  :', examHY._id.toString());
  console.log('   Annual       :', examAnnual._id.toString());
  console.log('\n📄 Template ID  :', template._id.toString());
  console.log('📅 Session ID   :', sessionId.toString());
  console.log('🏫 School ID    :', schoolId.toString());
  console.log('═'.repeat(60));

  await mongoose.disconnect();
  console.log('\n✅ Seed complete. Disconnected.\n');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
