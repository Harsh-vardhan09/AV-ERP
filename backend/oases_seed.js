// ══════════════════════════════════════════════════════════════════
// OASES Seed Script — Full test data for manual QA
//
// Creates:
//   • 5 ExamConfigs (draft, active, evaluation-in-progress, locked, approved)
//   • 8-12 AnswerSheets per exam (with realistic statuses)
//   • EvaluatorAssignments for evaluation/locked/approved exams
//   • Marks data on eval1_done sheets
//
// Run: node oases_seed.js
// Safe to re-run — skips if exams already seeded.
// ══════════════════════════════════════════════════════════════════
const mongoose = require('mongoose');
require('dotenv').config();

const ExamConfig          = require('./src/models/oases/ExamConfig');
const AnswerSheet         = require('./src/models/oases/AnswerSheet');
const EvaluatorAssignment = require('./src/models/oases/EvaluatorAssignment');
const { User }            = require('./src/models/user');

const {
  SHEET_STATUS,
  PROCESSING_STATUS,
  EVAL_ROUNDS,
} = require('./src/utils/oasesConstants');

// ── Helper: random int ────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Anonymous code generator ──────────────────────────────────────
let codeCounter = 1000;
const nextCode = () => `ANON-${(++codeCounter).toString().padStart(5, '0')}`;

// ── Seed data definitions ─────────────────────────────────────────
const EXAM_DEFS = [
  {
    examName:    'Half Yearly Exam 2025-26 — Mathematics',
    subjectCode: 'MATH',
    subjectName: 'Mathematics',
    classLevel:  '6A',
    examType:    'theory',
    totalMarks:  80,
    passingMarks: 33,
    academicYear: '2025-26',
    status:      'draft',
    sheetsCount:  0,   // no sheets yet — just a draft
  },
  {
    examName:    'Unit Test 1 — English Literature',
    subjectCode: 'ENG',
    subjectName: 'English Literature',
    classLevel:  '7B',
    examType:    'theory',
    totalMarks:  50,
    passingMarks: 20,
    academicYear: '2025-26',
    status:      'active',
    sheetsCount:  0,   // active — ready for upload
  },
  {
    examName:    'Half Yearly Exam 2025-26 — Science',
    subjectCode: 'SCI',
    subjectName: 'Science',
    classLevel:  '8C',
    examType:    'theory',
    totalMarks:  80,
    passingMarks: 33,
    academicYear: '2025-26',
    status:      'evaluation',
    sheetsCount:  10,  // 10 sheets — 6 evaluated, 4 pending
    sheetStatuses: [
      'eval1_done', 'eval1_done', 'eval1_done', 'eval1_done', 'eval1_done', 'eval1_done',
      'assigned', 'assigned', 'assigned', 'assigned',
    ],
  },
  {
    examName:    'Final Term — Social Science',
    subjectCode: 'SST',
    subjectName: 'Social Science',
    classLevel:  '9A',
    examType:    'theory',
    totalMarks:  100,
    passingMarks: 33,
    academicYear: '2025-26',
    status:      'evaluation',
    sheetsCount:  12,  // 12 sheets — all evaluated (ready to approve)
    sheetStatuses: [
      'eval1_done', 'eval1_done', 'eval1_done', 'eval1_done', 'eval1_done',
      'eval1_done', 'eval1_done', 'eval1_done', 'eval1_done', 'eval1_done',
      'eval1_done', 'eval1_done',
    ],
  },
  {
    examName:    'Annual Exam — Hindi',
    subjectCode: 'HIN',
    subjectName: 'Hindi',
    classLevel:  '10B',
    examType:    'theory',
    totalMarks:  80,
    passingMarks: 33,
    academicYear: '2024-25',
    status:      'closed',
    sheetsCount:  8,   // 8 sheets — approved/locked
    sheetStatuses: [
      'locked', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked',
    ],
  },
];

