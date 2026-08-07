const express = require('express');
const router = express.Router();

const { varifyToken }    = require('../../../core/security/authenticate.js');
const { authorizeRoles } = require('../../../core/security/authorizeRoles.js');
const { checkModuleAccess } = require('../../../core/security/moduleGate.js');

// Plain Express Routers (self-contained auth)
const feeHeadRoutes          = require('./feeHeadRoutes');
const studentFeeRoutes       = require('./studentFeeRoutes');
const installmentRoutes      = require('./installmentRoutes');
const ledgerRoutes           = require('./ledgerRoutes');
const sessionRoutes          = require('./sessionRoutes');
const flexiblePayRoutes      = require('./flexiblePayRoutes');       // NEW
const threeInstallmentRoutes = require('./threeInstallmentRoutes'); // NEW

// Route Factories (must be called with auth config)
const feeStructureRoutesFactory  = require('./feeStructureRoutes');
const paymentRoutesFactory       = require('./paymentRoutes');
const accountFeeRoutesFactory    = require('./accountFeeRoutes');
const billingPeriodRoutesFactory = require('./billingPeriodRoutes');
const reportRoutesFactory        = require('./reportRoutes');
const refundRoutesFactory        = require('./refundRoutes');

// Auth config passed to route factories
const auth = {
    authenticate: varifyToken,
    authorize: (...roles) => authorizeRoles(...roles),
};

// Global middleware
// varifyToken MUST run before checkModuleAccess so req.schoolId is set. Mounted the
// other way round the guard hits its no-school-context escape and gates nothing.
router.use(varifyToken);
router.use(checkModuleAccess('fee_management'));


// Mount Routes
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
