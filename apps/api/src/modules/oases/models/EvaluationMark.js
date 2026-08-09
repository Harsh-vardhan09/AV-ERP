// OASES Model — EvaluationMark
// Stores per-question marks awarded by one evaluator in one round.
// One doc per (sheetId + evaluatorId + round).
// Sprint 3 additions: stepMarks, sectionTotals, grandTotal,
//   annotations, remarks (HE), savedAt
const mongoose = require('mongoose');
const { EVAL_ROUNDS } = require('../lib/constants');

// Sub-schema: step mark detail
const StepMarkSchema = new mongoose.Schema(
  {
    stepNo: { type: Number, required: true },
    marks:  { type: Number, default: 0 },
  },
  { _id: false }
);

// Sub-schema: annotation overlay
const AnnotationSchema = new mongoose.Schema(
  {
    page:      { type: Number, required: true },
    tool:      { type: String, enum: ['highlight', 'circle', 'tick', 'cross', 'underline'], required: true },
    coords:    { type: mongoose.Schema.Types.Mixed, default: {} }, // {x,y,w,h} or {cx,cy,r}
    color:     { type: String, default: '#ef4444' },
    createdAt: { type: Date,   default: Date.now },
  },
  { _id: false }
);

// Sub-schema: click/annotate mode badge
// Stores marks dropped on the PDF canvas via Click Mode or Annotate Mode.
// x, y are stored as 0–100 percentages of the page image dimensions.
const ClickMarkSchema = new mongoose.Schema(
  {
    markId:      { type: String, required: true },
    pageNo:      { type: Number, required: true },
    x:           { type: Number, required: true },   // % of image width  (0–100)
    y:           { type: Number, required: true },   // % of image height (0–100)
    marksGiven:  { type: Number, default: 0 },
    questionNo:  { type: Number, default: null },    // set in Annotate mode
    mode:        { type: String, enum: ['click', 'annotate'], default: 'click' },
    addedAt:     { type: Date,   default: Date.now },
  },
  { _id: false }
);

// Sub-schema: per-question mark
const QuestionMarkSchema = new mongoose.Schema(
  {
    questionNo:   { type: Number, required: true },
    marksGiven:   { type: Number, default: 0 },           // renamed from marksAwarded
    isNA:         { type: Boolean, default: false },
    stepMarks:    { type: [StepMarkSchema], default: [] }, // per-step breakdown
    annotation:   { type: String, default: '' },
    savedAt:      { type: Date,   default: Date.now },     // per-question save timestamp
  },
  { _id: false }
);

const EvaluationMarkSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    sheetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OasesAnswerSheet',
      required: true,
      index: true,
    },
    examConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OasesExamConfig',
      required: true,
    },
    evaluatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    round: {
      type: Number,
      enum: Object.values(EVAL_ROUNDS),
      required: true,
    },

    // Per-question marks
    marks: { type: [QuestionMarkSchema], default: [] },

    // Section totals (computed on save)
    sectionTotals: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // e.g. { A: 18, B: 24, C: 12, D: 0 }
    },
    grandTotal: { type: Number, default: 0 },

    // Legacy field (kept for BC)
    totalMarksAwarded: { type: Number, default: 0 },

    // Annotations overlay
    annotations: { type: [AnnotationSchema], default: [] },

    // Click / Annotate mode badges
    // Persists mark badges dropped on the PDF canvas.
    clickMarks: { type: [ClickMarkSchema], default: [] },

    // Marking mode last used by teacher
    markingMode: {
      type: String,
      enum: ['click', 'annotate', 'panel'],
      default: 'panel',
    },

    // Draft / final state
    isDraft:      { type: Boolean, default: true },
    submittedAt:  { type: Date, default: null },
    savedAt:      { type: Date, default: null }, // last auto-save timestamp

    // Pages reviewed tracker
    pagesReviewed: { type: [Number], default: [] },

    // Head examiner remarks (round 3 only)
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

// One evaluator can have only one mark sheet per (sheet + round)
EvaluationMarkSchema.index({ sheetId: 1, evaluatorId: 1, round: 1 }, { unique: true });

module.exports = mongoose.model('OasesEvaluationMark', EvaluationMarkSchema);
