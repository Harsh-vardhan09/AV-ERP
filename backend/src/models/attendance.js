const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  // null when attendanceType = 'hall'
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubjectMaster',
    default: null
  },
  attendanceType: {
    type: String,
    enum: ['subject', 'hall'],
    default: 'subject'
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: [true, 'Academic session is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  takenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher (taken by) is required']
  },
  // Multi-tenancy
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School context is required'],
    index: true
  },
  records: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'leave'],
      required: true
    },
    // If the student is on approved leave, store the leaveId
    leaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leave',
      default: null
    }
  }]
}, { timestamps: true });

// Index for efficient querying (duplicate prevention handled in application logic)
attendanceSchema.index(
  { schoolId: 1, classId: 1, sectionId: 1, date: 1, attendanceType: 1 }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
