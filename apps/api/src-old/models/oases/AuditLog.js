// ══════════════════════════════════════════════════════════════════
// OASES Model — AuditLog (APPEND-ONLY)
// ABSOLUTE RULE: No update, no delete — INSERT ONLY.
// Tracks every significant action in OASES for compliance.
// ══════════════════════════════════════════════════════════════════
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    // What entity was affected
    entityType: {
      type: String,
      required: true,
      enum: [
        'ExamConfig',
        'QuestionScheme',
        'AnswerSheet',
        'EvaluationMark',
        'EvaluatorAssignment',
        'ResultSheet',
        'Notification',
        'System',
      ],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Actor who performed the action
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorRole: { type: String, required: true }, // OASES role at time of action

    // Action description
    action: { type: String, required: true },     // e.g. 'SHEET_UPLOADED', 'MARKS_SUBMITTED'
    details: { type: mongoose.Schema.Types.Mixed, default: {} }, // arbitrary payload

    // Request metadata for traceability
    ipAddress: { type: String, default: '' },
    userAgent:  { type: String, default: '' },
  },
  {
    // createdAt only — no updatedAt needed for immutable log
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Prevent any updates or deletes at Mongoose level ─────────────
AuditLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('AuditLog is immutable. Use insertOne/create only.');
});
AuditLogSchema.pre('updateOne', function () {
  throw new Error('AuditLog is immutable. Use insertOne/create only.');
});
AuditLogSchema.pre('updateMany', function () {
  throw new Error('AuditLog is immutable. Bulk updates are not permitted.');
});
AuditLogSchema.pre('deleteOne', function () {
  throw new Error('AuditLog is immutable. Records cannot be deleted.');
});
AuditLogSchema.pre('deleteMany', function () {
  throw new Error('AuditLog is immutable. Bulk deletes are not permitted.');
});
AuditLogSchema.pre('findOneAndDelete', function () {
  throw new Error('AuditLog is immutable. Records cannot be deleted.');
});

AuditLogSchema.index({ schoolId: 1, entityType: 1, entityId: 1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });

module.exports = mongoose.model('OasesAuditLog', AuditLogSchema);
