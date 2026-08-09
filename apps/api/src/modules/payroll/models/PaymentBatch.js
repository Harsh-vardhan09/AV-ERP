const mongoose = require('mongoose');
const { Schema } = mongoose;

const PaymentBatchSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    payrollId: {
      type: Schema.Types.ObjectId,
      ref: 'Payroll',
      required: true,
      index: true,
    },
    batchDate: {
      type: Date,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    employeeCount: {
      type: Number,
      required: true,
      default: 0,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileGeneratedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['generated', 'submitted', 'cancelled'],
      required: true,
      default: 'generated',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries by school + payroll
PaymentBatchSchema.index({ schoolId: 1, payrollId: 1 });

module.exports = mongoose.model('PaymentBatch', PaymentBatchSchema);
