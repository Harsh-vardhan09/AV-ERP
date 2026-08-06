// Roles are transcribed from the route file as-is. Nothing reads this map yet —
// authRoutes still calls varifyToken/authorize/platformOwnerOnly per route
const PUBLIC = [];
const ANY_AUTHENTICATED = [];
const ADMIN_OR_ADMISSION = ['admin', 'admission'];

const permissions = {
  // Public — no token. signup additionally needs the X-Platform-Secret header
  'identity.auth.signup':        PUBLIC,
  'identity.auth.login':         PUBLIC,
  'identity.auth.logout':        PUBLIC,
  'identity.auth.verifyEmail':   PUBLIC,
  'identity.auth.resetPassword': PUBLIC,
  'identity.auth.changePassword': PUBLIC,

  // Token required, no role restriction
  'identity.auth.checkAuth':          ANY_AUTHENTICATED,
  'identity.auth.changeFirstPassword': ANY_AUTHENTICATED,

  'identity.users.list':       ADMIN_OR_ADMISSION,
  'identity.users.activate':   ADMIN_OR_ADMISSION,
  'identity.users.deactivate': ADMIN_OR_ADMISSION,
};

module.exports = permissions;
module.exports.PUBLIC = PUBLIC;
module.exports.ANY_AUTHENTICATED = ANY_AUTHENTICATED;
module.exports.ADMIN_OR_ADMISSION = ADMIN_OR_ADMISSION;
