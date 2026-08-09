// Roles are transcribed from the route files as-is. Nothing reads this map yet —
// notificationRoutes gates on auth alone, prefs routes call authorize() directly
const ANY_AUTHENTICATED = [];
const ADMIN_ONLY = ['admin'];

const permissions = {
  // Mounted at /api/v1/notifications — auth + school scope, no role check
  'notifications.list':        ANY_AUTHENTICATED,
  'notifications.unreadCount': ANY_AUTHENTICATED,
  'notifications.markAllRead': ANY_AUTHENTICATED,
  'notifications.clearAll':    ANY_AUTHENTICATED,
  'notifications.markRead':    ANY_AUTHENTICATED,
  'notifications.delete':      ANY_AUTHENTICATED,

  // Mounted at /api/v1/notification-preferences
  'notifications.preferences.viewOwn':   ANY_AUTHENTICATED,
  'notifications.preferences.updateOwn': ANY_AUTHENTICATED,
  'notifications.preferences.resetOwn':  ANY_AUTHENTICATED,

  'notifications.school.viewSettings':   ADMIN_ONLY,
  'notifications.school.updateSettings': ADMIN_ONLY,
  'notifications.school.history':        ADMIN_ONLY,
  'notifications.school.announce':       ADMIN_ONLY,
};

module.exports = permissions;
module.exports.ANY_AUTHENTICATED = ANY_AUTHENTICATED;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
