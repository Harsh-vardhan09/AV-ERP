// Roles are transcribed from the route files as-is. Nothing reads this map yet.
// Two of the three mounts do not use roles at all — see the notes below
const ANY_AUTHENTICATED = [];

// /api/super-admin authenticates with the superAdminToken cookie and
// SUPER_ADMIN_JWT_SECRET via core/security/superAdminAuth — req.user is never set
const SUPER_ADMIN = ['superadmin'];

// /api/platform authenticates with the X-Platform-Secret header and no user at all
const PLATFORM_SECRET = [];

const permissions = {
  // /api/v1/school
  'tenancy.school.viewOwn': ANY_AUTHENTICATED,

  // /api/super-admin
  'tenancy.superAdmin.*': SUPER_ADMIN,

  // /api/platform
  'tenancy.platform.*': PLATFORM_SECRET,
};

module.exports = permissions;
module.exports.ANY_AUTHENTICATED = ANY_AUTHENTICATED;
module.exports.SUPER_ADMIN = SUPER_ADMIN;
module.exports.PLATFORM_SECRET = PLATFORM_SECRET;
