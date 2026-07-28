const mongoose = require('mongoose');

// ─── FeeReceipt Model ─────────────────────────────────────────────────────────
// Unified receipt store for FLEXIBLE and THREE_INSTALLMENT payments.
// Receipt no format: REC-<YEAR>-<000001> (6-digit zero-padded, auto-incremented).

const receiptCounterSchema = new mongoose.Schema({
    year:    { type: Number, required: true, unique: true },
    counter: { type: Number, default: 0 },
});
const ReceiptCounter = mongoose.model('ReceiptCounter', receiptCounterSchema);

const feeReceiptSchema = new mongoose.Schema(
    {
        receiptNo: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
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
        },
        feeStructureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeStructure',
        },
        amount: {
            type: Number,
            required: true,
            min: [1, 'Receipt amount must be at least ₹1'],
        },
        paymentMode: {
            type: String,
            enum: ['CASH', 'UPI', 'ONLINE', 'CHEQUE', 'DD', 'BANK_TRANSFER', 'OTHER'],
            default: 'CASH',
        },
        // 'FLEXIBLE' | 'THREE_INSTALLMENT'
        paymentType: {
            type: String,
            enum: ['FLEXIBLE', 'THREE_INSTALLMENT'],
            required: true,
        },
        // Reference to FeeTransaction._id or ThreeInstallment._id
        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
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

feeReceiptSchema.index({ studentId: 1, createdAt: -1 });
feeReceiptSchema.index({ paymentType: 1 });

// ─── Static: generate next receipt number ─────────────────────────────────────
feeReceiptSchema.statics.generateReceiptNo = async function () {
    const year = new Date().getFullYear();
    const updated = await ReceiptCounter.findOneAndUpdate(
        { year },
        { $inc: { counter: 1 } },
        { upsert: true, new: true }
    );
    const padded = String(updated.counter).padStart(6, '0');
    return `REC-${year}-${padded}`;
};

const FeeReceipt = mongoose.model('FeeReceipt', feeReceiptSchema);
module.exports = { FeeReceipt, ReceiptCounter };
