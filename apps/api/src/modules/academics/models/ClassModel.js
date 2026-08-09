const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
    },
    numericOrder: {
      type: Number,
      required: [true, 'Numeric order is required'],
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
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

// Class name unique within a session + school
classSchema.index({ name: 1, session: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('ClassModel', classSchema);
