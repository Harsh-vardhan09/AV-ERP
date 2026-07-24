const mongoose = require('mongoose');
const { Schema } = mongoose;

const PayslipSchema = new Schema(
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
      // Optional: set for batch payroll runs; null for ad-hoc individual payslips
      required: false,
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
    employeeSalaryId: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeSalary',
      required: true,
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    presentDays: { type: Number, required: true },
    absentDays: { type: Number, required: true },
    paidLeaves: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 },

    // Denormalized fields for reporting performance
    department: { type: String, index: true },
    employeeId: { type: String, index: true },

    // SNAPSHOTS (Full objects, not references)
    earnings: [
      {
        componentId: { type: Schema.Types.ObjectId, ref: 'SalaryComponent' },
        name: String,
        amount: Number,
      },
    ],
    deductions: [
      {
        componentId: { type: Schema.Types.ObjectId, ref: 'SalaryComponent' },
        name: String,
        amount: Number,
      },
    ],

    grossEarnings: { type: Number, required: true },
    totalDeductions: { type: Number, required: true },
    netPayable: { type: Number, required: true },

    // STATUTORY BREAKDOWN
    tdsAmount: { type: Number, required: true, default: 0 },
    pfEmployeeAmount: { type: Number, required: true, default: 0 },
    pfEmployerAmount: { type: Number, required: true, default: 0 },
    esiApplicable: { type: Boolean, required: true, default: false },
    esiEmployeeAmount: { type: Number, required: true, default: 0 },
    esiEmployerAmount: { type: Number, required: true, default: 0 },

    paymentStatus: {
      type: String,
      enum: ['pending', 'processed', 'failed'],
      required: true,
      default: 'pending',
    },
    pdfUrl: String,
    pdfGeneratedAt: Date,
    status: {
      type: String,
      enum: ['draft', 'finalised', 'sent', 'cancelled'],
      required: true,
      default: 'draft',
    },
  },
  { timestamps: true }
);

// CRITICAL: Prevent duplicate payslips for same teacher in same period
PayslipSchema.index({ schoolId: 1, teacherId: 1, month: 1, year: 1 }, { unique: true });
PayslipSchema.index({ schoolId: 1, month: 1, year: 1 });
PayslipSchema.index({ schoolId: 1, status: 1 });

module.exports = mongoose.model('Payslip', PayslipSchema);
