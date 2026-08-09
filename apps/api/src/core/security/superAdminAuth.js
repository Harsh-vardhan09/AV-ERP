const jwt = require('jsonwebtoken');
const logger = require('../logging/logger');

// TODO: core -> module, same inversion as moduleGate — tenancy owns SuperAdmin
// eslint-disable-next-line import/no-restricted-paths
const SuperAdmin = require('../../modules/tenancy').SuperAdmin;

// SECURITY: reads the superAdminToken cookie and SUPER_ADMIN_JWT_SECRET, never the
// school-user "token"/JWT_SECRET pair, and never sets req.user/schoolId/schoolFilter
exports.verifySuperAdmin = async (req, res, next) => {
  try {
    // DO NOT read req.cookies.token — that is exclusively for school users
    const token =
      req.cookies.superAdminToken ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    console.log('Origin:', req.headers.origin);
    console.log('Cookie header:', req.headers.cookie);
    console.log('Cookies:', req.cookies);
    console.log('Host:', req.headers.host);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Super admin access required. Please login.',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired super admin session',
      });
    }

    const superAdmin = await SuperAdmin.findById(decoded.id).select('-password');

    if (!superAdmin) {
      return res.status(401).json({
        success: false,
        message: 'Super admin account not found',
      });
    }

    if (!superAdmin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Super admin account has been deactivated',
      });
    }

    req.superAdmin = superAdmin;

    next();
  } catch (error) {
    logger.error('[superAdminAuth] Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};
