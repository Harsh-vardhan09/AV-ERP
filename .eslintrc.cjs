const fs = require('fs');
const path = require('path');

const API = './apps/api/src';

const MODULES = fs
  .readdirSync(path.join(__dirname, 'apps/api/src/modules'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

// One zone per ordered pair, generated from the directory listing so a new module
// is covered the moment it exists. `except` is relative to `from`, so index.js —
// and only index.js — stays reachable.
const crossModuleZones = MODULES.flatMap((from) =>
  MODULES.filter((to) => to !== from).map((to) => ({
    target: `${API}/modules/${from}`,
    from: `${API}/modules/${to}`,
    except: ['./index.js'],
    message: `modules/${from} may only import modules/${to} through its index.js`,
  }))
);

const coreZone = {
  target: `${API}/core`,
  from: `${API}/modules`,
  message: 'core/ is framework only and must not import from modules/',
};

// Controllers read req, call a service, send a response. A model import means
// business logic is sitting in the controller.
const controllerZones = MODULES.map((m) => ({
  target: `${API}/modules/${m}/controllers`,
  from: `${API}/modules/*/models`,
  message: 'controllers must not import models directly — go through a service',
}));

// Controllers that already violate the models rule. This list is the backlog:
// it only shrinks. Do not add to it — extract a service instead.
const LEGACY_CONTROLLERS = [
  'apps/api/src/modules/admissions/controllers/admissionController.js',
  'apps/api/src/modules/admissions/controllers/admissionTemplateController.js',
  'apps/api/src/modules/admissions/controllers/customFormController.js',
  'apps/api/src/modules/biometric/controllers/fingerprintController.js',
  'apps/api/src/modules/communication/controllers/complaintController.js',
  'apps/api/src/modules/communication/controllers/knowledgecenter.js',
  'apps/api/src/modules/communication/controllers/leaveController.js',
  'apps/api/src/modules/communication/controllers/noticeController.js',
  'apps/api/src/modules/documents/controllers/documentConfigController.js',
  'apps/api/src/modules/documents/controllers/documentController.js',
  'apps/api/src/modules/fees/controllers/*.js',
  'apps/api/src/modules/identity/controllers/authController.js',
  'apps/api/src/modules/notifications/controllers/*.js',
  'apps/api/src/modules/oases/controllers/*.js',
  'apps/api/src/modules/reportcards/controllers/*.js',
  'apps/api/src/modules/tenancy/controllers/schoolController.js',
];

module.exports = {
  root: true,
  env: { node: true, es2022: true, jest: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'script' },
  extends: ['eslint:recommended', 'plugin:import/recommended', 'prettier'],
  plugins: ['import'],

  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    'apps/web/',
    'apps/api/src-old/',
    'apps/api/public/',
    'apps/api/uploads/',
  ],

  settings: {
    'import/resolver': { node: { extensions: ['.js', '.json'] } },
  },

  rules: {
    'import/no-restricted-paths': ['error', { zones: [...crossModuleZones, coreZone] }],
    'import/no-unresolved': 'error',
    'import/no-self-import': 'error',

    // Config and seed files legitimately read process.env at require time
    'no-process-env': 'off',
    // Catches the require typo class that the boot check finds at runtime
    'no-undef': 'error',
    'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
    // Mongoose queries are frequently awaited in loops on purpose (ordered writes)
    'no-await-in-loop': 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
  },

  overrides: [
    {
      files: ['apps/api/src/modules/*/controllers/**/*.js'],
      excludedFiles: LEGACY_CONTROLLERS,
      rules: {
        'import/no-restricted-paths': [
          'error',
          { zones: [...crossModuleZones, coreZone, ...controllerZones] },
        ],
      },
    },
    {
      files: ['apps/api/tests/**/*.js', 'scripts/**/*.js', 'apps/api/seeds/**/*.js'],
      rules: { 'import/no-restricted-paths': 'off' },
    },
  ],
};
