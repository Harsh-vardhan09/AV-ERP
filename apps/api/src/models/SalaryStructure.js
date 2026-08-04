const mongoose = require('mongoose');
const { Schema } = mongoose;

const SalaryStructureSchema = new Schema(
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
    grade: {
      type: String,
      trim: true,
      default: '',
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: true,
    },
    components: [
      {
        componentId: {
          type: Schema.Types.ObjectId,
          ref: 'SalaryComponent',
          required: true,
        },
        fixedAmount: {
          type: Number,
          default: 0,
        },
        percentage: {
          type: Number,
          default: 0,
        },
        isOverridable: {
          type: Boolean,
          default: false,
        },
      },
    ],
    applicableTo: {
      type: String,
      enum: ['teaching', 'non-teaching', 'contract', 'all'],
      required: true,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Compound unique: no two structures with the same name per school per academic year
SalaryStructureSchema.index({ schoolId: 1, name: 1, academicYearId: 1 }, { unique: true });

module.exports = mongoose.model('SalaryStructure', SalaryStructureSchema);
