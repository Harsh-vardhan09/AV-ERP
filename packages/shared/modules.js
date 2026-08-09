// CommonJS face of the module registry, for the API (`require`).
// The registry data itself lives in modules.json so that this file and
// modules.mjs stay two thin views over one source of truth — see modules.mjs
// for why an ESM twin is needed at all.
const MODULES = require('./modules.json');

// Applied when creating a school, and as the fallback for any key a school's
// settings document predates
const DEFAULT_MODULES = {};
Object.keys(MODULES).forEach((key) => {
  DEFAULT_MODULES[key] = MODULES[key].defaultEnabled;
});

const MODULE_KEYS = Object.keys(MODULES);

// Tolerates legacy documents with no modules field by falling back to the default
const isModuleEnabled = (schoolModules, moduleKey) => {
  if (!schoolModules) return MODULES[moduleKey]?.defaultEnabled ?? false;
  if (typeof schoolModules[moduleKey] === 'undefined') {
    return MODULES[moduleKey]?.defaultEnabled ?? false;
  }
  return schoolModules[moduleKey] === true;
};

module.exports = { MODULES, DEFAULT_MODULES, MODULE_KEYS, isModuleEnabled };
