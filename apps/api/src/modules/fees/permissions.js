const ADMIN_ONLY     = ['admin'];
const ADMIN_OPERATOR = ['admin', 'operator'];
const ADMIN_OP_STUDENT = ['admin', 'operator', 'student'];
const OPERATOR_ONLY  = ['operator'];
const PUBLIC         = [];  // no token — see the razorpay webhook note below

const permissions = {
  // /fee-heads
  'fees.heads.list':   ADMIN_OPERATOR,
  'fees.heads.create': ADMIN_ONLY,
  'fees.heads.update': ADMIN_ONLY,
  'fees.heads.delete': ADMIN_ONLY,

  // /fee-structures
  'fees.structures.list':   ADMIN_OPERATOR,
  'fees.structures.view':   ADMIN_OPERATOR,
  'fees.structures.create': ADMIN_ONLY,
  'fees.structures.update': ADMIN_ONLY,
  'fees.structures.delete': ADMIN_ONLY,

  // /student-fees
  'fees.studentFees.assign':           ADMIN_OPERATOR,
  'fees.studentFees.summary':          ADMIN_OP_STUDENT,
  'fees.studentFees.backfill':         ADMIN_ONLY,
  'fees.studentFees.classStatus':      ADMIN_OPERATOR,
  'fees.studentFees.collect':          ADMIN_OPERATOR,
  'fees.studentFees.setPreviousDues':  ADMIN_ONLY,

  // /payments
  'fees.payments.create':          OPERATOR_ONLY,
  'fees.payments.listByAccount':   ADMIN_OP_STUDENT,
  'fees.payments.list':            ADMIN_OPERATOR,
  'fees.payments.receipt':         ADMIN_OP_STUDENT,
  'fees.payments.razorpayOrder':   ADMIN_OP_STUDENT,
  'fees.payments.razorpayVerify':  ADMIN_OP_STUDENT,
  // Razorpay calls this with no JWT; it is HMAC-verified in the controller
  'fees.payments.razorpayWebhook': PUBLIC,

  // /installments
  'fees.installments.applyFines':     ADMIN_ONLY,
  'fees.installments.overdueSummary': ADMIN_ONLY,
  'fees.installments.listByStudent':  ADMIN_OP_STUDENT,

  // /account-fees
  'fees.accountFees.create':     ADMIN_OPERATOR,
  'fees.accountFees.summary':    ADMIN_OPERATOR,
  'fees.accountFees.bulkAssign': ADMIN_ONLY,

  // /billing-periods
  'fees.billingPeriods.list':     ADMIN_OPERATOR,
  'fees.billingPeriods.view':     ADMIN_OPERATOR,
  'fees.billingPeriods.create':   ADMIN_ONLY,
  'fees.billingPeriods.activate': ADMIN_ONLY,
  'fees.billingPeriods.lock':     ADMIN_ONLY,
  'fees.billingPeriods.unlock':   ADMIN_ONLY,
  'fees.billingPeriods.delete':   ADMIN_ONLY,

  // /ledger
  'fees.ledger.viewByStudentFee': ADMIN_OP_STUDENT,

  // /reports
  'fees.reports.dashboard':            ADMIN_OPERATOR,
  'fees.reports.pending':              ADMIN_OPERATOR,
  'fees.reports.paid':                 ADMIN_OPERATOR,
  'fees.reports.collection':           ADMIN_OPERATOR,
  'fees.reports.billingPeriodSummary': ADMIN_OPERATOR,

  // /refunds
  'fees.refunds.request':       ADMIN_OPERATOR,
  'fees.refunds.approve':       ADMIN_ONLY,
  'fees.refunds.reject':        ADMIN_ONLY,
  'fees.refunds.process':       ADMIN_ONLY,
  'fees.refunds.listByPayment': ADMIN_OPERATOR,
  'fees.refunds.listByAccount': ADMIN_OPERATOR,

  // /sessions
  'fees.sessions.list':     ADMIN_OPERATOR,
  'fees.sessions.create':   ADMIN_ONLY,
  'fees.sessions.view':     ADMIN_OPERATOR,
  'fees.sessions.delete':   ADMIN_ONLY,
  'fees.sessions.activate': ADMIN_ONLY,

  // /flexible-pay
  'fees.flexiblePay.pay':     ADMIN_OP_STUDENT,
  'fees.flexiblePay.history': ADMIN_OP_STUDENT,

  // /three-installments
  'fees.threeInstallments.view': ADMIN_OP_STUDENT,
  'fees.threeInstallments.pay':  ADMIN_OP_STUDENT,
};

module.exports = permissions;
module.exports.ADMIN_ONLY = ADMIN_ONLY;
module.exports.ADMIN_OPERATOR = ADMIN_OPERATOR;
module.exports.ADMIN_OP_STUDENT = ADMIN_OP_STUDENT;
module.exports.OPERATOR_ONLY = OPERATOR_ONLY;
