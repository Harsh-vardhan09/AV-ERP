const payslipService = require('../services/payslipService');
const logger = require('../../../core/logging/logger.js');

/**
 * GET /api/v1/payroll/payslips
 * List payslips with filters (admin/accounts view)
 */
const list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const result = await payslipService.list(req.schoolId, req.query, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Payslips fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('payslipController.list', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch payslips',
    });
  }
};

/**
 * GET /api/v1/payroll/payslips/mine
 * Get own payslips (teacher self-service)
 */
const getMine = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await payslipService.getMine(req.schoolId, req.user._id, req.query, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Your payslips fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('payslipController.getMine', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch your payslips',
    });
  }
};

/**
 * GET /api/v1/payroll/payslips/:id
 * Get a single payslip by ID
 */
const getById = async (req, res) => {
  try {
    const payslip = await payslipService.getById(req.schoolId, req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Payslip fetched successfully',
      data: payslip,
    });
  } catch (error) {
    logger.error('payslipController.getById', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch payslip',
    });
  }
};

/**
 * GET /api/v1/payroll/payslips/:id/download
 * Download payslip PDF (returns signed S3 URL)
 */
const download = async (req, res) => {
  try {
    const result = await payslipService.download(req.schoolId, req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Payslip download URL generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('payslipController.download', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate download URL',
    });
  }
};

/**
 * POST /api/v1/payroll/payslips/:id/resend-email
 * Resend payslip email to employee
 */
const resendEmail = async (req, res) => {
  try {
    const result = await payslipService.resendEmail(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Payslip email resent successfully',
      data: result,
    });
  } catch (error) {
    logger.error('payslipController.resendEmail', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to resend payslip email',
    });
  }
};

/**
 * GET /api/v1/payroll/payslips/run/:payrollId/bulk-download
 * Bulk download all payslips for a payroll run as ZIP
 */
const bulkDownload = async (req, res) => {
  try {
    const payrollId = req.params.payrollId || req.params.id;
    const result = await payslipService.bulkDownload(req.schoolId, payrollId);
    return res.status(200).json({
      success: true,
      message: 'Bulk download initiated',
      data: result,
    });
  } catch (error) {
    logger.error('payslipController.bulkDownload', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to initiate bulk download',
    });
  }
};

module.exports = {
  list,
  getMine,
  getById,
  download,
  resendEmail,
  bulkDownload,
};
