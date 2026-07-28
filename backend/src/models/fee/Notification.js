const mongoose = require("mongoose");

// ─── Notification Schema ───────────────────────────────────────────────────────
//
// Stores in-app notifications for all roles (admin, operator, student).
// Role-scoped: admins see all; operators/students see their own via userId.
//
// Notification types:
//   fee_due            → student has an upcoming/overdue installment
//   payment_success    → payment was processed successfully
//   refund_requested   → a refund request was submitted (alerts admin)
//   refund_processed   → refund has been processed (alerts student)
//   overdue_alert      → automated fine/overdue warning
//   admin_announcement → broadcast from admin to a role group

const notificationSchema = new mongoose.Schema(
    {
        // The entity this notification belongs to — plain ObjectId, no User ref.
        // Host system resolves to its own user model.
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "User reference is required"],
            index: true,
        },

        // Role of the recipient — open string (not locked to school roles).
        // Host system defines its own role names.
        role: {
            type: String,
            required: [true, "Role is required"],
            trim: true,
            maxlength: [50, "Role must not exceed 50 characters"],
        },

        // Notification category
        type: {
            type: String,
            enum: {
                values: [
                    "fee_due",
                    "payment_success",
                    "refund_requested",
                    "refund_processed",
                    "overdue_alert",
                    "admin_announcement",
                ],
                message: "Invalid notification type",
            },
            required: [true, "Notification type is required"],
        },

        // Human-readable message shown in the notification UI
        message: {
            type: String,
            required: [true, "Message is required"],
            trim: true,
            maxlength: [500, "Message must not exceed 500 characters"],
        },

        // Contextual data — flexible bag for receipt numbers, refund IDs, etc.
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        // Whether the user has acknowledged/read this notification
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary access pattern: fetch all notifications for a user, newest first
notificationSchema.index({ userId: 1, createdAt: -1 });

// Unread filter — most critical for badge counts
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// For admin "view all by role"
notificationSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
