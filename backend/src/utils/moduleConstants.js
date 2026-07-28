/**
 * moduleConstants.js — SINGLE SOURCE OF TRUTH for all ERP modules.
 *
 * Used by:
 *  - SchoolSettings.js model (default modules shape)
 *  - checkModuleAccess.js middleware (validation)
 *  - superAdminController.js (toggle/create logic)
 *  - migrateModules.js script
 *
 * NEVER import from frontend code — Vite won't bundle this (Node.js only).
 * A mirror copy lives at frontend/src/utils/moduleConstants.js.
 */

const MODULES = {
  core: {
    key: 'core',
    label: 'Core ERP',
    description: 'Students, teachers, classes, attendance, marks',
    defaultEnabled: true,
    canDisable: false,
    icon: 'school',
  },
  fee_management: {
    key: 'fee_management',
    label: 'Fee Management',
    description: 'Fee structures, payments, receipts, Razorpay',
    defaultEnabled: true,
    canDisable: true,
    icon: 'payments',
  },
  report_cards: {
    key: 'report_cards',
    label: 'Report Cards',
    description: 'Report card generation and PDF export',
    defaultEnabled: true,
    canDisable: true,
    icon: 'description',
  },
  documents: {
    key: 'documents',
    label: 'Documents (TC/Migration)',
    description: 'Transfer and migration certificate generation',
    defaultEnabled: true,
    canDisable: true,
    icon: 'article',
  },
  oases: {
    key: 'oases',
    label: 'OASES Evaluation',
    description: 'Answer sheet scanning and evaluation system',
    defaultEnabled: false,
    canDisable: true,
    icon: 'auto_stories',
  },
  biometric: {
    key: 'biometric',
    label: 'Biometric Attendance',
    description: 'Fingerprint device integration and faculty attendance',
    defaultEnabled: false,
    canDisable: true,
    icon: 'fingerprint',
  },
  communication: {
    key: 'communication',
    label: 'Communication',
    description: 'Chat, notices, complaints, events, knowledge center',
    defaultEnabled: true,
    canDisable: true,
    icon: 'chat',
  },
  assignments: {
    key: 'assignments',
    label: 'Assignments',
    description: 'Teacher assignments and student submissions',
    defaultEnabled: true,
    canDisable: true,
    icon: 'assignment',
  },
};

/** DEFAULT_MODULES — used when creating new schools or migrating existing ones */
const DEFAULT_MODULES = {};
Object.keys(MODULES).forEach((key) => {
  DEFAULT_MODULES[key] = MODULES[key].defaultEnabled;
});
// Result: { core:true, fee_management:true, report_cards:true, documents:true,
//            oases:false, biometric:false, communication:true, assignments:true }

/** MODULE_KEYS — ordered list of all valid module keys */
const MODULE_KEYS = Object.keys(MODULES);

/**
 * isModuleEnabled
 *
 * Safe helper to check if a module is active for a given school's
 * settings.modules object (which may be null/undefined for legacy docs).
 *
 * If the school's modules document doesn't have the key yet, fall back
 * to the module's defaultEnabled value.
 */
const isModuleEnabled = (schoolModules, moduleKey) => {
  if (!schoolModules) return MODULES[moduleKey]?.defaultEnabled ?? false;
  if (typeof schoolModules[moduleKey] === 'undefined') {
    return MODULES[moduleKey]?.defaultEnabled ?? false;
  }
  return schoolModules[moduleKey] === true;
};

module.exports = { MODULES, DEFAULT_MODULES, MODULE_KEYS, isModuleEnabled };
