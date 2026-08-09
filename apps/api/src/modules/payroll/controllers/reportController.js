const reportService = require('../services/reportService');
const logger = require('../../../core/logging/logger.js');

/**
 * GET /api/v1/payroll/reports/monthly-summary
 * Get monthly payroll summary report
 */
const monthlySummary = async (req, res) => {
  try {
    const result = await reportService.monthlySummary(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'Monthly summary report generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('reportController.monthlySummary', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate monthly summary',
    });
  }
};

/**
 * GET /api/v1/payroll/reports/department-breakdown
 * Get payroll breakdown by department
 */
const departmentBreakdown = async (req, res) => {
  try {
    const result = await reportService.departmentBreakdown(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'Department breakdown report generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('reportController.departmentBreakdown', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate department breakdown',
    });
  }
};

/**
 * GET /api/v1/payroll/reports/tds-summary
 * Get TDS summary report
 */
const tdsSummary = async (req, res) => {
  try {
    const result = await reportService.tdsSummary(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'TDS summary report generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('reportController.tdsSummary', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate TDS summary',
    });
  }
};

/**
 * GET /api/v1/payroll/reports/pf-register
 * Get PF register report
 */
const pfRegister = async (req, res) => {
  try {
    const result = await reportService.pfRegister(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'PF register report generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('reportController.pfRegister', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate PF register',
    });
  }
};

/**
 * GET /api/v1/payroll/reports/esi-register
 * Get ESI register report
 */
const esiRegister = async (req, res) => {
  try {
    const result = await reportService.esiRegister(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'ESI register report generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('reportController.esiRegister', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate ESI register',
    });
  }
};

/**
 * GET /api/v1/payroll/reports/ytd
 * Get year-to-date payroll report
 */
const ytd = async (req, res) => {
  try {
    const result = await reportService.ytd(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'Year-to-date report generated successfully',
      data: result,
    });
  } catch (error) {
    logger.error('reportController.ytd', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate YTD report',
    });
  }
};

/**
 * POST /api/v1/payroll/reports/export
 * Initiate async export of a report (Excel/CSV)
 */
const exportReport = async (req, res) => {
  try {
    const result = await reportService.exportReport(req.schoolId, req.body, req.user._id);
    return res.status(200).json({
      success: true,
      message: 'Report export initiated',
      data: result,
    });
  } catch (error) {
    logger.error('reportController.exportReport', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to initiate report export',
    });
  }
};

/**
 * GET /api/v1/payroll/reports/export/:jobId/status
 * Check status of an async report export job
 */
const getExportStatus = async (req, res) => {
  try {
    const result = await reportService.getExportStatus(req.params.jobId);
    return res.status(200).json({
      success: true,
      message: 'Export status fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('reportController.getExportStatus', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch export status',
    });
  }
};

module.exports = {
  monthlySummary,
  departmentBreakdown,
  tdsSummary,
  pfRegister,
  esiRegister,
  ytd,
  exportReport,
  getExportStatus,
};
