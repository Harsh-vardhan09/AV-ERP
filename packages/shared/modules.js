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

// Retired modules: code still ships, but no school can reach them
const AVAILABLE_MODULE_KEYS = MODULE_KEYS.filter((key) => MODULES[key].available !== false);

// The registry outranks the database. A school document that predates a module
// being retired or made always-on still carries its old flag; honouring it would
// resurrect a module we removed from the UI.
const isModuleEnabled = (schoolModules, moduleKey) => {
  if (MODULES[moduleKey]?.available === false) return false;
  if (MODULES[moduleKey]?.canDisable === false) return MODULES[moduleKey].defaultEnabled;
  if (!schoolModules) return MODULES[moduleKey]?.defaultEnabled ?? false;
  if (typeof schoolModules[moduleKey] === 'undefined') {
    return MODULES[moduleKey]?.defaultEnabled ?? false;
  }
  return schoolModules[moduleKey] === true;
};

module.exports = {
  MODULES,
  DEFAULT_MODULES,
  MODULE_KEYS,
  AVAILABLE_MODULE_KEYS,
  isModuleEnabled,
};
