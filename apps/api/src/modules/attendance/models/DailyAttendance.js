const mongoose = require('mongoose');

/**
 * One row per student per school day.
 *
 * Replaces the per-class-period grain of models/attendance.js, where a student
 * appeared once per period inside an embedded records[] array — so a day had as
 * many "attendance" entries as the timetable had periods, and every percentage
 * divided by periods rather than days.
 *
 * `date` is ALWAYS the value produced by lib/schoolDay.toSchoolDay(): midnight
 * UTC of the school-local calendar day. Never write a raw new Date() here — see
 * that file for why the two differ by a day every evening.
 */
const dailyAttendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: [true, 'Student is required'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    status: {
      // Same vocabulary as the per-period model it replaces — 'half-day' was
      // never part of it, so adding one here would invent a state no existing
      // row, import path or report card knows how to read.
      type: String,
      enum: ['present', 'absent', 'late', 'leave'],
      required: [true, 'Status is required'],
    },

    // Denormalised so a month view does not have to join StudentProfile, and so
    // history survives a student changing section mid-session.
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassModel',
      required: [true, 'Class is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SectionModel',
      required: [true, 'Section is required'],
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
    },

    // If the student is on approved leave, the leave that explains it
    leaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leave',
      default: null,
    },
    remarks: { type: String, trim: true, default: '' },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Marker is required'],
    },
    markedByRole: {
      type: String,
      enum: ['teacher', 'admin', 'admission', 'migration', 'import'],
      default: 'teacher',
    },
    markedAt: { type: Date, default: Date.now },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School context is required'],
      index: true,
    },
  },
  { timestamps: true }
);

/**
 * The rule of this model, enforced by the database.
 *
 * The old unique index (schoolId, classId, sectionId, subjectId, date,
 * attendanceType) was dropped by migration 2026-07-24-07 for a specific reason:
 * duplicate rows ALREADY existed, and the de-duplication migration that followed
 * could not insert its working rows while the index rejected them. The index was
 * not wrong in principle — it was un-createable against dirty data.
 *
 * This key is different in kind: it is per student per day, and the migration
 * that creates it collapses conflicts FIRST, so it is applied to clean data.
 * Application logic alone cannot make a double submit safe — two concurrent
 * requests both read "no row yet" and both insert. Only the database can
 * serialise that. See services/attendanceService.markDay, which upserts and
 * treats the duplicate-key error as success.
 */
dailyAttendanceSchema.index({ schoolId: 1, studentId: 1, date: 1 }, { unique: true });

// Roster for one section on one day — the marking screen's read.
dailyAttendanceSchema.index({ schoolId: 1, sectionId: 1, date: 1 });
// A student's month/session view, and every percentage calculation.
dailyAttendanceSchema.index({ schoolId: 1, studentId: 1, session: 1, date: 1 });

module.exports = mongoose.model('DailyAttendance', dailyAttendanceSchema);
