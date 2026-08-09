// OASES Controller — Auth
// GET  /api/v1/oases/auth/me      — return current OASES user
// POST /api/v1/oases/auth/logout  — blacklist token in Redis
const jwt          = require('jsonwebtoken');
const oasesAsync   = require('../../../core/http/asyncHandler');
const { ok } = require('../../../core/http/ApiResponse');
const { safeRedisOperation } = require('../lib/redis');
const auditService = require('../services/auditService');

/**
 * GET /api/v1/oases/auth/me
 * Returns the current authenticated user + oasesRole.
 * Protected by oasesAuth middleware → req.user is always set.
 */
exports.me = oasesAsync(async (req, res) => {
  const user = req.user;
  return ok(res, {
    id:         user._id,
    firstName:  user.firstName,
    lastName:   user.lastName,
    email:      user.email,
    role:       user.role,
    oasesRole:  user.oasesRole,
    schoolId:   user.schoolId,
    lastLogin:  user.lastLogin,
  }, 'User info retrieved');
});

/**
 * POST /api/v1/oases/auth/logout
 * Blacklists the current token in Redis with its remaining TTL.
 */
exports.logout = oasesAsync(async (req, res) => {
  const token = req._rawToken; // set by oasesAuth middleware

  try {
    // Decode to find remaining TTL
    const decoded = jwt.decode(token);
    const now     = Math.floor(Date.now() / 1000);
    const ttl     = decoded?.exp ? decoded.exp - now : 60 * 60 * 7 * 24;

    if (ttl > 0) {
      await safeRedisOperation(async (redis) => {
        await redis.set(`blacklist:${token}`, '1', 'EX', ttl);
      });
    }
  } catch {
    // If Redis fails, still return success (best-effort)
  }

  // Audit log (fire-and-forget)
  auditService.log({
    schoolId:   req.schoolId,
    entityType: 'User',
    entityId:   req.userid,
    actorId:    req.userid,
    actorRole:  req.user?.oasesRole,
    action:     'user_logout',
    ipAddress:  req.ip,
    userAgent:  req.get('user-agent'),
  });

  // Clear the cookie as well
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'None' });

  return ok(res, null, 'Logged out successfully');
});
