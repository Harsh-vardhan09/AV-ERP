const mongoose = require('mongoose');

const subjectMasterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['core', 'elective'],
      default: 'core',
    },

    // Multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      index: true,
    },
  },
  { timestamps: true }
);

// Subject code unique within a school
subjectMasterSchema.index({ code: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('SubjectMaster', subjectMasterSchema);
