// ══════════════════════════════════════════════════════════════════
// OASES — Auth Middleware (Phase 1 migration update)
//
// BEFORE: Required user.oasesRole in DB + crashed if Redis offline.
// AFTER:
//   1. Redis blacklist check is null-guarded (graceful if Redis down)
//   2. ERP admin role  → treated as SCHOOL_ADMIN in OASES
//   3. ERP teacher role → treated as EVALUATOR in OASES
//   4. Explicit oasesRole in DB still takes full precedence
//
// Logic for existing oasesRole users is UNCHANGED.
// ══════════════════════════════════════════════════════════════════
const jwt       = require('jsonwebtoken');
const { User }  = require('../models/user');
const { safeRedisOperation } = require('../config/oasesRedis');

if (!process.env.JWT_SECRET) {
  throw new Error(
    '[oasesAuth] JWT_SECRET environment variable is not set. ' +
    'Server cannot start safely.'
  );
}

// Map ERP role → OASES role (used when user has no explicit oasesRole)
const ERP_ROLE_TO_OASES = {
  admin:   'SCHOOL_ADMIN',
  teacher: 'EVALUATOR',
};

const oasesAuth = async (req, res, next) => {
  try {
    // ── 1. Extract token ────────────────────────────────────────
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error:   'Authentication required. No token provided.',
        errors:  [],
      });
    }

    // ── 2. Redis blacklist check (null-guarded) ──────────────────
    // Redis may be offline in development — non-fatal, skip grace-
    // fully so logout blacklisting is best-effort, not a blocker.
    const isBlacklisted = await safeRedisOperation(async (redis) => {
      return await redis.get(`blacklist:${token}`);
    });
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error:   'Token has been revoked. Please log in again.',
        errors:  [],
      });
    }

    // ── 3. Verify JWT ────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({
        success: false,
        error:   jwtErr.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid token. Please log in again.',
        errors:  [],
      });
    }

    // ── 4. Load user from DB ─────────────────────────────────────
    const userId = decoded.userid || decoded.sub;
    const user   = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error:   'User not found. Token is invalid.',
        errors:  [],
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error:   'Your account has been deactivated. Contact admin.',
        errors:  [],
      });
    }

    // ── 5. Resolve OASES role ────────────────────────────────────
    // Priority: explicit oasesRole in DB  >  ERP role fallback
    const resolvedOasesRole =
      user.oasesRole ||                        // explicit DB field (existing users)
      ERP_ROLE_TO_OASES[user.role] ||          // ERP admin → SCHOOL_ADMIN, teacher → EVALUATOR
      null;

    if (!resolvedOasesRole) {
      return res.status(403).json({
        success: false,
        error:   'OASES access denied. Your account is not authorized for OASES.',
        errors:  [],
      });
    }

    // ── 6. Attach to request ─────────────────────────────────────
    req.user          = user;
    req.userid        = user._id;
    req.schoolId      = user.schoolId;
    req._rawToken     = token;                 // used by logout to blacklist

    // Make resolved role available downstream (oasesRole.js middleware,
    // controllers that check req.user.oasesRole)
    req.user.oasesRole = resolvedOasesRole;

    next();
  } catch (err) {
    console.error('[oasesAuth]', err);
    return res.status(500).json({
      success: false,
      error:   'Authentication failed due to a server error.',
      errors:  [],
    });
  }
};

module.exports = oasesAuth;
