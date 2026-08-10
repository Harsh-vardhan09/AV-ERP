const logger = require('../logging/logger');

// TODO: core -> module. The gate reads per-school settings that tenancy owns
// TODO: invert by having tenancy register the gate factory with core at boot
// eslint-disable-next-line import/no-restricted-paths
const SchoolSettings = require('../../modules/tenancy').SchoolSettings;
const { MODULES, isModuleEnabled } = require('@av-erp/shared');

// Runs after authenticate so req.schoolId is set. 'core' always passes and DB
// errors fail open, so this can never lock users out on an infra blip.

const moduleDisabled = (moduleKey) => (req, res) =>
  res.status(403).json({
    success: false,
    moduleDisabled: true,
    module: moduleKey,
    message: `The "${moduleKey.replace(/_/g, ' ')}" module is not enabled for your school. Please contact your administrator.`,
  });

const checkModuleAccess = (moduleKey) => {
  const mod = MODULES[moduleKey];

  // A module nobody can toggle has one answer for every school, so no per-request
  // DB read can change it. Deciding here also means the guard no longer depends on
  // running after authenticate: several routers mount it before their varifyToken,
  // where req.schoolId is still unset and the DB path would fall through to next().
  if (mod && mod.canDisable === false) {
    return mod.available === false ? moduleDisabled(moduleKey) : (req, res, next) => next();
  }

  return async (req, res, next) => {
    try {
      if (moduleKey === 'core') return next();

      const schoolId = req.schoolId || req.user?.schoolId;

      // No school context means a public or super-admin route
      if (!schoolId) return next();

      const settings = await SchoolSettings.findOne(
        { schoolId },
        { modules: 1, isOasesEnabled: 1 }
      ).lean();

      let enabled;

      // Legacy docs predate the modules field. Only consult isOasesEnabled while
      // oases is a module a school may still switch on — otherwise a legacy
      // document would toggle a retired module back on.
      if (
        moduleKey === 'oases' &&
        MODULES.oases?.available !== false &&
        settings &&
        typeof settings.modules?.oases === 'undefined'
      ) {
        enabled = settings.isOasesEnabled ?? false;
      } else {
        enabled = isModuleEnabled(settings?.modules, moduleKey);
      }

      if (!enabled) return moduleDisabled(moduleKey)(req, res);

      return next();
    } catch (error) {
      // Fail open on DB error — never block legitimate users on infra issues
      logger.error('[checkModuleAccess] DB error, failing open:', error.message);
      return next();
    }
  };
};

module.exports = { checkModuleAccess };
