/**
 * Role-based authorization middleware
 * Usage: authorize('admin', 'accounts')
 * Must be used AFTER verifyToken middleware
 */

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // ❌ No user
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // ❌ No roles passed
      if (!allowedRoles || allowedRoles.length === 0) {
        console.warn('⚠️ authorize middleware used without roles');
        return next(); // allow (or you can block if you prefer strict mode)
      }

      const userRole = String(req.user.role).toLowerCase();

      const isAllowed = allowedRoles
        .map(r => String(r).toLowerCase())
        .includes(userRole);

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: insufficient permissions',
        });
      }

      next();

    } catch (error) {
      console.error('Authorization error:', error);

      return res.status(500).json({
        success: false,
        message: 'Authorization failed',
      });
    }
  };
};

module.exports = { authorize };