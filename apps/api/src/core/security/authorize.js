const logger = require('../logging/logger');

// Must run after authenticate, which sets req.user
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Fails open by design: a route that forgot its roles stays reachable
      if (!allowedRoles || allowedRoles.length === 0) {
        logger.warn('⚠️ authorize middleware used without roles');
        return next();
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
      logger.error('Authorization error:', error);

      return res.status(500).json({
        success: false,
        message: 'Authorization failed',
      });
    }
  };
};

module.exports = { authorize };