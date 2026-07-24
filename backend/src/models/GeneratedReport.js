const mongoose = require('mongoose');

const generatedReportSchema = new mongoose.Schema(
  {
    // Report identification
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    
    // Student information (denormalized for audit)
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
      index: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    scholarNo: String,
    rollNo: String,
    className: String,
    sectionName: String,
    
    // Template used
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      required: true,
    },
    templateName: {
      type: String,
      required: true,
    },
    
    // Academic context
    academicYear: {
      type: String,
      required: true,
      index: true,
    },
    examType: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: true,
    },
    
    // File information
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileUrl: {
      type: String,
    },
    
    // Generation metadata
    generationTime: {
      type: Number, // milliseconds
      default: 0,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    generatedByName: String,
    
    // IP address for audit
    ipAddress: String,
    userAgent: String,
    
    // Data snapshot (for reproducibility)
    dataSnapshot: {
      subjects: [{
        name: String,
        theory: Number,
        project: Number,
        total: Number,
        grade: String,
      }],
      grandTotal: Number,
      totalPercentage: Number,
      totalGrade: String,
      rank: Number,
    },
    
    // Missing fields during generation
    missingFields: [{
      type: String,
    }],
    
    // Status
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed', 'deleted'],
      default: 'generating',
      index: true,
    },
    
    // Error information (if failed)
    errorMessage: String,
    errorStack: String,
    
    // Access tracking
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadedAt: Date,
    lastDownloadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deleteReason: String,
    
    // Multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School context is required'],
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes for common queries
generatedReportSchema.index({ schoolId: 1, studentId: 1, academicYear: 1 });
generatedReportSchema.index({ schoolId: 1, academicYear: 1, examType: 1 });
generatedReportSchema.index({ schoolId: 1, generatedAt: -1 });
generatedReportSchema.index({ schoolId: 1, templateId: 1 });
generatedReportSchema.index({ schoolId: 1, status: 1, isDeleted: 1 });

// Compound index for unique reports per student per exam
generatedReportSchema.index(
  { schoolId: 1, studentId: 1, academicYear: 1, examType: 1, templateId: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('GeneratedReport', generatedReportSchema);
