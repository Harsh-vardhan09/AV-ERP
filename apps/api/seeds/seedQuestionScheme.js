// A test question scheme for the existing exam config
require('dotenv').config();
const mongoose       = require('mongoose');
const ExamConfig     = require('../src-old/models/oases/ExamConfig');
const QuestionScheme = require('../src-old/models/oases/QuestionScheme');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DB_URL;

(async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // Find the first active/draft exam config
  const exam = await ExamConfig.findOne({
    status: { $in: ['active', 'draft', 'evaluation'] },
  });

  if (!exam) {
    console.error('❌ No exam config found. Create one via Admin → Exam Setup.');
    process.exit(1);
  }

  console.log(`📋 Exam: ${exam.examName} | ${exam.subjectCode} | ${exam.status}`);
  console.log(`   _id: ${exam._id}\n`);

  // Delete existing scheme if any
  const existing = await QuestionScheme.findOne({ examConfigId: exam._id });
  if (existing) {
    console.log(`ℹ️  Removing old scheme (${existing.questions.length} questions)...\n`);
    await QuestionScheme.deleteOne({ _id: existing._id });
  }

  // Build questions using CORRECT enum values from QuestionScheme model:
  //   section:      'A' | 'B' | 'C' | 'D'
  //   questionType: 'subjective' | 'mcq' | 'fill_in_blank' | 'short_answer'
  let qNo = 1;
  const questions = [
    // Section A — MCQ (10 × 1 = 10 marks)
    ...Array.from({ length: 10 }, () => ({
      questionNo:   qNo++,
      section:      'A',
      maxMarks:     1,
      questionType: 'mcq',
      displayOrder: qNo - 1,
    })),
    // Section B — Fill in the blank (5 × 1 = 5 marks)
    ...Array.from({ length: 5 }, () => ({
      questionNo:   qNo++,
      section:      'B',
      maxMarks:     1,
      questionType: 'fill_in_blank',
      displayOrder: qNo - 1,
    })),
    // Section C — Short Answer (5 × 3 = 15 marks)
    ...Array.from({ length: 5 }, () => ({
      questionNo:   qNo++,
      section:      'C',
      maxMarks:     3,
      questionType: 'short_answer',
      displayOrder: qNo - 1,
    })),
    // Section D — Long Answer / Subjective (5 × 6 = 30 marks)
    ...Array.from({ length: 5 }, () => ({
      questionNo:   qNo++,
      section:      'D',
      maxMarks:     6,
      questionType: 'subjective',
      displayOrder: qNo - 1,
    })),
  ];

  const totalMax = questions.reduce((s, q) => s + q.maxMarks, 0);
  console.log(`Creating scheme: ${questions.length} questions, ${totalMax} total marks`);

  const scheme = await QuestionScheme.create({
    schoolId:     exam.schoolId,
    examConfigId: exam._id,
    questions,
    createdBy:    exam.createdBy || null,
  });

  console.log(`\n✅ Question scheme created!`);
  console.log(`   _id          : ${scheme._id}`);
  console.log(`   Total Qs     : ${scheme.questions.length}`);
  console.log(`   Sections     : A(MCQ×10=10m) B(Fill×5=5m) C(Short×5=15m) D(Long×5=30m)`);
  console.log(`   Total Marks  : ${totalMax}`);
  console.log('\n🎯 Evaluator can now see and mark all questions in SheetViewer!');

  await mongoose.disconnect();
  process.exit(0);
})();
