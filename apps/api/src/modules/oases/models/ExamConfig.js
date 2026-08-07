// OASES Model — ExamConfig (Sprint 1 ─ full schema)
// Replaces Sprint 0 stub. Mongoose model name stays 'OasesExamConfig'
// to avoid any existing document conflicts.
const mongoose = require('mongoose');

const ExamConfigSchema = new mongoose.Schema(
  {
    schoolId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'School',
      required: true,
      index:    true,
    },

    // Exam identity
    examName:    { type: String, required: true, trim: true },    // 'Half-Yearly 2025'
    subjectCode: { type: String, required: true, trim: true, uppercase: true }, // 'MATH-X'
    subjectName: { type: String, required: true, trim: true },
    classLevel:  { type: String, required: true, trim: true },    // '10', '10A', etc.
    academicYear:{ type: String, required: true, trim: true },    // '2024-25'

    // Exam type & sets
    examType: {
      type:    String,
      enum:    ['theory', 'mcq', 'mixed'],
      default: 'theory',
    },
    setType: {
      type:    String,
      enum:    ['single', 'multi'],
      default: 'single',
    },
    sets: { type: [String], default: [] }, // ['A','B','C'] when multi

    // Marks
    totalMarks:   { type: Number, required: true },
    passingMarks: { type: Number, required: true },

    // Evaluation settings
    doubleEval:         { type: Boolean, default: false },
    conflictThreshold:  { type: Number, default: null },   // required when doubleEval true
    dailyEvalLimit:     { type: Number, default: 20 },
    evalDeadline:       { type: Date,   default: null },

    // Status flow
    // draft → active → evaluation → closed
    // Soft delete: status = 'archived'
    status: {
      type:    String,
      enum:    ['draft', 'active', 'evaluation', 'closed', 'archived'],
      default: 'draft',
    },

    // Misc
    instructions: { type: String, default: '' },
    createdBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index — one config per subject+class+academicYear per school
ExamConfigSchema.index(
  { schoolId: 1, subjectCode: 1, classLevel: 1, academicYear: 1 },
  { unique: true, sparse: false }
);
ExamConfigSchema.index({ schoolId: 1, status: 1 });

module.exports = mongoose.model('OasesExamConfig', ExamConfigSchema);
