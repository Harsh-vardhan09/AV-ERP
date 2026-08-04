// ══════════════════════════════════════════════════════════════════
// OASES Model — QuestionScheme (Sprint 1 ─ full schema)
// One scheme per exam config (unique), stores per-question details.
// ══════════════════════════════════════════════════════════════════
const mongoose = require('mongoose');

// ── Sub-schema: step mark breakdown ────────────────────────────
const StepSchema = new mongoose.Schema({
  stepNo:       { type: Number, required: true },
  maxStepMarks: { type: Number, required: true },
}, { _id: false });

// ── Sub-schema: individual question ────────────────────────────
const QuestionSchema = new mongoose.Schema({
  questionNo:   { type: Number, required: true },
  section:      { type: String, enum: ['A','B','C','D'], default: 'A' },
  questionType: {
    type:    String,
    enum:    ['subjective', 'mcq', 'fill_in_blank', 'short_answer'],
    default: 'subjective',
  },
  maxMarks:    { type: Number, required: true },
  steps:       { type: [StepSchema], default: [] },

  // Optional question handling
  isOptional:         { type: Boolean, default: false },
  optionGroup:        { type: String, default: null },   // e.g. 'G1', 'G2'
  optionGroupAllowed: { type: Number, default: null },    // attempt any N from this group

  // MCQ fields
  correctOption:  { type: String, default: null },   // 'A','B','C','D'
  negativeMarks:  { type: Number, default: 0 },

  displayOrder: { type: Number, default: 0 },
}, { _id: false });

// ── Main schema ─────────────────────────────────────────────────
const QuestionSchemeSchema = new mongoose.Schema(
  {
    examConfigId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'OasesExamConfig',
      required: true,
      unique:   true, // one scheme per exam config
      index:    true,
    },
    schoolId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'School',
      required: true,
      index:    true,
    },
    set: { type: String, default: 'single' }, // 'A','B','single'
    questions: { type: [QuestionSchema], required: true },
    markingSchemePdfPath: { type: String, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OasesQuestionScheme', QuestionSchemeSchema);
