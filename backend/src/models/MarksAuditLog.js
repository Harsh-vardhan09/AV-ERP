const mongoose = require('mongoose');

const marksAuditLogSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam is required']
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassModel',
    required: [true, 'Class is required']
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SectionModel',
    required: [true, 'Section is required']
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectMaster',
    required: [true, 'Subject is required']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  // ── EXAM_CONTROLLER audit fields ──────────────────────────────────────────
  // Tracks whether marks were entered by a teacher or by the exam_controller
  // role (via MARKS_ALL_ACCESS permission bypass). Added non-destructively;
  // existing records without this field simply omit it.
  uploadedByRole: {
    type: String,
    enum: ['teacher', 'exam_controller', 'admin'],
    default: 'teacher',
  },
  uploadMethod: {
    type: String,
    enum: ['manual', 'excel', 'manual_dynamic', 'excel_dynamic'],
    required: [true, 'Upload method is required']
  },
  studentCount: {
    type: Number,
    required: [true, 'Student count is required']
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: [true, 'Academic session is required']
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    index: true,
    required: [true, 'School context is required']
  }
}, { timestamps: true });

module.exports = mongoose.model('MarksAuditLog', marksAuditLogSchema);
