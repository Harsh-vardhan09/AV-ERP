/**
 * moduleConstants.js — Frontend mirror of backend/src/utils/moduleConstants.js
 *
 * IMPORTANT: Keep in sync with the backend version manually.
 * Cannot import the backend file directly in Vite/React.
 *
 * Used by:
 *  - moduleSettingsSlice.js (initial state / defaults)
 *  - SchoolModules.jsx (module metadata for rendering)
 *  - DashboardLayout.jsx (sidebar filtering)
 */

export const MODULE_KEYS = [
  'core',
  'fee_management',
  'report_cards',
  'documents',
  'oases',
  'biometric',
  'communication',
  'assignments',
];

export const MODULES = {
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

/** DEFAULT_MODULES — { core:true, fee_management:true, ..., oases:false, biometric:false } */
export const DEFAULT_MODULES = Object.fromEntries(
  Object.entries(MODULES).map(([k, v]) => [k, v.defaultEnabled])
);
