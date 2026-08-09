const mongoose = require('mongoose');

const classTeacherAssignmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassModel',
      required: [true, 'Class is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SectionModel',
      required: [true, 'Section is required'],
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

// One class teacher per class+section+session per school
classTeacherAssignmentSchema.index(
  { classId: 1, sectionId: 1, session: 1, schoolId: 1 },
  { unique: true }
);

module.exports = mongoose.model('ClassTeacherAssignment', classTeacherAssignmentSchema);
