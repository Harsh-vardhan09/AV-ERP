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
  },
  serialNumber: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  // Secret embedded in the device's push URL — the device's only credential
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
  },
  totalPunches: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

deviceRegistrationSchema.index({ schoolId: 1, deviceName: 1 }, { unique: true });

deviceRegistrationSchema.pre('validate', function (next) {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

module.exports = mongoose.model('DeviceRegistration', deviceRegistrationSchema);
