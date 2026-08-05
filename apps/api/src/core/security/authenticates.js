const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

/**
 * varifyToken middleware — adapted for multi-tenancy.
 *
 * Flow:
 *  1. Extract JWT from cookie or Authorization header
 *  2. Decode → get userid
 *  3. Load full User from DB (includes schoolId)
 *  4. Attach user + schoolId to req
 *
 * req.user     — full User document
 * req.userid   — user._id (backward compatibility)
 * req.schoolId — user.schoolId (data isolation filter)
 */
const jwt = require('jsonwebtoken');
const { User } = require('../../../src-old/models/user');

exports.varifyToken = async (req, res, next) => {
  const token =
    req.cookies.token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  try {
    if (!token) {
      // Fix D: Log which cookies were actually received to diagnose cross-origin issues
      console.warn('[varifyToken] No token found. Cookies received:',
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

    // Fetch full user from DB — schoolId lives here
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

    // Fix D: Warn when a user has no schoolId — catches missing data isolation
    if (!user.schoolId) {
      console.warn('[varifyToken] User has no schoolId!', {
        userId: user._id,
        email:  user.email,
        role:   user.role,
      });
    }

    // ── Multi-tenancy: attach schoolId to every request ────────────────────
    req.user     = user;
    req.userid   = user._id;        // backward compatibility
    req.schoolId = user.schoolId;   // KEY: used by all controllers for data isolation

    next();
  } catch (error) {
    // Fix D: Log token errors with context to aid debugging on Vercel
    console.error('[varifyToken] Token verification error:',
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
