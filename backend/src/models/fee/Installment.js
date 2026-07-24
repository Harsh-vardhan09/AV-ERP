const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
    {
        studentFeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentFee',
            required: [true, 'Student fee reference is required'],
        },
        installmentNo: {
            type: Number,
            required: [true, 'Installment number is required'],
            min: [1, 'Installment number must be at least 1'],
        },
        dueDate: {
            type: Date,
            required: [true, 'Due date is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Installment amount is required'],
            min: [1, 'Amount must be positive'],
        },
        paidAmount: {
            type: Number,
            default: 0,
            min: [0, 'Paid amount cannot be negative'],
        },
        remainingAmount: {
            type: Number,
            min: [0, 'Remaining amount cannot be negative'],
        },
        fineAmount: {
            type: Number,
            default: 0,
            min: [0, 'Fine amount cannot be negative'],
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'partial', 'paid', 'overdue'],
                message: 'Status must be pending, partial, paid, or overdue',
            },
            default: 'pending',
        },
    },
    { timestamps: true }
);

installmentSchema.index({ studentFeeId: 1, status: 1 });
installmentSchema.index({ studentFeeId: 1, installmentNo: 1 });
installmentSchema.index({ dueDate: 1 });
installmentSchema.index({ status: 1, dueDate: 1 });
installmentSchema.index({ studentFeeId: 1, dueDate: 1 });

installmentSchema.pre('save', function (next) {
    if (this.isNew && (this.remainingAmount === undefined || this.remainingAmount === null)) {
        this.remainingAmount = this.amount;
    }
    next();
});

installmentSchema.virtual('isOverdue').get(function () {
    if (this.status === 'paid') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(this.dueDate);
    due.setHours(0, 0, 0, 0);
    return today > due;
});

module.exports = mongoose.model('Installment', installmentSchema);
