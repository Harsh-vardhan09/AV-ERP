const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Applicant is required']
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    required: [true, 'Role is required']
  },

  // Leave details
  leaveType: {
    type: String,
    enum: ['sick', 'casual', 'personal', 'other'],
    default: 'casual'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required']
  },

  // For student leaves — class/section context
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassModel'
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SectionModel'
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalRemarks: String,

  // Attachments
  documents: [String],

  // Multi-tenancy
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    index: true,
  },
}, { timestamps: true });

const Leave = mongoose.model('Leave', leaveSchema);
module.exports = Leave;