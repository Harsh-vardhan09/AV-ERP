const attendanceService = require('../services/attendanceService');
const logger = require('../../../core/logging/logger.js');

/**
 * GET /api/v1/payroll/attendance
 * List teacher attendance records with filters
 */
const list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await attendanceService.list(req.schoolId, req.query, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Attendance records fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('attendanceController.list', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch attendance records',
    });
  }
};

/**
 * POST /api/v1/payroll/attendance
 * Mark attendance for a single teacher
 */
const markSingle = async (req, res) => {
  try {
    const record = await attendanceService.markSingle(req.schoolId, req.body, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: record,
    });
  } catch (error) {
    logger.error('attendanceController.markSingle', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to mark attendance',
    });
  }
};

/**
 * POST /api/v1/payroll/attendance/bulk
 * Mark attendance for multiple teachers at once
 */
const markBulk = async (req, res) => {
  try {
    const result = await attendanceService.markBulk(req.schoolId, req.body, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Bulk attendance marked successfully',
      data: result,
    });
  } catch (error) {
    logger.error('attendanceController.markBulk', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to mark bulk attendance',
    });
  }
};

/**
 * PUT /api/v1/payroll/attendance/:id
 * Edit an existing attendance record
 */
const edit = async (req, res) => {
  try {
    const record = await attendanceService.edit(req.schoolId, req.params.id, req.body, req.user._id);
    return res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: record,
    });
  } catch (error) {
    logger.error('attendanceController.edit', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update attendance record',
    });
  }
};

/**
 * GET /api/v1/payroll/attendance/summary
 * Get monthly attendance summary for all teachers (admin view)
 */
const getMonthlySummary = async (req, res) => {
  try {
    const result = await attendanceService.getMonthlySummary(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'Monthly attendance summary fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('attendanceController.getMonthlySummary', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch monthly summary',
    });
  }
};

/**
 * GET /api/v1/payroll/attendance/my-summary
 * Get own monthly attendance summary (teacher self-service)
 */
const getMyMonthlySummary = async (req, res) => {
  try {
    const result = await attendanceService.getMyMonthlySummary(req.schoolId, req.user._id, req.query);
    return res.status(200).json({
      success: true,
      message: 'Your monthly attendance summary fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('attendanceController.getMyMonthlySummary', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch your monthly summary',
    });
  }
};

const autoMarkMonthly = async (req, res) => {
  try {
    const result = await attendanceService.autoMarkMonthly(req.schoolId, req.body, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Monthly attendance auto-marked successfully',
      data: result,
    });
  } catch (error) {
    logger.error('attendanceController.autoMarkMonthly', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to auto-mark monthly attendance',
    });
  }
};

module.exports = {
  list,
  markSingle,
  markBulk,
  autoMarkMonthly,
  edit,
  getMonthlySummary,
  getMyMonthlySummary,
};
