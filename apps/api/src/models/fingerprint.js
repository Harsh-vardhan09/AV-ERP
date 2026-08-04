const mongoose = require('mongoose');
const crypto = require('crypto');

const deviceRegistrationSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required'],
    index: true,
  },
  deviceName: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
    // e.g. "Main Gate Biometric", "Staff Room Device"
  },
  serialNumber: {
    type: String,
    trim: true,
    // Physical MORX device serial number (optional but useful for support)
  },
  location: {
    type: String,
    trim: true,
    // e.g. "Main Entrance", "Staff Room"
  },
  // Secret token embedded in device's HTTP push URL — uniquely identifies school + device
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastPingAt: {
    type: Date,
    // Updated every time device successfully pushes a punch
  },
  totalPunches: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Per-school unique device name
deviceRegistrationSchema.index({ schoolId: 1, deviceName: 1 }, { unique: true });

// Auto-generate a secure token before save if not provided
deviceRegistrationSchema.pre('validate', function (next) {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex'); // 64-char hex string
  }
  next();
});

module.exports = mongoose.model('DeviceRegistration', deviceRegistrationSchema);
