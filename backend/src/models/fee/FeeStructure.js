const mongoose = require('mongoose');

const feeComponentSchema = new mongoose.Schema(
    {
        feeHeadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeHead',
            required: [true, 'Fee head is required'],
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative'],
        },
    },
    { _id: false }
);

const customInstallmentSchema = new mongoose.Schema(
    {
        installmentNo: { type: Number, required: true, min: 1 },
        dueDate: { type: Date, required: true },
        amount: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const feeStructureSchema = new mongoose.Schema(
    {
        // Uses SCHOOL_ERP's AcademicSession
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AcademicSession',
            required: [true, 'Session is required'],
            index: true,
        },

        // Uses SCHOOL_ERP's ClassModel (ObjectId ref, not a string)
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ClassModel',
            required: [true, 'Class is required'],
            index: true,
        },

        feeComponents: {
            type: [feeComponentSchema],
            validate: {
                validator: v => Array.isArray(v) && v.length > 0,
                message: 'At least one fee component is required',
            },
        },

        totalAmount: {
            type: Number,
            default: 0,
            min: [0, 'Total amount cannot be negative'],
        },

        feeCycle: {
            type: String,
            enum: {
                values: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM', 'FLEXIBLE', 'THREE_INSTALLMENT'],
                message: 'feeCycle must be MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY, CUSTOM, FLEXIBLE, or THREE_INSTALLMENT',
            },
            default: 'CUSTOM',
        },

        // THREE_INSTALLMENT: exactly 3 due dates (stored at structure level)
        threeInstallmentDates: {
            type: [Date],
            default: [],
            validate: {
                validator: function (v) {
                    if (this.feeCycle !== 'THREE_INSTALLMENT') return true;
                    return Array.isArray(v) && v.length === 3;
                },
                message: 'THREE_INSTALLMENT cycle requires exactly 3 due dates',
            },
        },

        dueDayOfMonth: {
            type: Number,
            min: [1, 'Due day must be at least 1'],
            max: [28, 'Due day must not exceed 28'],
        },

        installmentCount: {
            type: Number,
            min: [1, 'Installment count must be at least 1'],
            max: [60, 'Installment count cannot exceed 60'],
        },

        customInstallments: {
            type: [customInstallmentSchema],
            default: [],
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        // Stream: only applicable for Class 11th & 12th
        // null / '' = all other classes, 'Science' | 'Commerce' | 'Arts' = senior secondary
        stream: {
            type: String,
            enum: ['Science', 'Commerce', 'Arts', null, ''],
            default: null,
        },

        // Multi-tenancy
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

feeStructureSchema.index({ createdAt: -1 });
// One structure per class per session per school per stream (stream=null for classes 1-10)
feeStructureSchema.index({ sessionId: 1, classId: 1, schoolId: 1, stream: 1 }, { unique: true, sparse: false });
feeStructureSchema.index({ sessionId: 1, isActive: 1 });

feeStructureSchema.pre('save', function (next) {
    this.totalAmount = this.feeComponents.reduce((sum, comp) => sum + comp.amount, 0);
    next();
});

feeStructureSchema.virtual('componentCount').get(function () {
    return this.feeComponents.length;
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
