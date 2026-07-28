const mongoose = require('mongoose');
const { Schema } = mongoose;

const PayrollSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: true,
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'processing', 'processed', 'approved', 'locked', 'cancelled'],
      required: true,
      default: 'draft',
    },
    totalEmployees: {
      type: Number,
      required: true,
      default: 0,
    },
    totalGross: {
      type: Number,
      required: true,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      required: true,
      default: 0,
    },
    totalNet: {
      type: Number,
      required: true,
      default: 0,
    },
    totalTax: {
      type: Number,
      required: true,
      default: 0,
    },
    workingDays: {
      type: Number,
      required: true,
    },
    processingNotes: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    lockedAt: {
      type: Date,
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// CRITICAL: Unique constraint per school per month/year
PayrollSchema.index({ schoolId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', PayrollSchema);
