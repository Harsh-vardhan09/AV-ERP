const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  teacherid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectMaster',
    required: true
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
  photo: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'expired']
  },

  // ── Multi-tenancy ──────────────────────────────────────────────────────────
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School context is required'],
    index: true
  }
}, { timestamps: true });

// Scoped index: fast lookup of a teacher's assignments within their school
assignmentSchema.index({ schoolId: 1, teacherid: 1, createdAt: -1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;