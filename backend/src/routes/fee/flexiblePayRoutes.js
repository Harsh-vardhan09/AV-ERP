const express = require('express');
const router = express.Router();
const { flexiblePay, getFlexibleHistory } = require('../../controller/fee/flexiblePayController');
const { varifyToken } = require('../../middlewares/varifyToken');
const { authorizeRoles } = require('../../middlewares/authorizeRoles');

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
