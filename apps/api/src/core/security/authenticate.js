const jwt = require('jsonwebtoken');
const logger = require('../logging/logger');
// TEMP: moves to modules/identity
const { User } = require('../../../src-old/models/user');

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
      logger.warn('[authenticate] No token found. Cookies received:',
        Object.keys(req.cookies || {}),
        '| Origin:', req.headers.origin,
        '| Host:', req.headers.host
      );
      return res.status(401).json({
        success: false,
        message: 'Token is required. Please login.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Loaded from the DB rather than the token because schoolId lives on the user
    const user = await User.findById(decoded.userid).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token is invalid.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.'
      });
    }

    // A user without schoolId escapes every tenant filter downstream
    if (!user.schoolId) {
      logger.warn('[authenticate] User has no schoolId!', {
        userId: user._id,
        email:  user.email,
        role:   user.role,
      });
    }

    req.user     = user;
    req.userid   = user._id;        // backward compatibility
    req.schoolId = user.schoolId;   // every controller filters on this
    next();
  } catch (error) {
    logger.error('[authenticate] Token verification error:',
      error.message,
      '| Token present:', !!token,
      '| Origin:', req.headers.origin
    );
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = { authenticate, varifyToken: authenticate };
