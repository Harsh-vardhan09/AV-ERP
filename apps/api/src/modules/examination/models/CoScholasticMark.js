const mongoose = require('mongoose');

/**
 * CoScholasticMark — one document per student per skill per report card.
 *
 * Grade storage supports two modes (non-exclusive):
 *   Letter-grade mode : t1Grade / t2Grade / grade  (A, B, C, D, E)
 *   Numeric mode      : term1Marks / term2Marks     (0-10, for CBSE-style numeric input)
 *
 * The data aggregator always reads t1Grade/t2Grade first, falls back to
 * _numToLetterGrade(term1Marks/term2Marks), and finally uses the `grade` overall field.
 */
const coScholasticMarkSchema = new mongoose.Schema(
  {
    reportCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportCard',
      required: [true, 'Report card is required'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      index: true,
    },
    skillName: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
    },

    // ── Letter-grade mode (primary — used when teacher selects A/B/C/D) ──────
    t1Grade: {
      type: String,
      trim: true,
      default: '',
      enum: { values: ['', 'A+', 'A', 'B', 'C', 'D', 'E'], message: 'Invalid grade value' },
    },
    t2Grade: {
      type: String,
      trim: true,
      default: '',
      enum: { values: ['', 'A+', 'A', 'B', 'C', 'D', 'E'], message: 'Invalid grade value' },
    },
    grade: {
      type: String,
      trim: true,
      default: '', // overall / combined grade
    },

    // ── Numeric mode (legacy / CBSE numeric input — 0-10) ──────────────────
    term1Marks: {
      type: Number,
      default: null,
      min: 0,
      max: 10,
    },
    term2Marks: {
      type: Number,
      default: null,
      min: 0,
      max: 10,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School context is required'],
      index: true,
    },
  },
  { timestamps: true }
);

// Unique constraint: one row per report card × skill × school
coScholasticMarkSchema.index({ reportCardId: 1, skillName: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('CoScholasticMark', coScholasticMarkSchema);
