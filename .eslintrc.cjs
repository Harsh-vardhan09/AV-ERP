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
//
// Own models only: another module's models are already unreachable via the zones
// above, and a glob `from` silently never matches on Windows because the rule
// feeds a backslash path straight to minimatch.
const controllerZones = MODULES.map((m) => ({
  target: `${API}/modules/${m}/controllers`,
  from: `${API}/modules/${m}/models`,
  message: 'controllers must not import models directly — go through a service',
}));

// Controllers that already violate the models rule. This list is the backlog:
// it only shrinks. Do not add to it — extract a service instead.
const LEGACY_CONTROLLERS = [
  // These arrived from src-old/controller during the migration. The violation is
  // not new — it was outside the linted tree until the files moved. The three
  // god-controllers leave this list as their functions are extracted.
  'apps/api/src/modules/academics/controllers/assignmentController.js',
  'apps/api/src/modules/academics/controllers/uploadAssignmentController.js',
  'apps/api/src/modules/people/controllers/adminController.js',
  'apps/api/src/modules/people/controllers/studentController.js',
  'apps/api/src/modules/people/controllers/teacherController.js',
  'apps/api/src/modules/admissions/controllers/admissionController.js',
  'apps/api/src/modules/admissions/controllers/admissionTemplateController.js',
  'apps/api/src/modules/admissions/controllers/customFormController.js',
  'apps/api/src/modules/biometric/controllers/fingerprintController.js',
  'apps/api/src/modules/communication/controllers/chat.js',
  'apps/api/src/modules/communication/controllers/complaintController.js',
  'apps/api/src/modules/communication/controllers/knowledgecenter.js',
  'apps/api/src/modules/communication/controllers/noticeController.js',
  'apps/api/src/modules/documents/controllers/documentConfigController.js',
  'apps/api/src/modules/documents/controllers/documentController.js',
  'apps/api/src/modules/fees/controllers/accountFeeController.js',
  'apps/api/src/modules/fees/controllers/billingPeriodController.js',
  'apps/api/src/modules/fees/controllers/feeHeadController.js',
  'apps/api/src/modules/fees/controllers/feeStructureController.js',
  'apps/api/src/modules/fees/controllers/fineController.js',
  'apps/api/src/modules/fees/controllers/flexiblePayController.js',
  'apps/api/src/modules/fees/controllers/ledgerController.js',
  'apps/api/src/modules/fees/controllers/razorpayController.js',
  'apps/api/src/modules/fees/controllers/reportController.js',
  'apps/api/src/modules/fees/controllers/studentFeeController.js',
  'apps/api/src/modules/fees/controllers/threeInstallmentController.js',
  'apps/api/src/modules/identity/controllers/authController.js',
  'apps/api/src/modules/notifications/controllers/notificationController.js',
  'apps/api/src/modules/notifications/controllers/notificationPreferenceController.js',
  'apps/api/src/modules/oases/controllers/assignmentController.js',
  'apps/api/src/modules/oases/controllers/auditController.js',
  'apps/api/src/modules/oases/controllers/conflictController.js',
  'apps/api/src/modules/oases/controllers/evaluationController.js',
  'apps/api/src/modules/oases/controllers/examConfigController.js',
  'apps/api/src/modules/oases/controllers/moderateController.js',
  'apps/api/src/modules/oases/controllers/questionSchemeController.js',
  'apps/api/src/modules/oases/controllers/reportController.js',
  'apps/api/src/modules/oases/controllers/resultController.js',
  'apps/api/src/modules/oases/controllers/uploadController.js',
  'apps/api/src/modules/people/controllers/studentManagementController.js',
  'apps/api/src/modules/people/controllers/teacherManagementController.js',
  'apps/api/src/modules/reportcards/controllers/dynamicReportController.js',
  'apps/api/src/modules/reportcards/controllers/reportCardController.js',
  'apps/api/src/modules/reportcards/controllers/reportTemplateController.js',
  'apps/api/src/modules/tenancy/controllers/superAdminController.js',
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
    // commonjs: true or this rule silently skips require() and only checks the
    // handful of dynamic imports. uuid v13 is ESM-only with an exports map the
    // legacy node resolver cannot read; it resolves fine at runtime.
    'import/no-unresolved': ['error', { commonjs: true, ignore: ['^uuid$'] }],
    'import/no-self-import': 'error',

    // Error: each of these is a crash or a silently discarded value, not a style
    // preference. Every current violation carries an inline disable and a TODO.
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
    'no-empty': ['error', { allowEmptyCatch: true }],

    // Warn: real cleanups, but ~130 of them across code that is mid-extraction.
    // Fixing them in bulk would bury the moves this refactor is making.
    'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
    'no-useless-escape': 'warn',
    'no-case-declarations': 'warn',
    'no-prototype-builtins': 'warn',
  },

  overrides: [
    {
      // The repo is CommonJS by default; .mjs files are the ESM exceptions,
      // such as the shared package's entry for apps/web.
      files: ['**/*.mjs'],
      parserOptions: { sourceType: 'module' },
    },
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
