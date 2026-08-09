const { authorize } = require('./roleMiddleware');

// Fee routes import { authorizeRoles } from this path
const authorizeRoles = authorize;

// req.user._id is a User._id and the param may be a StudentProfile._id — comparing
// them directly always 403s, so the profile has to be resolved to its linked userId
exports.guardSelfAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role !== 'student') {
      return next();
    }

    // Routes disagree on the param name
    const paramId = req.params.studentProfileId || req.params.studentId || req.params.id;

    if (!paramId) {
      return res.status(400).json({ success: false, message: 'Missing resource ID' });
    }

    // Some routes pass the userId directly
    if (String(req.user._id) === String(paramId)) {
      return next();
    }

    // SECURITY: scoped to the current school to prevent cross-tenant lookup

    // TODO: core -> module, and it reaches past people/index.js. Route through the
    // TODO: barrel first, then move this role check into the people module
    // eslint-disable-next-line import/no-restricted-paths
    const StudentProfile = require('../../../src/modules/people/models/StudentProfile');
    const profile = await StudentProfile.findOne({
      _id: paramId,
      schoolId: req.schoolId,
    })
      .select('userId')
      .lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    if (String(profile.userId) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data.',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed',
    });
  }
};

module.exports = { authorizeRoles, guardSelfAccess: exports.guardSelfAccess };
