const mongoose = require("mongoose");

// ─── AccountFee Model ─────────────────────────────────────────────────────────
//
// Generic replacement for "StudentFee" — tracks fee obligations for any
// account holder entity (student, employee, member, customer, etc.)
//
// Renamed from: StudentFee
// Key changes:
//   - studentId  → accountHolderId (plain ObjectId, no User ref)
//   - sessionId  → billingPeriodId (ref: BillingPeriod)
//   - All financial logic and pre-save hooks preserved

const accountFeeSchema = new mongoose.Schema(
    {
        // ─── The entity paying fees ────────────────────────────────────────────
        // Plain ObjectId — host system resolves to its own entity model.
        // No ref: "User" — this module has no knowledge of what an account holder is.
        accountHolderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Account holder is required"],
        },

        billingPeriodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BillingPeriod",
            required: [true, "Billing period is required"],
        },

        feeStructureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "FeeStructure",
            required: [true, "Fee structure is required"],
        },

        // ─── Fee Amounts ───────────────────────────────────────────────────────

        // Total fee assigned for this billing period
        totalAssigned: {
            type: Number,
            required: [true, "Total assigned amount is required"],
            min: [0, "Total assigned cannot be negative"],
        },

        // Increases with every payment received
        totalPaid: {
            type: Number,
            default: 0,
            min: [0, "Total paid cannot be negative"],
        },

        // Derived in pre-save: totalAssigned - totalPaid
        // Stored for fast querying — always kept in sync by hook
        totalDue: {
            type: Number,
            default: 0,
            min: [0, "Total due cannot be negative"],
        },

        // Cumulative fine charged across all payments
        totalFine: {
            type: Number,
            default: 0,
            min: [0, "Total fine cannot be negative"],
        },

        // ─── Status ───────────────────────────────────────────────────────────
        status: {
            type: String,
            enum: {
                values: ["pending", "partial", "paid"],
                message: "Status must be pending, partial, or paid",
            },
            default: "pending",
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Prevent duplicate fee assignment for same account holder in same billing period
accountFeeSchema.index({ accountHolderId: 1, billingPeriodId: 1 }, { unique: true });

// Fast lookup by accountHolderId
accountFeeSchema.index({ accountHolderId: 1 });

// Session-scoped queries for reports
accountFeeSchema.index({ billingPeriodId: 1 });
accountFeeSchema.index({ billingPeriodId: 1, status: 1 });

// Global status queries
accountFeeSchema.index({ status: 1 });

// ─── Virtual: outstanding balance ─────────────────────────────────────────────
accountFeeSchema.virtual("outstandingBalance").get(function () {
    return Math.max(0, this.totalAssigned - this.totalPaid);
});

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
// Keeps totalDue and status always in sync whenever the document is saved.
accountFeeSchema.pre("save", function (next) {
    this.totalDue = Math.max(0, this.totalAssigned - this.totalPaid);

    if (this.totalPaid <= 0) {
        this.status = "pending";
    } else if (this.totalPaid >= this.totalAssigned) {
        this.status = "paid";
        this.totalDue = 0;
    } else {
        this.status = "partial";
    }

    next();
});

module.exports = mongoose.model("AccountFee", accountFeeSchema);
