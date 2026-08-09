const mongoose = require("mongoose");

// ─── Refund Schema ────────────────────────────────────────────────────────────
//
// Tracks refund requests against existing Payment records.
// A refund NEVER deletes or mutates a Payment — it creates a separate reversal
// flow: request → admin approval → ledger debit reversal → StudentFee total adjustment.
//
// Status lifecycle:
//   requested → approved → processed   (normal path)
//   requested → rejected               (admin rejects)

const refundSchema = new mongoose.Schema(
    {
        // The original payment being refunded
        paymentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Payment",
            required: [true, "Payment reference is required"],
            index: true,
        },

        // Denormalized for faster queries — refs AccountFee (generic)
        studentFeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AccountFee",
            required: [true, "Account fee reference is required"],
            index: true,
        },

        // Refund amount — must not exceed the original payment amount (validated in service)
        amount: {
            type: Number,
            required: [true, "Refund amount is required"],
            min: [0.01, "Refund amount must be greater than zero"],
        },

        // Reason provided by the requester
        reason: {
            type: String,
            trim: true,
            maxlength: [500, "Reason must not exceed 500 characters"],
        },

        // Lifecycle status
        status: {
            type: String,
            enum: {
                values: ["requested", "approved", "rejected", "processed"],
                message: "Status must be: requested, approved, rejected, or processed",
            },
            default: "requested",
            index: true,
        },

        // The entity who submitted the refund request — plain ObjectId, no User ref.
        // Host system resolves to its own user model.
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Requester reference is required"],
        },

        // The entity who approved or rejected — plain ObjectId, no User ref.
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
        },

        // Rejection reason (only set when status = "rejected")
        rejectionReason: {
            type: String,
            trim: true,
            maxlength: [500, "Rejection reason must not exceed 500 characters"],
        },

        // Timestamp when the refund was actually processed (money returned)
        processedAt: {
            type: Date,
        },

        // Razorpay compatibility: store external refund reference ID
        // Set during processRefund when Razorpay integration is active
        gatewayRefundId: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Lookup all refunds for a specific payment (refund history per payment)
refundSchema.index({ paymentId: 1, createdAt: -1 });

// Lookup all refunds for a student's fee record
refundSchema.index({ studentFeeId: 1, createdAt: -1 });

// Admin dashboard: filter by status (pending approvals, etc.)
refundSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Refund", refundSchema);
