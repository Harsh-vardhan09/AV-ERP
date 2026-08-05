const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema(
    {
        studentFeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentFee',
            required: [true, 'Student fee reference is required'],
            index: true,
        },
        type: {
            type: String,
            enum: {
                values: ['debit', 'credit'],
                message: 'Type must be either debit or credit',
            },
            required: [true, 'Transaction type is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0.01, 'Amount must be greater than zero'],
        },
        fineAmount: {
            type: Number,
            default: 0,
            min: [0, 'Fine amount cannot be negative'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [300, 'Description must not exceed 300 characters'],
        },
        referenceId: {
            type: mongoose.Schema.Types.ObjectId,
            index: true,
        },
        referenceModel: {
            type: String,
            enum: ['Payment', 'Installment', 'FeeStructure', 'Refund'],
        },
        balance: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

ledgerSchema.index({ createdAt: -1 });
ledgerSchema.index({ studentFeeId: 1, createdAt: -1 });
ledgerSchema.index({ studentFeeId: 1, type: 1 });
ledgerSchema.index({ studentFeeId: 1, type: 1, createdAt: -1 });
ledgerSchema.index({ referenceId: 1, referenceModel: 1 });

ledgerSchema.virtual('transactionLabel').get(function () {
    return this.type === 'credit'
        ? `Payment received: ₹${this.amount}`
        : `Charge applied: ₹${this.amount}`;
});

ledgerSchema.pre('save', async function (next) {
    if (this.referenceId && this.referenceModel) {
        const LedgerModel = this.constructor;
        const duplicate = await LedgerModel.findOne({
            studentFeeId: this.studentFeeId,
            referenceId: this.referenceId,
            referenceModel: this.referenceModel,
            type: this.type,
        });
        if (duplicate) {
            return next(new Error('Duplicate ledger entry for this reference'));
        }
    }
    next();
});

module.exports = mongoose.model('LedgerEntry', ledgerSchema);
