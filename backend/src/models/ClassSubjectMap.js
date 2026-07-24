const mongoose = require('mongoose');

const classSubjectMapSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassModel',
    required: [true, 'Class is required']
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectMaster',
    required: [true, 'Subject is required']
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: [true, 'Academic session is required']
  },

  // Multi-tenancy
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    index: true,
  },
}, { timestamps: true });

// Subject mapped once per class+session+school
classSubjectMapSchema.index({ classId: 1, subjectId: 1, session: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('ClassSubjectMap', classSubjectMapSchema);
