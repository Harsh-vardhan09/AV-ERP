const mongoose = require('mongoose');
const { Schema } = mongoose;

const SalaryComponentSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['allowance', 'deduction', 'tax'],
      required: true,
    },
    category: {
      type: String,
      enum: ['fixed', 'percentage', 'statutory', 'variable'],
      required: true,
    },
    calculationBasis: {
      type: String,
    },
    defaultPercentage: {
      type: Number,
    },
    isStatutory: {
      type: Boolean,
      required: true,
    },
    isTaxable: {
      type: Boolean,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
SalaryComponentSchema.index({ schoolId: 1, code: 1 }, { unique: true });
SalaryComponentSchema.index({ schoolId: 1, type: 1 });

module.exports = mongoose.model('SalaryComponent', SalaryComponentSchema);
