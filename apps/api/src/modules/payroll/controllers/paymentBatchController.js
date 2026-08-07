const paymentBatchService = require('../services/paymentBatchService');
const logger = require('../../../core/logging/logger.js');

/**
 * POST /api/v1/payroll/payment-batches
 * Generate a new payment batch for a payroll run
 */
const generate = async (req, res) => {
  try {
    const batch = await paymentBatchService.generate(req.schoolId, req.body, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Payment batch generated successfully',
      data: batch,
    });
  } catch (error) {
    logger.error('paymentBatchController.generate', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate payment batch',
    });
  }
};

/**
 * GET /api/v1/payroll/payment-batches/:payrollId
 * Get payment batches for a specific payroll run
 */
const getByPayrollId = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await paymentBatchService.getByPayrollId(req.schoolId, req.params.payrollId, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Payment batches fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('paymentBatchController.getByPayrollId', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch payment batches',
    });
  }
};

/**
 * PATCH /api/v1/payroll/payment-batches/:id/submit
 * Mark a payment batch as submitted to bank
 */
const markSubmitted = async (req, res) => {
  try {
    const batch = await paymentBatchService.markSubmitted(req.schoolId, req.params.id, req.user._id);
    return res.status(200).json({
      success: true,
      message: 'Payment batch marked as submitted',
      data: batch,
    });
  } catch (error) {
    logger.error('paymentBatchController.markSubmitted', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to mark batch as submitted',
    });
  }
};

/**
 * GET /api/v1/payroll/payment-batches/:id/download
 * Download payment batch file (NEFT CSV)
 */
const download = async (req, res) => {
  try {
    const result = await paymentBatchService.download(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Payment batch download URL generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('paymentBatchController.download', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate download URL',
    });
  }
};

module.exports = {
  generate,
  getByPayrollId,
  markSubmitted,
  download,
};
