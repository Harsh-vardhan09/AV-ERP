const mongoose = require('mongoose');

const studentFeeSchema = new mongoose.Schema(
    {
        // Refs StudentProfile (SCHOOL_ERP model, not User directly)
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentProfile',
            required: [true, 'Student is required'],
        },

        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AcademicSession',
            required: [true, 'Session is required'],
        },

        feeStructureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeStructure',
            required: [true, 'Fee structure is required'],
        },

        totalAssigned: {
            type: Number,
            required: [true, 'Total assigned amount is required'],
            min: [0, 'Total assigned cannot be negative'],
        },

        totalPaid: {
            type: Number,
            default: 0,
            min: [0, 'Total paid cannot be negative'],
        },

        totalDue: {
            type: Number,
            default: 0,
            min: [0, 'Total due cannot be negative'],
        },

        totalFine: {
            type: Number,
            default: 0,
            min: [0, 'Total fine cannot be negative'],
        },

        // Previous session arrears (manually entered by admin)
        previousDues: {
            type: Number,
            default: 0,
            min: [0, 'Previous dues cannot be negative'],
        },

        // Admission fee component (separate from annual fee)
        admissionFee: {
            type: Number,
            default: 0,
            min: [0, 'Admission fee cannot be negative'],
        },

        status: {
            type: String,
            enum: {
                values: ['pending', 'partial', 'paid'],
                message: 'Status must be pending, partial, or paid',
            },
            default: 'pending',
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

// One fee record per student per session per school
studentFeeSchema.index({ studentId: 1, sessionId: 1, schoolId: 1 }, { unique: true });
studentFeeSchema.index({ studentId: 1 });
studentFeeSchema.index({ sessionId: 1 });
studentFeeSchema.index({ sessionId: 1, status: 1 });
studentFeeSchema.index({ status: 1 });

studentFeeSchema.virtual('outstandingBalance').get(function () {
    return Math.max(0, this.totalAssigned - this.totalPaid);
});

studentFeeSchema.pre('save', function (next) {
    this.totalDue = Math.max(0, this.totalAssigned - this.totalPaid + (this.previousDues || 0));
    if (this.totalPaid <= 0 && !(this.previousDues > 0)) {
        this.status = 'pending';
    } else if (this.totalPaid >= this.totalAssigned && !(this.previousDues > 0)) {
        this.status = 'paid';
        this.totalDue = 0;
    } else {
        this.status = 'partial';
    }
    next();
});

module.exports = mongoose.model('StudentFee', studentFeeSchema);
