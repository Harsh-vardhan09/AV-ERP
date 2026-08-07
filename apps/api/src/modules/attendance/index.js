// Public API of the attendance module.
//
// The three models overlap and are not interchangeable — see
// docs/attendance-merge-plan.md before picking one.
module.exports = {
  // Attendance — one document per class period with an embedded records[] array.
  // Consumer: modules/reportcards (dataAggregatorService)
  get Attendance() { return require('./models/attendance'); },

  // TeacherAttendance — manually marked staff attendance, one row per person per
  // day. Consumer: modules/payroll
  get TeacherAttendance() { return require('./models/TeacherAttendance'); },

  // FacultyAttendance — device-populated staff attendance, same grain as
  // TeacherAttendance. Consumer: modules/biometric
  get FacultyAttendance() { return require('./models/FacultyAttendance'); },
};
