const mongoose = require('mongoose');

/**
 * FacultyDeviceMapping — links a physical device's user ID (e.g. "001")
 * to an actual faculty member in the ERP.
 *
 * When admin enrolls a faculty's fingerprint on the MORX device,
 * the device assigns a local user ID (e.g. "001", "002").
 * Admin then creates this mapping in the ERP so punches can be attributed.
 */
const facultyDeviceMappingSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: [true, 'School ID is required'],
    index: true,
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeviceRegistration',
    required: [true, 'Device is required'],
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherProfile',
    required: [true, 'Faculty is required'],
  },
  // The user ID as stored inside the physical device (e.g. "001", "002", "10")
  deviceUserId: {
    type: String,
    required: [true, 'Device user ID is required'],
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  enrolledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

// A deviceUserId must be unique within a school (not just a device)
// because the server gets schoolId from token — not deviceId
facultyDeviceMappingSchema.index(
  { schoolId: 1, deviceUserId: 1 },
  { unique: true }
);

// A faculty member can only be mapped once per school
facultyDeviceMappingSchema.index(
  { schoolId: 1, facultyId: 1 },
  { unique: true }
);

module.exports = mongoose.model('FacultyDeviceMapping', facultyDeviceMappingSchema);
