const express = require('express');
const router = express.Router();
const { flexiblePay, getFlexibleHistory } = require('../controllers/flexiblePayController');
const { varifyToken } = require('../../../core/security/authenticate.js');
const { authorizeRoles } = require('../../../core/security/authorizeRoles.js');

// POST /api/v1/flexible-pay — student or admin can record a flexible payment
router.post(
    '/',
    varifyToken,
    authorizeRoles('admin', 'operator', 'student'),
    flexiblePay
);

// GET /api/v1/flexible-pay/history/:studentFeeId
router.get(
    '/history/:studentFeeId',
    varifyToken,
    authorizeRoles('admin', 'operator', 'student'),
    getFlexibleHistory
);

module.exports = router;
