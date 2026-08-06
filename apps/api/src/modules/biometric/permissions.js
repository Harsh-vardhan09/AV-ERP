// Roles are transcribed from the route file as-is. Nothing reads this map yet —
// the routes still build adminGuard from ADMIN_ONLY below
const ADMIN_ONLY = ['admin'];

// The punch endpoint has no role: the MORX hardware authenticates with the
// X-Device-Token header, which resolves the school itself
const DEVICE_TOKEN = [];

const permissions = {
  'biometric.device.register': ADMIN_ONLY,
  'biometric.device.list':     ADMIN_ONLY,
  'biometric.device.toggle':   ADMIN_ONLY,
  'biometric.device.delete':   ADMIN_ONLY,

  'biometric.mapping.create':  ADMIN_ONLY,
  'biometric.mapping.list':    ADMIN_ONLY,
  'biometric.mapping.delete':  ADMIN_ONLY,

  'biometric.attendance.view':             ADMIN_ONLY,
  'biometric.attendance.manualCorrection': ADMIN_ONLY,
  'biometric.attendance.uploadCsv':        ADMIN_ONLY,

  'biometric.report.monthly':  ADMIN_ONLY,
  'biometric.queue.stats':     ADMIN_ONLY,

  'biometric.punch.receive':   DEVICE_TOKEN,
};

module.exports = permissions;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
module.exports.DEVICE_TOKEN = DEVICE_TOKEN;
