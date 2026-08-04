const mongoose = require("mongoose");

// ─── C-2 FIX: Payment Schema — Added 3 critical missing fields ────────────────
// + fineAmount    → was referenced in paymentService & reports but never existed
// + installmentIds → bidirectional link to which installments this payment covers
// + idempotencyKey → prevents duplicate payment creation on network retries

const paymentSchema = new mongoose.Schema(
    {
        studentFeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AccountFee",
            required: [true, "Account fee reference is required"],
            index: true,
        },

        // ─── NEW: Which installments this payment covered ──────────────────────
        // Enables forward tracing: "which installments did payment X settle?"
        // Populated during processPayment from the bulkOps installment list.
        installmentIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Installment",
            },
        ],

        // The base fee amount paid (excluding fine)
        amount: {
            type: Number,
            required: [true, "Payment amount is required"],
            min: [1, "Payment amount must be at least 1"],
        },

        // ─── NEW: Fine amount charged at time of payment ───────────────────────
        // Was referenced in paymentService.js and reportController.js but never existed.
        // Stored here to make reports and receipts accurate without a recalculation.
        fineAmount: {
            type: Number,
            default: 0,
            min: [0, "Fine amount cannot be negative"],
        },

        paymentDate: {
            type: Date,
            default: () => new Date(),   // arrow fn — evaluated at doc creation, not compile time
            index: true,
        },

        receiptNumber: {
            type: String,
            required: [true, "Receipt number is required"],
            unique: true,
            trim: true,
            index: true,
        },

        method: {
            type: String,
            enum: {
                values: ["cash", "online", "cheque", "bank_transfer", "upi", "card", "dd"],
                message: "Invalid payment method. Use: cash, online, cheque, bank_transfer, upi, card, dd",
            },
            default: "cash",
        },

        note: {
            type: String,
            trim: true,
            maxlength: [300, "Note must not exceed 300 characters"],
        },

        // ─── NEW: Idempotency key for retry safety ─────────────────────────────
        // Client sends a unique key (e.g., UUID) per payment attempt.
        // If the same key arrives twice, we return the first result instead of
        // creating a duplicate payment. sparse=true means only indexed docs with
        // this field — older payments without it won't cause unique conflicts.
        idempotencyKey: {
            type: String,
            unique: true,
            sparse: true,   // only index when field is present
            trim: true,
            maxlength: [100, "Idempotency key must not exceed 100 characters"],
        },

        // ─── Razorpay Gateway Fields ──────────────────────────────────────────
        // All optional — default gateway="manual" keeps backward compatibility
        // with all existing cash/cheque/bank_transfer payments.

        // Which gateway processed this payment
        gateway: {
            type: String,
            enum: ["manual", "razorpay"],
            default: "manual",
        },

        // Razorpay order ID — stored to allow webhook reconciliation
        gatewayOrderId: { type: String, trim: true },

        // Razorpay payment ID — returned after successful capture
        gatewayPaymentId: { type: String, trim: true },

        // HMAC signature returned by Razorpay — stored for audit trail
        gatewaySignature: { type: String, trim: true },

        // Razorpay payment lifecycle status
        gatewayStatus: {
            type: String,
            enum: {
                values: ["created", "authorized", "captured", "failed", "refunded"],
                message: "Invalid gateway status",
            },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ studentFeeId: 1, paymentDate: -1 });
paymentSchema.index({ studentFeeId: 1, createdAt: -1 });
paymentSchema.index({ method: 1, createdAt: -1 });    // for method-wise collection reports
paymentSchema.index({ gatewayOrderId: 1 }, { sparse: true });   // reconcile by Razorpay order
paymentSchema.index({ gatewayPaymentId: 1 }, { sparse: true }); // deduplicate webhook events

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Clean date string for display (YYYY-MM-DD)
paymentSchema.virtual("formattedDate").get(function () {
    return this.paymentDate?.toISOString().split("T")[0];
});

// Total amount including fine (base + fine) — useful for receipt display
paymentSchema.virtual("totalAmountWithFine").get(function () {
    return (this.amount || 0) + (this.fineAmount || 0);
});

module.exports = mongoose.model("Payment", paymentSchema);