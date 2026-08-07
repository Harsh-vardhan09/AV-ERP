// OASES Model — EvaluatorAssignment
// Links an evaluator to a batch of answer sheets for a given round.
const mongoose = require('mongoose');
const { EVAL_ROUNDS } = require('../lib/constants');

const EvaluatorAssignmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    examConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OasesExamConfig',
      required: true,
      index: true,
    },
    evaluatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    round: {
      type: Number,
      enum: Object.values(EVAL_ROUNDS),
      required: true,
    },

    // Sheets assigned to this evaluator for this round
    sheetIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OasesAnswerSheet',
      },
    ],

    // Daily limit (copied from ExamConfig at assignment time)
    dailyLimit: { type: Number, default: 20 },

    // Completion tracking
    totalAssigned:  { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedAt:  { type: Date, default: Date.now },
    deadlineDate: { type: Date, default: null },
  },
  { timestamps: true }
);

// One assignment record per (examConfig + evaluator + round)
EvaluatorAssignmentSchema.index(
  { examConfigId: 1, evaluatorId: 1, round: 1 },
  { unique: true }
);

module.exports = mongoose.model('OasesEvaluatorAssignment', EvaluatorAssignmentSchema);
