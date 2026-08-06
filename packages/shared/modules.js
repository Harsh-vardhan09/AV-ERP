// Single source of truth for the ERP module registry, shared by apps/api and
// apps/web. CommonJS so Node can require it and Vite can pre-bundle it — do not
// add imports here, it must stay dependency-free to bundle for the browser.
//
// Keys are persisted in SchoolSettings.modules documents. Never rename one
// without a migration; adding a key is safe.
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
  payroll: {
    key: 'payroll',
    label: 'Payroll',
    description: 'Staff salary, payslips, tax config and bank files',
    defaultEnabled: true,
    canDisable: true,
    icon: 'account_balance_wallet',
  },
  library: {
    key: 'library',
    label: 'Library',
    description: 'Book catalogue, issue and return, librarian accounts',
    defaultEnabled: true,
    canDisable: true,
    icon: 'menu_book',
  },
  imports: {
    key: 'imports',
    label: 'Bulk Import',
    description: 'CSV and XLSX import of students, teachers, fees, attendance',
    defaultEnabled: true,
    canDisable: true,
    icon: 'upload_file',
  },
  admissions: {
    key: 'admissions',
    label: 'Admissions',
    description: 'Admission forms, templates and applicant registration',
    defaultEnabled: true,
    canDisable: true,
    icon: 'how_to_reg',
  },
  custom_forms: {
    key: 'custom_forms',
    label: 'Custom Forms',
    description: 'School-built enquiry forms and their leads',
    defaultEnabled: true,
    canDisable: true,
    icon: 'dynamic_form',
  },
};

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
