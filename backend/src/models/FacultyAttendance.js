const mongoose = require('mongoose');

const rawPunchSchema = new mongoose.Schema({
  time: { type: Date, required: true },
  deviceUserId: { type: String },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeviceRegistration' },
  queueJobId: { type: String }, // Bull job ID for traceability
}, { _id: false });

const facultyAttendanceSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true,
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherProfile',
    required: true,
    index: true,
  },
  // Date only (no time) — one record per faculty per day
  date: {
    type: Date,
    required: true,
    // Store as start of day: new Date(dateString) with time 00:00:00 UTC
  },

  // First punch of the day = check-in
  punchIn: {
    type: Date,
  },

  // Last punch of the day = check-out
  punchOut: {
    type: Date,
  },

  // Total working hours (calculated from punchIn - punchOut)
  totalHours: {
    type: Number,
    default: 0, // in hours, e.g. 7.5
  },

  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day', 'on_leave'],
    default: 'absent',
  },

  // How was this record created/modified
  source: {
    type: String,
    enum: ['device', 'manual'],
    default: 'device',
  },

  // Manual correction note
  manualNote: {
    type: String,
    trim: true,
  },
  manuallyUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // All raw punches from the device for this faculty on this day
  rawPunches: [rawPunchSchema],

}, { timestamps: true });

// ─── Indexes ─────────────────────────────────────────────────────────────────
// Primary: school + date (for daily dashboard)
facultyAttendanceSchema.index({ schoolId: 1, date: 1 });
// Reports by status
facultyAttendanceSchema.index({ schoolId: 1, date: 1, status: 1 });

// One record per faculty per date per school (unique constraint creates index automatically)
facultyAttendanceSchema.index(
  { schoolId: 1, facultyId: 1, date: 1 },
  { unique: true }
);

// ─── Pre-save: auto-calculate totalHours and status ──────────────────────────
facultyAttendanceSchema.pre('save', function (next) {
  if (this.punchIn && this.punchOut) {
    const diffMs = this.punchOut - this.punchIn;
    this.totalHours = Math.round((diffMs / 3600000) * 100) / 100; // hours, 2 decimals
  }

  // Auto-set status based on punchIn time (09:15 = late threshold)
  if (this.punchIn && this.source === 'device') {
    const lateThreshold = new Date(this.date);
    lateThreshold.setHours(9, 15, 0, 0); // 9:15 AM

    const halfDayThreshold = new Date(this.date);
    halfDayThreshold.setHours(13, 0, 0, 0); // 1:00 PM

    if (this.punchIn > halfDayThreshold) {
      this.status = 'half_day';
    } else if (this.punchIn > lateThreshold) {
      this.status = 'late';
    } else {
      this.status = 'present';
    }
  }

  next();
});

module.exports = mongoose.model('FacultyAttendance', facultyAttendanceSchema);
