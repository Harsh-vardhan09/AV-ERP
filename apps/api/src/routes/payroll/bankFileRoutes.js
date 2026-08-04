const express = require('express');
const router = express.Router();
const bankFileController = require('../../controller/payroll/bankFileController');

// Auth & role enforcement applied upstream by index.js before this router

/**
 * @route POST /api/v1/payroll/bank-files
 * @desc Generate bank transfer CSV
 */
router.post('/', bankFileController.generateBankFile);

/**
 * @route GET /api/v1/payroll/bank-files/:payrollId
 * @desc List payment batches for a payroll
 */
router.get('/:payrollId', bankFileController.listBatches);

module.exports = router;

