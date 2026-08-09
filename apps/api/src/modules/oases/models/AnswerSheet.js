// OASES Model — AnswerSheet
// One document per scanned/uploaded answer sheet.
// CRITICAL: rollNo/studentName NEVER stored here (anonymity rule).
const mongoose = require('mongoose');
const { SHEET_STATUS, PROCESSING_STATUS } = require('../lib/constants');

const AnswerSheetSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    // NOTE: examConfigId references the unified Exam model (not OasesExamConfig).
    // The ref 'Exam' is used for any future populate() calls on this field.
    examConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },

    // Anonymisation
    // anonymousCode is the ONLY identifier visible to evaluators.
    // Mapping to actual student lives in a separate locked record
    // managed only by SCHOOL_ADMIN. Never returned in eval APIs.
    anonymousCode: { type: String, required: true, unique: true, index: true },

    // rollNo stored pre-anonymisation (admin lookup only)
    // After processing: rollNo is nulled, rollNoEncrypted holds AES-256-GCM ciphertext
    rollNo:          { type: String, default: null, select: false }, // scrubbed post-process
    rollNoEncrypted: { type: String, default: null, select: false }, // never in eval APIs

    // S3 / Local Storage
    // originalFilePath: path to the uploaded PDF (local disk Sprint 2, S3 key Sprint 3)
    originalFilePath: { type: String, default: null },
    // pageImages: ordered list of page image paths (local Sprint 2, S3 keys Sprint 3)
    pageImages: { type: [String], default: [] },

    // Legacy S3 keys (kept from Sprint 0 for BC)
    s3Keys: { type: [String], default: [] },   // ['oases/sheets/<id>/page-1.jpg', ...]
    totalPages: { type: Number, default: 0 },

    // Set
    set: { type: String, default: 'single' },  // A/B/C/D or 'single'

    // Status Lifecycle
    status: {
      type: String,
      enum: Object.values(SHEET_STATUS),
      default: SHEET_STATUS.UPLOADED,
      index: true,
    },

    // Processing (PDF → images pipeline)
    processingStatus: {
      type: String,
      enum: Object.values(PROCESSING_STATUS),
      default: PROCESSING_STATUS.PENDING,
    },
    processingError: { type: String, default: null },

    // Upload metadata
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalFilename: { type: String, default: '' },
    fileSizeBytes:    { type: Number, default: 0 },

    // Routing metadata (set at upload, used by auto-assign)
    classId:   { type: mongoose.Schema.Types.ObjectId, ref: 'ClassModel',    default: null },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SectionModel',  default: null },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectMaster', default: null },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',          default: null },

    // Evaluation tracking
    eval1AssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    eval2AssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    headAssignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    eval1CompletedAt: { type: Date, default: null },
    eval2CompletedAt: { type: Date, default: null },
    headCompletedAt:  { type: Date, default: null },

    // Flags
    isUfmFlagged:   { type: Boolean, default: false },
    ufmNote:        { type: String, default: '' },
    isRejected:     { type: Boolean, default: false },
    rejectionNote:  { type: String, default: '' },

    // Final lock
    isLocked:  { type: Boolean, default: false },
    finalMarks: { type: Number, default: null },   // grand total set at lock time
    lockedAt:  { type: Date, default: null },
    lockedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

AnswerSheetSchema.index({ examConfigId: 1, status: 1 });
AnswerSheetSchema.index({ eval1AssignedTo: 1, status: 1 });
AnswerSheetSchema.index({ eval2AssignedTo: 1, status: 1 });

module.exports = mongoose.model('OasesAnswerSheet', AnswerSheetSchema);
