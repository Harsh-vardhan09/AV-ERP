// Student attendance is one record per student per day, marked by the section's
// class teacher. See docs/attendance-merge-plan.md for the three-model overlap:
// DailyAttendance (students) is separate from TeacherAttendance / FacultyAttendance
// (staff), which biometric owns.
module.exports = {
  key: 'attendance',
  label: 'Attendance',
  description: 'Daily student attendance and staff attendance records',
  defaultEnabled: true,
  canDisable: false,
  dependsOn: ['core', 'people', 'academics'],
  basePath: '/api/v1/attendance',

  // Mounted ABOVE the bare /api/v1 complaint router (order 130), which applies a
  // router-level token guard to everything below it.
  order: 70,

  // 'router' — routes/index.js applies varifyToken + authorize itself. The
  // per-section rule needs the request body, so the loader cannot express it.
  auth: 'router',
  limiter: 'api',

  routes: require('./routes'),
  permissions: require('./permissions'),
  jobs: [],
  events: [],
};
