const mongoose = require('mongoose');

const academicSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Session name is required'],
      trim: true,
      // e.g. "2025-26"
    },
    startDate: {
      type: Date,
      required: [true, 'Session start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Session end date is required'],
    },
    isActive: {
      type: Boolean,
      default: false,
    },

    // Multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      index: true,
    },
  },
  { timestamps: true }
);

// Ensure only one active session per school at a time
academicSessionSchema.pre('save', async function (next) {
  if (this.isActive) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true, schoolId: this.schoolId },
      { $set: { isActive: false } }
    );
  }
  next();
});

module.exports = mongoose.model('AcademicSession', academicSessionSchema);
