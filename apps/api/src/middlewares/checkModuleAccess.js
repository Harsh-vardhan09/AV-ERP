/**
 * checkModuleAccess.js — middleware factory for module-level access control.
 *
 * Usage (in any route file):
 *   const { checkModuleAccess } = require('../middlewares/checkModuleAccess');
 *   router.use(checkModuleAccess('fee_management'));
 *
 * IMPORTANT:
 *  - Runs AFTER varifyToken so req.schoolId is already set.
 *  - 'core' module is ALWAYS allowed — this can never block core routes.
 *  - On DB error we FAIL OPEN (allow) to avoid blocking users on infra issues.
 *  - Legacy oases docs (missing modules field) fall back to isOasesEnabled.
 */
const SchoolSettings = require('../models/SchoolSettings');
const { isModuleEnabled } = require('../utils/moduleConstants');

const checkModuleAccess = (moduleKey) => {
  return async (req, res, next) => {
    try {
      // core module always passes through
      if (moduleKey === 'core') return next();

      // Get schoolId (set by varifyToken middleware)
      const schoolId = req.schoolId || req.user?.schoolId;

      // If no school context (e.g. public endpoint or super-admin), skip
      if (!schoolId) return next();

      // Fetch only the relevant fields for performance
      const settings = await SchoolSettings
        .findOne({ schoolId }, { modules: 1, isOasesEnabled: 1 })
        .lean();

      let enabled;

      // Special backward-compat: if modules.oases is missing, read isOasesEnabled
      if (moduleKey === 'oases' && settings && typeof settings.modules?.oases === 'undefined') {
        enabled = settings.isOasesEnabled ?? false;
      } else {
        enabled = isModuleEnabled(settings?.modules, moduleKey);
      }

      if (!enabled) {
        return res.status(403).json({
          success:       false,
          moduleDisabled: true,
          module:        moduleKey,
          message:       `The "${moduleKey.replace(/_/g, ' ')}" module is not enabled for your school. Please contact your administrator.`,
        });
      }

      return next();
    } catch (error) {
      // Fail open on DB error — never block legitimate users on infra issues
      console.error('[checkModuleAccess] DB error, failing open:', error.message);
      return next();
    }
  };
};

module.exports = { checkModuleAccess };
