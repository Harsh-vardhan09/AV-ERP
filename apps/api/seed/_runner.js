/**
 * Child-process launcher for the seed files.
 *
 * Exists only because the seed scripts were moved into ./seed/ unchanged, so
 * two things need patching at load time without editing them:
 *   1. Their `require('./src/...')` paths still point at the backend root.
 *   2. admissionSeed.js only exports its function — it never self-runs.
 *
 * Usage: node seed/_runner.js <seedFile> [args passed through to the seed]
 */
const path   = require('path');
const Module = require('module');

const BACKEND = path.join(__dirname, '..');

// Remap './src/...' requires (relative to the old backend/ location) to the real path.
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('./src/')) request = path.join(BACKEND, request.slice(2));
  return origResolve.call(this, request, ...rest);
};

const target = process.argv[2];
if (!target) {
  console.error('usage: node seed/_runner.js <seedFile> [args...]');
  process.exit(1);
}

// Drop our own arg so seed files parsing process.argv (seedSuperAdmin.js) see theirs.
process.argv.splice(2, 1);

const mod = require(path.resolve(__dirname, target));

// admissionSeed.js exports instead of self-executing — call it.
if (typeof mod === 'function') {
  Promise.resolve(mod()).catch((err) => {
    console.error('❌', err.message);
    process.exit(1);
  });
}
