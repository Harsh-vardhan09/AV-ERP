const mongoose = require('mongoose');

// One entry per marks component (theory, practical, project, or custom)
const marksDistributionSchema = new mongoose.Schema({
  type:     { type: String, required: true },   // 'theory' | 'practical' | 'project' | 'internal' | custom slug
  label:    { type: String, required: true },   // Display name e.g. "Theory", "Viva", "Lab Work"
  maxMarks: { type: Number, required: true, min: 0 },
}, { _id: false });

const examSubjectConfigSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam is required']
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassModel',
    required: [true, 'Class is required']
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectMaster',
    required: [true, 'Subject is required']
  },
  // Multi-tenancy
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School context is required'],
    index: true,
  },

  // ── Marks Distribution ──────────────────────────────────────────────────────
  // Array of { type, label, maxMarks } — admin-defined breakdown per component.
  // e.g. [ { type: 'theory', label: 'Theory', maxMarks: 80 },
  //         { type: 'practical', label: 'Practical', maxMarks: 20 } ]
  // When present, this OVERRIDES the legacy maxMarks field.
  marksDistribution: {
    type: [marksDistributionSchema],
    default: [],
  },

  // ── Legacy flat fields (kept for backward compatibility) ────────────────────
  // maxMarks = total theory marks (or total if no distribution defined)
  maxMarks: {
    type: Number,
    required: [true, 'Maximum marks is required']
  },
  passingMarks: {
    type: Number,
    required: [true, 'Passing marks is required']
  },
  // Deprecated — use marksDistribution instead
  practicalMaxMarks: { type: Number, default: 0 },
  projectMaxMarks:   { type: Number, default: 0 },

  examDate: { type: Date }
}, { timestamps: true });

// Each subject configured once per exam per class
examSubjectConfigSchema.index(
  { examId: 1, classId: 1, subjectId: 1, schoolId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('ExamSubjectConfig', examSubjectConfigSchema);
