// key/label/description/defaultEnabled mirror the 'biometric' entry in
// src-old/utils/moduleConstants — the routes are gated on it via checkModuleAccess
module.exports = {
  key:            'biometric',
  label:          'Biometric Attendance',
  description:    'Fingerprint device integration and faculty attendance',
  defaultEnabled: false,
  canDisable:     true,
  // 'people' does not exist yet — it owns the FacultyAttendance this module still
  // reaches into src-old for, marked TEMP in the controller and the worker
  dependsOn:      ['core', 'people'],
  basePath:       '/api/v1/fingerprint',
  // The MORX hardware posts to /api/v1/device/punch. Same router, no JWT — the
  // device authenticates with X-Device-Token, so the mount must stay reachable
  extraMounts:    ['/api/v1/device'],
  routes:         require('./routes'),
  permissions:    require('./permissions'),
  jobs:           [require.resolve('./jobs/attendanceWorker')],
  events:         [],
};
