const ADMIN_ONLY       = ['admin'];
const ADMIN_ACCOUNTS   = ['admin', 'accounts'];
const ADMIN_ACC_TEACHER = ['admin', 'accounts', 'teacher'];
// varifyToken is applied in app.js; these routes add no authorize() of their own
const ANY_AUTHENTICATED = [];

const permissions = {
  // /components — salary components
  'payroll.components.list':   ADMIN_ACCOUNTS,
  'payroll.components.view':   ADMIN_ACCOUNTS,
  'payroll.components.create': ADMIN_ONLY,
  'payroll.components.update': ADMIN_ONLY,
  'payroll.components.toggle': ADMIN_ONLY,
  'payroll.components.seed':   ADMIN_ONLY,

  // /structures — salary structures
  'payroll.structures.list':   ADMIN_ACCOUNTS,
  'payroll.structures.view':   ADMIN_ACCOUNTS,
  'payroll.structures.create': ADMIN_ONLY,
  'payroll.structures.update': ADMIN_ONLY,
  'payroll.structures.clone':  ADMIN_ONLY,
  'payroll.structures.delete': ADMIN_ONLY,

  // /employee-salaries
  'payroll.employeeSalaries.list':       ADMIN_ACCOUNTS,
  'payroll.employeeSalaries.assign':     ADMIN_ACCOUNTS,
  'payroll.employeeSalaries.unassigned': ADMIN_ACCOUNTS,
  'payroll.employeeSalaries.current':    ADMIN_ACCOUNTS,
  'payroll.employeeSalaries.history':    ADMIN_ACCOUNTS,
  'payroll.employeeSalaries.revise':     ADMIN_ACCOUNTS,

  // /tax-config
  'payroll.taxConfig.list':     ADMIN_ONLY,
  'payroll.taxConfig.active':   ADMIN_ACCOUNTS,
  'payroll.taxConfig.template': ADMIN_ONLY,
  'payroll.taxConfig.view':     ADMIN_ACCOUNTS,
  'payroll.taxConfig.create':   ADMIN_ONLY,
  'payroll.taxConfig.update':   ADMIN_ONLY,
  'payroll.taxConfig.toggle':   ADMIN_ONLY,
  'payroll.taxConfig.seed':     ADMIN_ONLY,

  // /attendance — staff attendance feeding payroll deductions
  'payroll.attendance.list':            ADMIN_ONLY,
  'payroll.attendance.mark':            ADMIN_ONLY,
  'payroll.attendance.markBulk':        ADMIN_ONLY,
  'payroll.attendance.autoMarkMonthly': ADMIN_ONLY,
  'payroll.attendance.summary':         ADMIN_ACCOUNTS,
  'payroll.attendance.mySummary':       ADMIN_ACC_TEACHER,
  'payroll.attendance.update':          ADMIN_ONLY,

  // /runs — payroll runs
  'payroll.runs.list':          ADMIN_ACCOUNTS,
  'payroll.runs.create':        ADMIN_ACCOUNTS,
  'payroll.runs.view':          ADMIN_ACCOUNTS,
  'payroll.runs.process':       ADMIN_ACCOUNTS,
  'payroll.runs.status':        ADMIN_ACCOUNTS,
  'payroll.runs.approve':       ADMIN_ACCOUNTS,
  'payroll.runs.lock':          ADMIN_ACCOUNTS,
  'payroll.runs.cancel':        ADMIN_ACCOUNTS,
  'payroll.runs.bulkDownload':  ADMIN_ACCOUNTS,
  'payroll.runs.generate':      ADMIN_ACCOUNTS,

  // /payslips
  'payroll.payslips.list':        ADMIN_ACCOUNTS,
  'payroll.payslips.mine':        ADMIN_ACC_TEACHER,
  'payroll.payslips.view':        ADMIN_ACC_TEACHER,
  'payroll.payslips.download':    ADMIN_ACC_TEACHER,
  'payroll.payslips.resendEmail': ADMIN_ONLY,

  // /payment-batches
  'payroll.paymentBatches.create':   ADMIN_ONLY,
  'payroll.paymentBatches.list':     ADMIN_ACCOUNTS,
  'payroll.paymentBatches.submit':   ADMIN_ONLY,
  'payroll.paymentBatches.download': ADMIN_ONLY,

  // /reports
  'payroll.reports.monthlySummary':       ADMIN_ACCOUNTS,
  'payroll.reports.departmentBreakdown':  ADMIN_ACCOUNTS,
  'payroll.reports.tdsSummary':           ADMIN_ACCOUNTS,
  'payroll.reports.pfRegister':           ADMIN_ACCOUNTS,
  'payroll.reports.esiRegister':          ADMIN_ACCOUNTS,
  'payroll.reports.ytd':                  ADMIN_ACCOUNTS,
  'payroll.reports.export':               ADMIN_ACCOUNTS,
  'payroll.reports.exportStatus':         ADMIN_ACCOUNTS,

  // /bank-files — NOTE: these two carry no authorize() call. Their route file says
  // roles are enforced upstream, but app.js applies varifyToken only. Recorded as
  // observed, not as intended — see the migration report.
  'payroll.bankFiles.generate': ANY_AUTHENTICATED,
  'payroll.bankFiles.list':     ANY_AUTHENTICATED,
};

module.exports = permissions;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
module.exports.ADMIN_ACCOUNTS = ADMIN_ACCOUNTS;
module.exports.ADMIN_ACC_TEACHER = ADMIN_ACC_TEACHER;
