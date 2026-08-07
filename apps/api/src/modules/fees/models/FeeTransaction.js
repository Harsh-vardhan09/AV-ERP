const mongoose = require('mongoose');

// ─── FeeTransaction Model ─────────────────────────────────────────────────────
// Used for FLEXIBLE fee cycle payments.
// Each payment is a separate transaction; fee is complete when SUM >= totalAssigned.

const feeTransactionSchema = new mongoose.Schema(
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
        amountPaid: {
            type: Number,
            required: true,
            min: [1, 'Payment must be at least ₹1'],
        },
        paymentMode: {
            type: String,
            enum: ['CASH', 'UPI', 'ONLINE', 'CHEQUE', 'DD', 'BANK_TRANSFER', 'OTHER'],
            default: 'CASH',
        },
        receiptNo: {
            type: String,
            index: true,
        },
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            index: true,
        },
        note: { type: String },
    },
    { timestamps: true }
);

feeTransactionSchema.index({ studentFeeId: 1, createdAt: -1 });

module.exports = mongoose.model('FeeTransaction', feeTransactionSchema);
