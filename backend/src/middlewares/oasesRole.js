// ══════════════════════════════════════════════════════════════════
// OASES — Role Guard Middleware
// Usage: router.get('/path', varifyToken, oasesRole('SCHOOL_ADMIN','SUPER_ADMIN'), handler)
// ══════════════════════════════════════════════════════════════════

const { OASES_ROLES } = require('../utils/oasesConstants');

/**
 * Middleware factory — restricts endpoint to stated OASES role(s).
 * Requires varifyToken to have run first (req.user populated).
 *
 * @param {...string} roles  Allowed OASES roles (from OASES_ROLES enum)
 */
const oasesRole = (...roles) => (req, res, next) => {
  // Fallback: SUPER_ADMIN always has access
  const userRole = req.user?.oasesRole;

  if (!userRole) {
    return res.status(403).json({
      success: false,
      error: 'OASES access denied. No OASES role assigned to your account.',
      errors: [],
    });
  }

  const allowed = [...roles, OASES_ROLES.SUPER_ADMIN];
  if (!allowed.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${userRole}`,
      errors: [],
    });
  }

  next();
};

module.exports = oasesRole;
