const mongoose = require("mongoose");

// ─── BillingPeriod Model ───────────────────────────────────────────────────────
//
// Generic replacement for "Session" — works for any billing cycle:
//   School academic year, coaching batch period, SaaS billing month, etc.
//
// Renamed from: Session
// Key changes:
//   - createdBy: removed "User" ref — host system provides its own user model
//   - Status virtual preserved for compatibility

const billingPeriodSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Billing period name is required"],
            trim: true,
            minlength: [3, "Name must be at least 3 characters"],
            maxlength: [100, "Name must not exceed 100 characters"],
        },

        startDate: {
            type: Date,
            required: [true, "Start date is required"],
        },

        endDate: {
            type: Date,
            required: [true, "End date is required"],
        },

        isActive: {
            type: Boolean,
            default: false,
            index: true,
        },

        isLocked: {
            type: Boolean,
            default: false,
        },

        // ── createdBy: plain ObjectId — no User ref ────────────────────────────
        // The host system resolves this to its own user entity.
        // Keeping the field so existing data is not lost.
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            index: true,
        },

        // ── Multi-tenancy ──────────────────────────────────────────────────────────
        schoolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: [true, "School context is required"],
            index: true,
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
billingPeriodSchema.index({ createdAt: -1 });
billingPeriodSchema.index({ createdBy: 1, createdAt: -1 });
// Name unique within a school (not globally)
billingPeriodSchema.index({ name: 1, schoolId: 1 }, { unique: true });
billingPeriodSchema.index({ schoolId: 1, isActive: 1 });

// ─── Validators ───────────────────────────────────────────────────────────────
billingPeriodSchema.pre("validate", function (next) {
    if (this.startDate && this.endDate && this.startDate >= this.endDate) {
        this.invalidate("endDate", "endDate must be after startDate");
    }
    next();
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────
billingPeriodSchema.virtual("durationDays").get(function () {
    if (!this.startDate || !this.endDate) return null;
    const ms = this.endDate - this.startDate;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
});

billingPeriodSchema.virtual("status").get(function () {
    if (this.isLocked) return "locked";
    if (this.isActive) return "active";
    return "inactive";
});

module.exports = mongoose.model("BillingPeriod", billingPeriodSchema);