// ── Main seed function ────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI || process.env.DATABASE_URL);
  console.log('✅ Connected to MongoDB\n');

  // ── 1. Find admin + school ─────────────────────────────────────
  const admin = await User.findOne({ role: 'admin', isActive: true })
    .select('_id firstName email schoolId').lean();
  if (!admin) { console.error('❌ No active admin found!'); process.exit(1); }

  const schoolId = admin.schoolId;
  console.log(`🏫 School ID:  ${schoolId}`);
  console.log(`👤 Admin:      ${admin.firstName} (${admin.email})\n`);

  // ── 2. Find teachers ───────────────────────────────────────────
  const teachers = await User.find({
    schoolId,
    isActive: true,
    role:     'teacher',
  }).select('_id firstName lastName email').lean();
  console.log(`👩‍🏫 Teachers found: ${teachers.length}`);
  teachers.forEach(t => console.log(`   • ${t.firstName} ${t.lastName} (${t.email})`));

  if (!teachers.length) {
    console.warn('\n⚠️  No teachers found! Sheets will be created but NOT assigned.');
    console.warn('   Register at least one teacher in the ERP to test assignment.\n');
  }

  // ── 3. Check if already seeded ────────────────────────────────
  const existing = await ExamConfig.countDocuments({ schoolId, examName: /Half Yearly Exam 2025/ });
  if (existing > 0) {
    console.log('\n⚠️  OASES seed data already exists. Dropping existing OASES data first...\n');
    await ExamConfig.deleteMany({ schoolId });
    await AnswerSheet.deleteMany({ schoolId });
    await EvaluatorAssignment.deleteMany({ schoolId });
    console.log('🗑️  Old OASES data cleared.\n');
  }

  // ── 4. Seed each exam ──────────────────────────────────────────
  for (const def of EXAM_DEFS) {
    process.stdout.write(`📋 Creating: ${def.examName} [${def.status.toUpperCase()}]...`);

    // Create exam config
    const examConfig = await ExamConfig.create({
      schoolId,
      createdBy:     admin._id,
      examName:      def.examName,
      subjectCode:   def.subjectCode,
      subjectName:   def.subjectName,
      classLevel:    def.classLevel,
      examType:      def.examType,
      setType:       'single',
      totalMarks:    def.totalMarks,
      passingMarks:  def.passingMarks,
      academicYear:  def.academicYear,
      status:        def.status,
      dailyEvalLimit: 20,
      instructions:  'Evaluate each part carefully. Give marks for each step shown.',
      evalDeadline:  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    // Skip sheets for draft and active
    if (!def.sheetsCount || def.sheetsCount === 0) {
      console.log(' ✅');
      continue;
    }

    // Create answer sheets
    const sheetDocs = [];
    for (let i = 0; i < def.sheetsCount; i++) {
      const status = def.sheetStatuses?.[i] || 'uploaded';
      const isEval = status === 'eval1_done';
      const rollNo = `${def.classLevel.replace(/\D/g, '')}${(i + 1).toString().padStart(3, '0')}`;

      sheetDocs.push({
        schoolId,
        examConfigId:     examConfig._id,
        anonymousCode:    nextCode(),
        uploadedBy:       admin._id,
        originalFilename: `answer_sheet_${rollNo}.pdf`,
        processingStatus: PROCESSING_STATUS.DONE,
        status:           SHEET_STATUS[status.toUpperCase().replace('-', '_')] || status,
        totalPages:       rand(8, 14),
        set:              'single',
        pageImages:       [], // empty — no actual files needed for UI testing
        // If evaluated, store marks summary
        ...(isEval && {
          marksAwarded: rand(Math.ceil(def.passingMarks * 0.4), def.totalMarks),
        }),
      });
    }

    const sheets = await AnswerSheet.insertMany(sheetDocs);
    const sheetIds = sheets.map(s => s._id);

    // ── Assign teacher if we have one ──────────────────────────
    if (teachers.length > 0 && def.sheetsCount > 0) {
      const teacher = teachers[0]; // assign all to first teacher for simplicity
      await EvaluatorAssignment.create({
        schoolId,
        examConfigId:   examConfig._id,
        evaluatorId:    teacher._id,
        round:          EVAL_ROUNDS.ROUND_1,
        sheetIds,
        totalAssigned:  sheetIds.length,
        totalCompleted: def.sheetStatuses.filter(s => s === 'eval1_done').length,
        assignedBy:     admin._id,
        dailyLimit:     20,
        deadlineDate:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Update assigned sheets to reference teacher
      await AnswerSheet.updateMany(
        { _id: { $in: sheetIds }, status: { $ne: 'uploaded' } },
        { eval1AssignedTo: teacher._id }
      );

      console.log(` ✅  (${sheets.length} sheets → assigned to ${teacher.firstName})`);
    } else {
      console.log(` ✅  (${sheets.length} sheets, no teacher to assign)`);
    }
  }

  // ── 5. Summary ─────────────────────────────────────────────────
  const totalExams  = await ExamConfig.countDocuments({ schoolId });
  const totalSheets = await AnswerSheet.countDocuments({ schoolId });
  const totalAssign  = await EvaluatorAssignment.countDocuments({ schoolId });

  console.log('\n══════════════════════════════════════════════');
  console.log('📊 OASES SEED COMPLETE');
  console.log('══════════════════════════════════════════════');
  console.log(`   📋 Exam Configs:       ${totalExams}`);
  console.log(`   📄 Answer Sheets:      ${totalSheets}`);
  console.log(`   👩‍🏫 Assignments:         ${totalAssign}`);
  console.log('══════════════════════════════════════════════');
  console.log('\n🔑 Login and test:');
  console.log(`   Admin:   admin@school.com`);
  console.log(`   URL:     http://localhost:5173/login`);
  console.log(`   OASES:   Click "OASES – Answer Sheets" in sidebar`);
  console.log('\n📋 What you can test:');
  console.log('   ✅ Dashboard: stats cards, recent exam cards, quick actions');
  console.log('   ✅ Exam List: filter by Draft/Active/In Progress/Closed');
  console.log('   ✅ Draft exam: Continue Setup → wizard Step 1 (pre-filled)');
  console.log('   ✅ Active exam: Continue Setup → wizard Step 2 (upload area)');
  console.log('   ✅ Evaluation exam (SCI): Monitor step → table with 6 done / 4 pending');
  console.log('   ✅ Evaluation exam (SST): Approve step → all 12 done → approve button');
  console.log('   ✅ Closed exam (HIN): View Results button');
  if (teachers.length > 0) {
    console.log(`\n   Teacher: ${teachers[0].email || 'check DB'}`);
    console.log('   ✅ Teacher login → "OASES – My Copies" in sidebar');
    console.log('   ✅ Shows assigned sheets grouped by exam');
    console.log('   ✅ Click any sheet → SheetViewer evaluation panel');
  }
  console.log('');

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Happy testing!\n');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
