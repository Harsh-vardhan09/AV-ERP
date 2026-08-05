const { authorize } = require('./roleMiddleware');

/**
 * Shim: re-export `authorize` as `authorizeRoles` for compatibility
 * with fee route files that import { authorizeRoles } from this path.
 */
const authorizeRoles = authorize;

/**
 * `guardSelfAccess` — allows admins/operators through unconditionally;
 * for students, verifies that req.params matches their own User._id OR
 * the StudentProfile._id that belongs to them.
 *
 * FIX 12: The old version compared req.user._id (User._id) directly to
 * studentProfileId (StudentProfile._id) which are different ObjectIds,
 * always returning 403. Now resolves the profile to find the linked userId.
 */
exports.guardSelfAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role !== 'student') {
      return next(); // admin / operator can access anyone
    }

    // Check all possible param names used across routes
    const paramId = req.params.studentProfileId || req.params.studentId || req.params.id;

    if (!paramId) {
      return res.status(400).json({ success: false, message: 'Missing resource ID' });
    }

    // Fast path: paramId is a User._id (some routes pass userId directly)
    if (String(req.user._id) === String(paramId)) {
      return next();
    }

    // Slow path: paramId might be a StudentProfile._id — resolve it
    // SECURITY: also scope to current school to prevent cross-tenant lookup
    const StudentProfile = require('../../../src-old/models/StudentProfile');
    const profile = await StudentProfile.findOne({
      _id: paramId,
      schoolId: req.schoolId
    }).select('userId').lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found'
      });
    }

    if (String(profile.userId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed'
    });
  }
};

module.exports = { authorizeRoles, guardSelfAccess: exports.guardSelfAccess };
