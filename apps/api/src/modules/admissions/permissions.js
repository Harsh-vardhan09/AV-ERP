const ADMISSION_STAFF = ['admission', 'admin', 'teacher'];
const ADMIN_ADMISSION = ['admin', 'admission'];
const ADMIN_ONLY      = ['admin'];
const ANY_AUTHENTICATED = [];  // token required, no role check
const PUBLIC            = [];  // no token at all

const permissions = {
  // /api/v1/admission
  'admissions.otp.send':                ADMISSION_STAFF,
  'admissions.otp.verify':              ADMISSION_STAFF,
  'admissions.students.checkDuplicate': ADMISSION_STAFF,
  'admissions.students.register':       ADMISSION_STAFF,
  'admissions.students.view':           ADMISSION_STAFF,
  'admissions.students.update':         ADMISSION_STAFF,
  'admissions.students.activate':       ADMISSION_STAFF,
  'admissions.students.deactivate':     ADMISSION_STAFF,
  'admissions.students.list':           ADMISSION_STAFF,
  'admissions.students.exportExcel':    ADMIN_ADMISSION,
  'admissions.students.uploadPhoto':    ADMIN_ADMISSION,
  'admissions.teachers.register':       ADMISSION_STAFF,
  'admissions.teachers.view':           ADMISSION_STAFF,
  'admissions.teachers.update':         ADMISSION_STAFF,
  'admissions.teachers.activate':       ADMISSION_STAFF,
  'admissions.teachers.deactivate':     ADMISSION_STAFF,
  'admissions.teachers.list':           ADMISSION_STAFF,
  'admissions.schoolSettings.view':     ADMISSION_STAFF,
  'admissions.schoolSettings.update':   ADMISSION_STAFF,
  'admissions.schoolSettings.uploadLogo': ADMIN_ONLY,
  'admissions.formSettings.view':       ADMIN_ADMISSION,
  'admissions.formSettings.update':     ADMIN_ADMISSION,
  'admissions.formStudents.list':       ADMIN_ADMISSION,

  // /api/v1/admission-templates — read and PDF only; authoring lives in tenancy
  // under /api/super-admin/admission-templates/*
  'admissions.templates.stats':         ADMISSION_STAFF,
  'admissions.templates.active':        ADMISSION_STAFF,
  'admissions.templates.previewBody':   ADMISSION_STAFF,
  'admissions.templates.generatePdf':   ADMISSION_STAFF,
  'admissions.templates.downloadPdf':   ADMISSION_STAFF,
  'admissions.templates.list':          ADMISSION_STAFF,
  'admissions.templates.view':          ADMISSION_STAFF,
  'admissions.templates.previewSaved':  ADMISSION_STAFF,

  // /api/v1/custom-forms
  'admissions.customForms.submit':          PUBLIC,
  'admissions.customForms.predefinedFields': ADMIN_ONLY,
  'admissions.customForms.list':            ADMIN_ONLY,
  'admissions.customForms.listDeleted':     ADMIN_ONLY,
  'admissions.customForms.view':            ADMIN_ONLY,
  'admissions.customForms.create':          ADMIN_ONLY,
  'admissions.customForms.update':          ADMIN_ONLY,
  'admissions.customForms.delete':          ADMIN_ONLY,
  'admissions.customForms.toggleStatus':    ADMIN_ONLY,
  'admissions.customForms.restore':         ADMIN_ONLY,
  'admissions.customForms.leads':           ADMIN_ONLY,

  // /application — leave applications, not admissions. Carried here because the
  // mount rode along with this module; see module.js
  'admissions.leaveApplications.create': ANY_AUTHENTICATED,
  'admissions.leaveApplications.list':   ANY_AUTHENTICATED,
};

module.exports = permissions;
module.exports.ADMISSION_STAFF = ADMISSION_STAFF;
module.exports.ADMIN_ADMISSION = ADMIN_ADMISSION;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
