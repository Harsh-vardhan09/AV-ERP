const logger = require('../logging/logger');
// TEMP: moves to modules/schools
const SchoolSettings = require('../../modules/tenancy').SchoolSettings;
const { isModuleEnabled } = require('@av-erp/shared');

// Runs after authenticate so req.schoolId is set. 'core' always passes and DB
// errors fail open, so this can never lock users out on an infra blip.

const checkModuleAccess = (moduleKey) => {
  return async (req, res, next) => {
    try {
      if (moduleKey === 'core') return next();

      const schoolId = req.schoolId || req.user?.schoolId;

      // No school context means a public or super-admin route
      if (!schoolId) return next();

      const settings = await SchoolSettings
        .findOne({ schoolId }, { modules: 1, isOasesEnabled: 1 })
        .lean();

      let enabled;

      // Legacy docs predate the modules field
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
      logger.error('[checkModuleAccess] DB error, failing open:', error.message);
      return next();
    }
  };
};

module.exports = { checkModuleAccess };
