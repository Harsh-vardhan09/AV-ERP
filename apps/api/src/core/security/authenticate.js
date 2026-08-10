const jwt = require('jsonwebtoken');
const logger = require('../logging/logger');
// TODO: core -> module. Every request loads the user here, so identity cannot
// TODO: own it without an injection point. Pass a user loader into authenticate
// eslint-disable-next-line import/no-restricted-paths
const { User } = require('../../modules/identity/models/user');
// TODO: core -> module. Same injection point as User above — a suspended school
// TODO: has to be rejected on every request, not only at login
// eslint-disable-next-line import/no-restricted-paths
const School = require('../../modules/tenancy/models/School');

// Suspension is rare and a DB read per request is not; 60s is the worst-case
// delay before a suspended school stops being served.
const SCHOOL_STATUS_TTL_MS = 60 * 1000;
const schoolStatusCache = new Map();

const getSchoolStatus = async (schoolId) => {
  const key = String(schoolId);
  const hit = schoolStatusCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const school = await School.findById(schoolId).select('isActive name').lean();
  const value = school ? { isActive: school.isActive !== false, name: school.name } : null;
  schoolStatusCache.set(key, { value, expiresAt: Date.now() + SCHOOL_STATUS_TTL_MS });
  return value;
};

const invalidateSchoolStatus = (schoolId) => schoolStatusCache.delete(String(schoolId));

const authenticate = async (req, res, next) => {
  const token =
    req.cookies.token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  try {
    if (!token) {
      // Cookie names and origin are logged because a missing token here is
      // almost always a cross-origin cookie that never arrived
      logger.warn(
        '[authenticate] No token found. Cookies received:',
        Object.keys(req.cookies || {}),
        '| Origin:',
        req.headers.origin,
        '| Host:',
        req.headers.host
      );
      return res.status(401).json({
        success: false,
        message: 'Token is required. Please login.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Loaded from the DB rather than the token because schoolId lives on the user
    const user = await User.findById(decoded.userid).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.',
      });
    }

    // A user without schoolId escapes every tenant filter downstream
    if (!user.schoolId) {
      logger.warn('[authenticate] User has no schoolId!', {
        userId: user._id,
        email: user.email,
        role: user.role,
      });
    }

    // Login rejects a suspended school, but tokens issued before the suspension
    // would otherwise keep working until they expire
    if (user.schoolId) {
      const school = await getSchoolStatus(user.schoolId);
      if (school && !school.isActive) {
        return res.status(403).json({
          success: false,
          code: 'SCHOOL_SUSPENDED',
          message: `${school.name} has been suspended. Please contact your administrator.`,
        });
      }
    }

    req.user = user;
    req.userid = user._id; // backward compatibility
    req.schoolId = user.schoolId; // every controller filters on this
    next();
  } catch (error) {
    logger.error(
      '[authenticate] Token verification error:',
      error.message,
      '| Token present:',
      !!token,
      '| Origin:',
      req.headers.origin
    );
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

module.exports = { authenticate, varifyToken: authenticate, invalidateSchoolStatus };
