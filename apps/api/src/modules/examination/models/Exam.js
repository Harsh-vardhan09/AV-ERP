const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exam name is required'],
      trim: true,
      // e.g. "Half Yearly Exam", "Unit Test 1"
    },
    type: {
      type: String,
      enum: ['unit_test', 'quarterly', 'half_yearly', 'pre_board', 'annual', 'custom'],
      required: [true, 'Exam type is required'],
    },
    description: {
      type: String,
      trim: true,
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
    },
    // Multi-class support: array of class IDs
    classIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassModel',
      },
    ],
    evaluationStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    evaluationLocked: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed'],
      default: 'upcoming',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    createdByRole: {
      type: String,
      enum: ['admin', 'teacher'],
      required: [true, 'Creator role is required'],
    },

    // Optional: link a report template to this exam
    // If set, teacher UI will use this template's fields instead of the school default
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      default: null,
    },

    // Multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      index: true,
      required: [true, 'School context is required'],
    },
  },
  { timestamps: true }
);

examSchema
  .path('classIds')
  .validate(
    (classIds) => Array.isArray(classIds) && classIds.length > 0,
    'At least one class is required'
  );

examSchema.index({ schoolId: 1, session: 1, classIds: 1 });

module.exports = mongoose.model('Exam', examSchema);
