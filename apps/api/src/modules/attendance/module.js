// Models only. Attendance has no routes of its own yet — it is read through
// people's controllers and written by biometric. The manifest exists so other
// modules can declare dependsOn 'attendance' and have it resolve.
// See docs/attendance-merge-plan.md for the three-model overlap.
module.exports = {
  key:            'attendance',
  label:          'Attendance',
  description:    'Student class-period attendance and staff daily attendance',
  defaultEnabled: true,
  canDisable:     false,
  dependsOn:      ['core', 'people'],
  basePath:       '/api/v1/attendance',
  routes:         null,

  permissions: {},
  jobs:        [],
  events:      [],
};
