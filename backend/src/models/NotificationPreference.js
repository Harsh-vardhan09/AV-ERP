const mongoose = require('mongoose');

// Per-type preference object structure
const typePreferenceSchema = {
  inApp: { type: Boolean, default: true },
  email: { type: Boolean, default: true },
};

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },

    // Per-type toggles — each has inApp and email boolean
    preferences: {
      attendance:   { ...typePreferenceSchema },
      marks:        { ...typePreferenceSchema },
      fee:          { ...typePreferenceSchema },
      leave:        { ...typePreferenceSchema },
      assignment:   { ...typePreferenceSchema },
      notice:       { ...typePreferenceSchema },
      complaint:    { ...typePreferenceSchema },
      system:       { ...typePreferenceSchema },
      announcement: { ...typePreferenceSchema },
    },

    // Email delivery mode
    // instant = send each email immediately
    // digest  = collect and send daily summary at 6 PM
    emailMode: {
      type: String,
      enum: ['instant', 'digest'],
      default: 'instant',
    },

    // Quiet hours — no emails sent during this window
    quietHours: {
      enabled:   { type: Boolean, default: false },
      startTime: { type: String, default: '22:00' }, // HH:MM 24h
      endTime:   { type: String, default: '07:00' },  // HH:MM 24h
    },
  },
  {
    timestamps: true,
  }
);

// One preference document per user per school
notificationPreferenceSchema.index(
  { userId: 1, schoolId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'NotificationPreference',
  notificationPreferenceSchema
);
