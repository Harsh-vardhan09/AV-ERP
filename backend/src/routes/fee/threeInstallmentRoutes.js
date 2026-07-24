const express = require('express');
const router = express.Router();
const {
    getThreeInstallments,
    payThreeInstallment,
} = require('../../controller/fee/threeInstallmentController');
const { varifyToken } = require('../../middlewares/varifyToken');
const { authorizeRoles } = require('../../middlewares/authorizeRoles');

// GET /api/v1/three-installments/:studentFeeId
router.get(
    '/:studentFeeId',
    varifyToken,
    authorizeRoles('admin', 'operator', 'student'),
    getThreeInstallments
);

// POST /api/v1/three-installments/pay
router.post(
    '/pay',
    varifyToken,
    authorizeRoles('admin', 'operator', 'student'),
    payThreeInstallment
);

module.exports = router;
