// OASES Model — OasesNotification
// In-app notifications scoped to the OASES module.
const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../lib/constants');

const OasesNotificationSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    title:   { type: String, required: true },
    message: { type: String, required: true },

    // Optional reference to the related entity
    entityType: { type: String, default: null },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    isRead:  { type: Boolean, default: false, index: true },
    readAt:  { type: Date, default: null },

    // Socket.io push tracking
    isPushed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OasesNotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('OasesNotification', OasesNotificationSchema);
