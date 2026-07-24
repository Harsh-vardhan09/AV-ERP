// ══════════════════════════════════════════════════════════════════
// checkOasesEnabled — OASES feature-flag guard
//
// IMPORTANT: This middleware is mounted BEFORE oasesAuth in index.js,
// so req.schoolId / req.user are NOT available yet. We must decode
// the JWT ourselves to get the userId, then load the school from DB.
//
// HEALTH route (/health) is intentionally exempted so monitoring
// tools can verify the module is alive without a valid token.
// ══════════════════════════════════════════════════════════════════
const jwt           = require('jsonwebtoken');
const SchoolSettings = require('../models/SchoolSettings');
const { User }      = require('../models/user');

if (!process.env.JWT_SECRET) {
  throw new Error(
    '[checkOasesEnabled] JWT_SECRET not set.'
  );
}

const checkOasesEnabled = async (req, res, next) => {
  // Always allow the health check — no auth needed
  if (req.path === '/health') return next();

  try {
    // ── 1. If oasesAuth already ran and set req.schoolId, use it ──
    let schoolId = req.schoolId || req.user?.schoolId;

    // ── 2. Otherwise decode the JWT to find the user's schoolId ──
    if (!schoolId) {
      const token =
        req.cookies?.token ||
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.split(' ')[1]
          : null);

      if (!token) {
        // No token → let oasesAuth return the proper 401
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId  = decoded.userid || decoded.sub;
        const user    = await User.findById(userId).select('schoolId isActive').lean();
        schoolId      = user?.schoolId;
      } catch (_jwtErr) {
        // Invalid token → let oasesAuth return the proper 401
        return next();
      }
    }

    if (!schoolId) {
      return res.status(403).json({ success: false, message: 'OASES module is disabled' });
    }

    const settings = await SchoolSettings.findOne({ schoolId }).select('isOasesEnabled').lean();
    if (!settings?.isOasesEnabled) {
      return res.status(403).json({ success: false, message: 'OASES module is disabled' });
    }

    next();
  } catch (error) {
    console.error('[checkOasesEnabled]', error.message);
    res.status(500).json({ success: false, message: 'Unable to validate OASES feature toggle' });
  }
};

module.exports = checkOasesEnabled;
