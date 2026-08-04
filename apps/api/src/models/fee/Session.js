const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Session name is required"],
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
            index: true,   // faster updateMany({ isActive: true }) queries
        },

        isLocked: {
            type: Boolean,
            default: false,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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
        toJSON: { virtuals: true },  // include virtuals when sending response
        toObject: { virtuals: true },
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
sessionSchema.index({ createdAt: -1 });
sessionSchema.index({ createdBy: 1, createdAt: -1 });
// Name unique within a school (not globally)
sessionSchema.index({ name: 1, schoolId: 1 }, { unique: true });
sessionSchema.index({ schoolId: 1, isActive: 1 });

// ─── Validators ───────────────────────────────────────────────────────────────

// Ensures endDate is always after startDate at schema level
sessionSchema.pre("validate", function (next) {
    if (this.startDate && this.endDate && this.startDate >= this.endDate) {
        this.invalidate("endDate", "endDate must be after startDate");
    }
    next();
});

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Computed field — no need to store or calculate manually in controller
sessionSchema.virtual("durationDays").get(function () {
    if (!this.startDate || !this.endDate) return null;
    const ms = this.endDate - this.startDate;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
});

// Tells you session status in one readable field
sessionSchema.virtual("status").get(function () {
    if (this.isLocked) return "locked";
    if (this.isActive) return "active";
    return "inactive";
});

module.exports = mongoose.model("Session", sessionSchema);