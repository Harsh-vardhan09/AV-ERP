const express = require('express');
const router = express.Router();

const { varifyToken }    = require('../middlewares/varifyToken');
const { authorizeRoles } = require('../middlewares/authorizeRoles');
const { checkModuleAccess } = require('../middlewares/checkModuleAccess');

// ─── Plain Express Routers (self-contained auth) ──────────────────────────────
const feeHeadRoutes          = require('./fee/feeHeadRoutes');
const studentFeeRoutes       = require('./fee/studentFeeRoutes');
const installmentRoutes      = require('./fee/installmentRoutes');
const ledgerRoutes           = require('./fee/ledgerRoutes');
const sessionRoutes          = require('./fee/sessionRoutes');
const flexiblePayRoutes      = require('./fee/flexiblePayRoutes');       // NEW
const threeInstallmentRoutes = require('./fee/threeInstallmentRoutes'); // NEW

// ─── Route Factories (must be called with auth config) ───────────────────────
const feeStructureRoutesFactory  = require('./fee/feeStructureRoutes');
const paymentRoutesFactory       = require('./fee/paymentRoutes');
const accountFeeRoutesFactory    = require('./fee/accountFeeRoutes');
const billingPeriodRoutesFactory = require('./fee/billingPeriodRoutes');
const reportRoutesFactory        = require('./fee/reportRoutes');
const refundRoutesFactory        = require('./fee/refundRoutes');

// Auth config passed to route factories
const auth = {
    authenticate: varifyToken,
    authorize: (...roles) => authorizeRoles(...roles),
};

// ─── Global middleware ────────────────────────────────────────────────────────
// FIX HIGH-6: varifyToken MUST run before checkModuleAccess so req.schoolId is
// set. Previously, unauthenticated requests reached fee routes because the module
// guard silently passed when schoolId was missing (undefined → next()).
router.use(varifyToken);
router.use(checkModuleAccess('fee_management'));


// ─── Mount Routes ─────────────────────────────────────────────────────────────
router.use('/fee-heads',          feeHeadRoutes);
router.use('/fee-structures',     feeStructureRoutesFactory(auth));
router.use('/student-fees',       studentFeeRoutes);
router.use('/payments',           paymentRoutesFactory(auth));
router.use('/installments',       installmentRoutes);
router.use('/account-fees',       accountFeeRoutesFactory(auth));
router.use('/billing-periods',    billingPeriodRoutesFactory(auth));
router.use('/ledger',             ledgerRoutes);
router.use('/reports',            reportRoutesFactory(auth));
router.use('/refunds',            refundRoutesFactory(auth));
router.use('/sessions',           sessionRoutes);
router.use('/flexible-pay',       flexiblePayRoutes);         // NEW
router.use('/three-installments', threeInstallmentRoutes);    // NEW

module.exports = router;
