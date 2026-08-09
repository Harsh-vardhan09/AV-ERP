const mongoose = require('mongoose');

const knowledgecenterSchema = new mongoose.Schema({
  teacherid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherName: { type: String },  // denormalized for quick display
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },

  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectMaster',
    default: null       // null when "Other" is selected
  },
  customSubjectName: {  // filled when subjectId is null
    type: String,
    trim: true
  },

  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassModel',
    required: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SectionModel',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: true
  },

  fileUrl: { type: String, required: true },
  fileType: { type: String },  // 'pdf', 'doc', 'image', etc.

  // View tracking — array of studentProfile IDs who opened this
  views: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile' },
    viewedAt: { type: Date, default: Date.now }
  }],

  // Multi-tenancy
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School context is required'],
    index: true
  }

}, { timestamps: true });

// Scoped index for teacher material listing
knowledgecenterSchema.index({ schoolId: 1, teacherid: 1, createdAt: -1 });

// Virtual: subject display name
knowledgecenterSchema.virtual('subjectDisplay').get(function () {
  return this.customSubjectName || this.subjectId?.name || 'Other';
});

const Knowledgecenter = mongoose.model('Knowledgecenter', knowledgecenterSchema);
module.exports = Knowledgecenter;
