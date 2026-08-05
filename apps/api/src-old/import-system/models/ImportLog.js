/**
 * ImportLog Schema - Tracks every import operation
 * Provides complete audit trail for all imports with metadata and results
 * Multi-tenant scoped by schoolId
 */

const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema(
  {
    // Tenant & ownership
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Import metadata
    entity: {
      type: String,
      enum: ['student', 'teacher', 'fee', 'attendance', 'class', 'section', 'subject', 'payroll', 'inventory'],
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: Number, // bytes
    fileMimeType: String, // e.g. text/csv, application/vnd.openxmlformats
    uploadPath: String, // S3 or local path for audit
    templateUsed: String, // e.g., 'student_v1', 'teacher_v2' for profile tracking

    // Import settings
    duplicateMode: {
      type: String,
      enum: ['skip', 'update', 'stop'],
      default: 'skip',
    },
    validationStrictness: {
      type: String,
      enum: ['strict', 'moderate', 'lenient'],
      default: 'moderate',
    },
    autoAssignDefaults: Boolean, // For student: auto-assign fees, rollNo, etc.
    transformations: [String], // e.g., ['normalizePhoneNumber', 'convertDateFormat']

    // Import progress & results
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'partial', 'partially_completed'],
      default: 'pending',
      index: true,
    },
    totalRows: Number,
    processedRows: Number,
    successCount: Number,
    failureCount: Number,
    duplicateCount: Number,
    skippedCount: Number,
    warningCount: Number,

    // Timing
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
    duration: Number, // milliseconds
    processingBatch: Number, // Which batch this was processed in
    estimatedCompletion: Date, // For long-running imports

    // Results & reporting
    errorFileUrl: String, // URL to downloadable error report (CSV)
    warningFileUrl: String, // URL to downloadable warnings report
    successSummary: {
      byCategory: mongoose.Schema.Types.Mixed, // e.g., { 'class-A': 25, 'class-B': 30 }
      firstSuccess: Date,
      lastSuccess: Date,
    },
    failureSummary: {
      topErrors: [
        {
          errorType: String,
          count: Number,
          examples: [String],
        },
      ],
      firstFailure: Date,
      lastFailure: Date,
    },

    // Performance metrics
    metrics: {
      avgProcessingTimePerRow: Number, // ms
      memoryUsagePeak: Number, // bytes
      rowsPerSecond: Number,
      errorRate: Number, // percentage
    },

    // Rollback capability
    isReversible: Boolean, // Can this import be rolled back?
    reversedAt: Date,
    reversedBy: mongoose.Schema.Types.ObjectId, // User who reversed
    reversalReason: String,

    // Notes & metadata
    notes: String, // Admin notes about this import
    tags: [String], // For filtering/searching imports
    relatedImports: [mongoose.Schema.Types.ObjectId], // Reference to related imports (e.g., batch import)

    // Job tracking
    jobId: String, // Bull queue job ID for async processing
    workerId: String, // Which worker processed this
    queueRetries: Number,
    queueErrors: [String],

    // Soft delete tracking
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: mongoose.Schema.Types.ObjectId,
    archiveReason: String, // Why was this archived
  },
  {
    timestamps: true,
    strict: 'throw', // Strict mode for safety
    collection: 'importLogs',
  }
);

// Compound index for efficient querying
importLogSchema.index({ schoolId: 1, entity: 1, status: 1 });
importLogSchema.index({ schoolId: 1, uploadedBy: 1, createdAt: -1 });
importLogSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
importLogSchema.index({ jobId: 1 }, { sparse: true });

// TTL index for auto-deletion of old temp imports (adjust as needed)
importLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { status: 'pending' } } // 90 days for pending
);

// Pre-save hook to calculate duration
importLogSchema.pre('save', function (next) {
  if (this.completedAt && this.startedAt) {
    this.duration = this.completedAt - this.startedAt;
  }

  // Calculate error rate
  if (this.totalRows > 0) {
    this.metrics = this.metrics || {};
    this.metrics.errorRate = ((this.failureCount / this.totalRows) * 100).toFixed(2);
  }

  next();
});

// Static method to get import statistics for admin dashboard
importLogSchema.statics.getImportStats = async function (schoolId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        createdAt: { $gte: startDate },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$entity',
        totalImports: { $sum: 1 },
        totalRows: { $sum: '$totalRows' },
        totalSuccess: { $sum: '$successCount' },
        totalFailure: { $sum: '$failureCount' },
        avgDuration: { $avg: '$duration' },
        successRate: { $avg: '$metrics.errorRate' },
      },
    },
    {
      $sort: { totalImports: -1 },
    },
  ]);
};

// Instance method to get formatted results
importLogSchema.methods.getFormattedResults = function () {
  return {
    id: this._id,
    entity: this.entity,
    fileName: this.fileName,
    status: this.status,
    totalRows: this.totalRows,
    results: {
      success: this.successCount,
      failure: this.failureCount,
      duplicate: this.duplicateCount,
      skipped: this.skippedCount,
    },
    duration: `${(this.duration / 1000).toFixed(2)}s`,
    errorRate: `${this.metrics?.errorRate || 0}%`,
    uploadedAt: this.createdAt,
    errorFileUrl: this.errorFileUrl,
    warningFileUrl: this.warningFileUrl,
  };
};

module.exports = mongoose.model('ImportLog', importLogSchema);
