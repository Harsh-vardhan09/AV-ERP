// key/label/description/defaultEnabled mirror the 'biometric' entry in
// @av-erp/shared — the routes are gated on it via checkModuleAccess
module.exports = {
  key: 'biometric',
  label: 'Biometric Attendance',
  description: 'Fingerprint device integration and faculty attendance',
  defaultEnabled: false,
  canDisable: true,
  // 'people' does not exist yet — it owns the FacultyAttendance this module still
  // reaches into people for, marked TEMP in the controller and the worker
  dependsOn: ['core', 'people'],
  basePath: '/api/v1/fingerprint',
  order: 310,
  // No limiter on either mount: apiLimiter would throttle punch ingestion and
  // /device carries no JWT to bucket per user
  limiter: null,
  // The MORX hardware posts to /api/v1/device/punch. Same router as basePath, so
  // the admin routes are reachable here too — /punch is the reason it exists.
  // Unlimited on purpose: apiLimiter would throttle punch ingestion.
  extraMounts: [
    {
      path: '/api/v1/device',
      routes: require('./routes'),
      auth: 'deviceToken',
      limiter: null,
      order: 320,
    },
  ],
  routes: require('./routes'),
  permissions: require('./permissions'),
  jobs: [require.resolve('./jobs/attendanceWorker')],
  events: [],
};
