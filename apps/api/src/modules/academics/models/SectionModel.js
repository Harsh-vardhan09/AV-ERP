const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassModel',
      required: [true, 'Class is required'],
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
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

// Section name unique within class + session + school
sectionSchema.index({ name: 1, classId: 1, session: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('SectionModel', sectionSchema);
