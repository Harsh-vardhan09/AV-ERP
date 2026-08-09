const express = require('express');
const router = express.Router();
const {
    getThreeInstallments,
    payThreeInstallment,
} = require('../controllers/threeInstallmentController');
const { varifyToken } = require('../../../core/security/authenticate.js');
const { authorizeRoles } = require('../../../core/security/authorizeRoles.js');

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
