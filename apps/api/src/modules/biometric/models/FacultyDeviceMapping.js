const mongoose = require('mongoose');

// Links a device-local user id ("001") to a faculty member so punches can be attributed
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

// Unique per school, not per device: the punch endpoint resolves schoolId from the
// device token, so a cross-device collision would be unattributable
facultyDeviceMappingSchema.index(
  { schoolId: 1, deviceUserId: 1 },
  { unique: true }
);

facultyDeviceMappingSchema.index(
  { schoolId: 1, facultyId: 1 },
  { unique: true }
);

module.exports = mongoose.model('FacultyDeviceMapping', facultyDeviceMappingSchema);
