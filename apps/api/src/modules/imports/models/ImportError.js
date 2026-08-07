/**
 * ImportError Schema - Individual row errors from imports
 * Separated from ImportLog for performance (prevents huge arrays)
 * Allows efficient error analysis and reporting
 */

const mongoose = require('mongoose');

const importErrorSchema = new mongoose.Schema(
  {
    // Reference to the import
    importLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImportLog',
      required: true,
      index: true,
    },

    // Tenant scoping
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    entity: {
      type: String,
      enum: ['student', 'teacher', 'fee', 'attendance', 'class', 'section', 'subject', 'payroll', 'inventory'],
      required: true,
      index: true,
    },

    // Row information
    rowNumber: {
      type: Number,
      required: true,
    },
    rowData: mongoose.Schema.Types.Mixed, // Store the actual row data for context
    originalRow: String, // Raw row as string (for CSV)

    // Error details
    errorType: {
      type: String,
      enum: [
        'validation_error',
        'business_rule_violation',
        'duplicate_detected',
        'reference_not_found',
        'permission_denied',
        'system_error',
        'data_format_error',
        'missing_required_field',
        'invalid_enum_value',
        'formula_injection_detected',
        'malicious_payload_detected',
        'file_corruption_error',
      ],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['error', 'warning', 'info'],
      default: 'error',
    },

    // Field-level details
    field: String, // Which column had the error
    value: mongoose.Schema.Types.Mixed, // The value that caused the error
    expectedFormat: String, // What format was expected
    receivedFormat: String, // What format was received

    // Error message
    errorMessage: {
      type: String,
      required: true,
    },
    errorCode: String, // Standardized error code for i18n
    suggestedCorrection: String, // Helpful suggestion for fixing

    // Context for debugging
    validationRule: String, // Which validation rule failed
    businessRule: String, // Which business rule was violated
    duplicateKey: String, // What key caused the duplicate
    duplicateExistingId: mongoose.Schema.Types.ObjectId, // ID of existing duplicate record

    // Reference information (if applicable)
    relatedEntity: String, // e.g., 'class', 'section' for student imports
    relatedEntityId: mongoose.Schema.Types.ObjectId, // ID that couldn't be found

    // Resolution status
    resolved: Boolean,
    resolutionMethod: {
      type: String,
      enum: ['skipped', 'updated', 'corrected_and_reapplied', 'manual_intervention', 'auto_corrected'],
    },
    resolvedAt: Date,
    resolvedBy: mongoose.Schema.Types.ObjectId,
    resolutionNotes: String,

    // Soft delete tracking
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
    strict: 'throw',
    collection: 'importErrors',
  }
);

// Compound indexes for efficient querying
importErrorSchema.index({ importLogId: 1, rowNumber: 1 });
importErrorSchema.index({ schoolId: 1, entity: 1, errorType: 1 });
importErrorSchema.index({ importLogId: 1, severity: 1 });
importErrorSchema.index({ schoolId: 1, createdAt: -1 });

// TTL index to auto-delete old errors after 180 days
importErrorSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

// Static method to get error summary for an import
importErrorSchema.statics.getErrorSummary = async function (importLogId) {
  return this.aggregate([
    {
      $match: {
        importLogId: new mongoose.Types.ObjectId(importLogId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          errorType: '$errorType',
          severity: '$severity',
        },
        count: { $sum: 1 },
        examples: { $push: '$errorMessage' },
      },
    },
    {
      $group: {
        _id: '$_id.errorType',
        total: { $sum: '$count' },
        severity: { $first: '$_id.severity' },
        examples: { $first: { $slice: ['$examples', 3] } },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);
};

// Static method to get detailed error report
importErrorSchema.statics.getDetailedReport = async function (importLogId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const [errors, total] = await Promise.all([
    this.find(
      {
        importLogId: new mongoose.Types.ObjectId(importLogId),
        isDeleted: false,
      },
      {
        rowNumber: 1,
        field: 1,
        value: 1,
        errorMessage: 1,
        suggestedCorrection: 1,
        errorType: 1,
      }
    )
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({
      importLogId: new mongoose.Types.ObjectId(importLogId),
      isDeleted: false,
    }),
  ]);

  return {
    errors,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Instance method to mark as resolved
importErrorSchema.methods.markResolved = async function (method, resolvedBy, notes) {
  this.resolved = true;
  this.resolutionMethod = method;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = notes;
  return this.save();
};

module.exports = mongoose.model('ImportError', importErrorSchema);
