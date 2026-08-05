const mongoose = require('mongoose');

const DOC_TYPES = ['TC', 'MIGRATION'];

const schoolCertificateSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentProfile',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: DOC_TYPES,
    required: true
  },
  certificateNumber: {
    type: String,
    trim: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentTemplate',
    default: null
  },
  templateVersion: {
    type: Number,
    default: null
  },
  /** Editable certificate fields (student lines, dates, reason, etc.) */
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  /** Original generated data from template before manual edits */
  originalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  /** Current editable/final state data */
  editedData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  /** Frozen school header block copied from School (and admin tweaks while unlocked) */
  schoolSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: { type: Date },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  finalizedSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  generatedPdfPath: {
    type: String,
    default: ''
  },
  generatedPdfMimeType: {
    type: String,
    default: 'application/pdf'
  },
  auditLogs: [{
    action: {
      type: String,
      enum: ['CREATE', 'GENERATE', 'UPDATE', 'LOCK', 'UNLOCK', 'DOWNLOAD'],
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    at: {
      type: Date,
      default: Date.now
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }]
}, { timestamps: true });

schoolCertificateSchema.index({ schoolId: 1, studentId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('SchoolCertificate', schoolCertificateSchema);
module.exports.DOC_TYPES = DOC_TYPES;
