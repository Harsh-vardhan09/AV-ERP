/**
 * Permission check utility for payroll pages.
 * Admin always has all permissions.
 */
export const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (Array.isArray(user.permissions)) return user.permissions.includes(permission);
  return false;
};
