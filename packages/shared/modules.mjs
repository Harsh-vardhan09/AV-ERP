// ESM face of the module registry, for apps/web.
//
// The web app cannot consume modules.js. npm workspaces symlinks this package
// to packages/, outside node_modules, so Vite's dev server treats it as project
// source and serves it verbatim as an ES module — `module.exports` then throws
// "module is not defined" and the app renders a blank page with no console
// error. Pointing the `import` condition here gives Vite real ESM.
//
// Both files read modules.json, so the registry has exactly one definition;
// only the four-line derivation below is stated twice, once per module format.
import MODULES from './modules.json';

// Applied when creating a school, and as the fallback for any key a school's
// settings document predates
export const DEFAULT_MODULES = Object.fromEntries(
  Object.entries(MODULES).map(([key, mod]) => [key, mod.defaultEnabled])
);

export const MODULE_KEYS = Object.keys(MODULES);

// Retired modules: code still ships, but no school can reach them
export const AVAILABLE_MODULE_KEYS = MODULE_KEYS.filter((key) => MODULES[key].available !== false);

// The registry outranks the database. A school document that predates a module
// being retired or made always-on still carries its old flag; honouring it would
// resurrect a module we removed from the UI.
export const isModuleEnabled = (schoolModules, moduleKey) => {
  if (MODULES[moduleKey]?.available === false) return false;
  if (MODULES[moduleKey]?.canDisable === false) return MODULES[moduleKey].defaultEnabled;
  if (!schoolModules) return MODULES[moduleKey]?.defaultEnabled ?? false;
  if (typeof schoolModules[moduleKey] === 'undefined') {
    return MODULES[moduleKey]?.defaultEnabled ?? false;
  }
  return schoolModules[moduleKey] === true;
};

export { MODULES };

export default {
  MODULES,
  DEFAULT_MODULES,
  MODULE_KEYS,
  AVAILABLE_MODULE_KEYS,
  isModuleEnabled,
};
