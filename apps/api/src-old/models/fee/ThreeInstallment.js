const mongoose = require('mongoose');

// ─── ThreeInstallment Model ───────────────────────────────────────────────────
// One record per installment per student for THREE_INSTALLMENT fee cycle.
// Each student assigned a THREE_INSTALLMENT structure gets exactly 3 records.

const threeInstallmentSchema = new mongoose.Schema(
    {
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentProfile',
            required: true,
            index: true,
        },
        studentFeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentFee',
            required: true,
            index: true,
        },
        feeStructureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeStructure',
            required: true,
        },
        installmentNo: {
            type: Number,
            enum: [1, 2, 3],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [1, 'Installment amount must be at least ₹1'],
        },
        dueDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['UNPAID', 'PAID', 'OVERDUE'],
            default: 'UNPAID',
        },
        paidOn: { type: Date },
        receiptNo: { type: String },
        paymentMode: {
            type: String,
            enum: ['CASH', 'UPI', 'ONLINE', 'CHEQUE', 'DD', 'BANK_TRANSFER', 'OTHER'],
            default: 'CASH',
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            index: true,
        },
    },
    { timestamps: true }
);

// One installment per (student, feeStructure, installmentNo)
threeInstallmentSchema.index(
    { studentId: 1, feeStructureId: 1, installmentNo: 1 },
    { unique: true }
);
threeInstallmentSchema.index({ studentFeeId: 1, installmentNo: 1 });

module.exports = mongoose.model('ThreeInstallment', threeInstallmentSchema);
