// Public API of the attendance module.
//
// The models overlap and are not interchangeable — see
// docs/attendance-merge-plan.md before picking one.
module.exports = {
  // DailyAttendance — ONE row per student per school day, marked by the section's
  // class teacher. This is the student attendance model.
  // Consumers: reportcards (dataAggregatorService), people's controllers, imports
  get DailyAttendance() {
    return require('./models/DailyAttendance');
  },

  // Attendance — LEGACY. One document per class period with an embedded records[]
  // array, so a student appeared once per period and every percentage divided by
  // periods rather than days. Superseded by DailyAttendance; kept because the
  // collapse migration reads it and old rows are archived, not deleted.
  // Do not write to it.
  get Attendance() {
    return require('./models/attendance');
  },

  // Verbatim copies of the per-period rows, taken before the collapse.
  get AttendanceArchive() {
    return require('./models/AttendanceArchive');
  },

  // TeacherAttendance — manually marked staff attendance, one row per person per
  // day. Consumer: modules/payroll
  get TeacherAttendance() {
    return require('./models/TeacherAttendance');
  },

  // FacultyAttendance — device-populated staff attendance, same grain as
  // TeacherAttendance. Consumer: modules/biometric
  get FacultyAttendance() {
    return require('./models/FacultyAttendance');
  },

  // Consumers: reportcards (attendance percentage), people's controllers
  get attendanceService() {
    return require('./services/attendanceService');
  },

  // Consumers: anything that must resolve "which school day is this?"
  get schoolDay() {
    return require('./lib/schoolDay');
  },
};
