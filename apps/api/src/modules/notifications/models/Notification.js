const mongoose = require('mongoose');

// Notification — Global in-app notification model
// All notifications are schoolId scoped (multi-tenancy safe).
// TTL index auto-deletes records older than 90 days.

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // School scope — mandatory for multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },

    // Notification category — used for filtering in UI
    type: {
      type: String,
      enum: [
        'attendance',   // attendance related
        'marks',        // marks uploaded, report card
        'fee',          // fee payment, due, overdue
        'leave',        // leave applied, approved, rejected
        'assignment',   // new assignment, deadline, submission
        'notice',       // school notice published
        'complaint',    // complaint received
        'system',       // account created, password changed, etc
        'announcement', // super admin announcement
      ],
      required: true,
      index: true,
    },

    // Display content
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Where to navigate when notification is clicked
    // e.g. '/student/attendance', '/student/marks', '/admin/fee'
    link: {
      type: String,
      default: null,
      trim: true,
    },

    // Extra data for rendering (e.g. subject name, exam name)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Read state
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },

    // Who triggered this notification (optional — for "from teacher" display)
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    triggeredByName: {
      type: String,
      default: null,
      trim: true,
      // Store name at creation time — prevents lookup on every render
      // e.g. "Mrs. Sharma" — used in leave notifications
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common query patterns
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ schoolId: 1, createdAt: -1 });

// Auto-delete notifications older than 90 days
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = mongoose.model('Notification', notificationSchema);
