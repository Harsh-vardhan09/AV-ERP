// ══════════════════════════════════════════════════════════════════
// OASES Model — ResultSheet (Sprint 6 upgrade)
// Final computed result for one answer sheet after all eval rounds.
// ══════════════════════════════════════════════════════════════════
const mongoose = require('mongoose');

const PerQuestionResultSchema = new mongoose.Schema(
  {
    questionNo:      { type: Number, required: true },
    marksAwarded:    { type: Number, required: true },
    eval1Marks:      { type: Number, default: null },
    eval2Marks:      { type: Number, default: null },
    headReviewMarks: { type: Number, default: null },
    acceptedRound:   { type: Number, default: 1 },
  },
  { _id: false }
);

const ResultSheetSchema = new mongoose.Schema(
  {
    schoolId:     { type: mongoose.Schema.Types.ObjectId, ref: 'School',           required: true, index: true },
    sheetId:      { type: mongoose.Schema.Types.ObjectId, ref: 'OasesAnswerSheet',  required: true, unique: true },
    examConfigId: { type: mongoose.Schema.Types.ObjectId, ref: 'OasesExamConfig',   required: true, index: true },
    anonymousCode:{ type: String, required: true, index: true },

    // ── Final marks breakdown ─────────────────────────────────────
    perQuestion:    { type: [PerQuestionResultSchema], default: [] },
    sectionTotals:  { type: mongoose.Schema.Types.Mixed, default: {} },  // { A:N, B:N, C:N, D:N }
    totalMarks:     { type: Number, required: true },
    marksObtained:  { type: Number, required: true },
    finalMarks:     { type: Number, required: true },   // alias kept for Sprint 6 API
    percentage:     { type: Number, required: true },
    isPassed:       { type: Boolean, required: true },

    // ── CBSE grading — A1|A2|B1|B2|C1|C2|D|E ────────────────────
    grade:          { type: String, default: null },

    // ── Ranking within exam (assigned by generateResults) ─────────
    rank:           { type: Number, default: null },

    // ── How many eval rounds were used ────────────────────────────
    evalRoundsUsed: { type: Number, default: 1 },

    // ── Conflict resolution record ────────────────────────────────
    hadConflict:    { type: Boolean, default: false },
    conflictNote:   { type: String,  default: '' },

    // ── Lock info ─────────────────────────────────────────────────
    lockedAt: { type: Date,                         required: true },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Post-publish: student identity (null until published) ──────
    rollNo:    { type: String, default: null, select: false },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null, select: false },

    // ── Export tracking ───────────────────────────────────────────
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date,    default: null },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────
ResultSheetSchema.index({ examConfigId: 1, anonymousCode: 1 });
ResultSheetSchema.index({ examConfigId: 1, finalMarks: -1 });   // Sprint 6: rank query
ResultSheetSchema.index({ examConfigId: 1, rank: 1 });

module.exports = mongoose.model('OasesResultSheet', ResultSheetSchema);
