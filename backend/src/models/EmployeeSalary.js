const mongoose = require('mongoose');
const { Schema } = mongoose;

const EmployeeSalarySchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    salaryStructureId: {
      type: Schema.Types.ObjectId,
      ref: 'SalaryStructure',
      required: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: true,
    },
    componentOverrides: [
      {
        componentId: {
          type: Schema.Types.ObjectId,
          ref: 'SalaryComponent',
        },
        fixedAmount: {
          type: Number,
        },
        percentage: {
          type: Number,
        },
      },
    ],
    annualCTC: {
      type: Number,
      required: true,
    },
    monthlyGross: {
      type: Number,
      required: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: {
      type: Date,
    },
    revisionReason: {
      type: String,
    },
    revisedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// Indexes
EmployeeSalarySchema.index({ schoolId: 1, teacherId: 1, isActive: 1 });

module.exports = mongoose.model('EmployeeSalary', EmployeeSalarySchema);
