const mongoose = require('mongoose');

const reportCardMarkSchema = new mongoose.Schema(
  {
    reportCardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportCard',
      required: [true, 'Report card is required'],
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectMaster',
      index: true,
    },
    fa1_1: { type: Number, default: null, min: 0, max: 10 },
    fa1_2: { type: Number, default: null, min: 0, max: 10 },
    fa2_1: { type: Number, default: null, min: 0, max: 10 },
    fa2_2: { type: Number, default: null, min: 0, max: 10 },
    sa1:   { type: Number, default: null, min: 0, max: 80 },
    fa3_1: { type: Number, default: null, min: 0, max: 10 },
    fa3_2: { type: Number, default: null, min: 0, max: 10 },
    fa4_1: { type: Number, default: null, min: 0, max: 10 },
    fa4_2: { type: Number, default: null, min: 0, max: 10 },
    sa2:   { type: Number, default: null, min: 0, max: 80 },
    total: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      trim: true,
      default: 'E',
    },

    // Dynamic exam marks (new system)
    // Maps examId (string) → marksObtained (number). Replaces hardcoded FA/SA slots.
    dynamicMarks: {
      type: Map,
      of: Number,
      default: {},
    },
    dynamicTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    dynamicGrade: {
      type: String,
      trim: true,
      default: '',
    },

    isEdited: {
      type: Boolean,
      default: false,
      index: true,
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

reportCardMarkSchema.index({ reportCardId: 1, subject: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('ReportCardMark', reportCardMarkSchema);
