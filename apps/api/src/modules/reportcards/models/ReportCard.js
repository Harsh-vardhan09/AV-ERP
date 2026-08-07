const mongoose = require('mongoose');

const reportCardSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: [true, 'Student is required'],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassModel',
      required: [true, 'Class is required'],
      index: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
      index: true,
    },
    rank: {
      type: String,
      trim: true,
      default: '',
    },
    remarksTerm1: {
      type: String,
      trim: true,
      default: '',
    },
    remarksTerm2: {
      type: String,
      trim: true,
      default: '',
    },
    healthTerm1: {
      height: { type: String, trim: true, default: '' },
      weight: { type: String, trim: true, default: '' },
    },
    healthTerm2: {
      height: { type: String, trim: true, default: '' },
      weight: { type: String, trim: true, default: '' },
    },
    isFinalized: {
      type: Boolean,
      default: false,
      index: true,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    unlockedAt: {
      type: Date,
      default: null,
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      index: true,
      required: [true, 'School context is required'],
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

reportCardSchema.index({ studentId: 1, session: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('ReportCard', reportCardSchema);

