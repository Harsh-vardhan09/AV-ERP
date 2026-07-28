const mongoose = require('mongoose');
const { Schema } = mongoose;

const TeacherAttendanceSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'on_leave', 'holiday', 'weekly_off'],
      required: true,
    },
    leaveId: {
      type: Schema.Types.ObjectId,
      ref: 'Leave',
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    remarks: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes
TeacherAttendanceSchema.index({ schoolId: 1, teacherId: 1, date: 1 }, { unique: true });
TeacherAttendanceSchema.index({ schoolId: 1, date: 1 });

module.exports = mongoose.model('TeacherAttendance', TeacherAttendanceSchema);
