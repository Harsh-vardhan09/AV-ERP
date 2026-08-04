/**
 * Role-based authorization middleware.
 * Usage: authorize('admin', 'teacher') — only these roles can access the route.
 * Must be used AFTER varifyToken middleware (which sets req.user).
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized for this resource.`
      });
    }

    next();
  };
};

module.exports = { authorize };
