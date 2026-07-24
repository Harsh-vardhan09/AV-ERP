const payrollService = require('../../services/payroll/payrollService');
const logger = require('../../utils/logger');

/**
 * SUCCESS: { success: true, message: "...", data: ... }
 * ERROR:   { success: false, message: "..." }
 */

const list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const result = await payrollService.list(req.schoolId, req.query, page, limit);

    return res.status(200).json({
      success: true,
      message: 'Payroll runs fetched successfully',
      data: result.data || result,
      meta: result.meta,
    });
  } catch (error) {
    logger.error('payrollController.list', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch payroll runs',
    });
  }
};

const initiate = async (req, res) => {
  try {
    const { month, year, workingDays, financialYear, regime } = req.body;

    // 1. Strict Request Validation
    if (!month || !year || !workingDays || !financialYear || !regime) {
      return res.status(400).json({
        success: false,
        message: 'month, year, workingDays, financialYear and regime are required',
      });
    }

    const payroll = await payrollService.initiate(
      req.schoolId,
      req.body,
      req.user._id
    );

    return res.status(201).json({
      success: true,
      message: 'Payroll run initiated successfully',
      data: payroll,
    });
  } catch (error) {
    logger.error('payrollController.initiate', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to initiate payroll run',
      details: error.details, // ✅ Pass validation details to frontend
    });
  }
};

const getById = async (req, res) => {
  try {
    const payroll = await payrollService.getById(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Payroll run fetched successfully',
      data: payroll,
    });
  } catch (error) {
    logger.error('payrollController.getById', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch payroll run',
    });
  }
};

const process = async (req, res) => {
  try {
    const result = await payrollService.process(
      req.schoolId,
      req.params.id,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: 'Payroll processing initiated',
      data: result,
    });
  } catch (error) {
    logger.error('payrollController.process', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to process payroll',
    });
  }
};

const getStatus = async (req, res) => {
  try {
    const status = await payrollService.getStatus(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Payroll status fetched successfully',
      data: status,
    });
  } catch (error) {
    logger.error('payrollController.getStatus', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch payroll status',
    });
  }
};

const approve = async (req, res) => {
  try {
    const payroll = await payrollService.approve(
      req.schoolId,
      req.params.id,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: 'Payroll approved successfully',
      data: payroll,
    });
  } catch (error) {
    logger.error('payrollController.approve', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to approve payroll',
    });
  }
};

const lock = async (req, res) => {
  try {
    const payroll = await payrollService.lock(
      req.schoolId,
      req.params.id,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: 'Payroll locked successfully',
      data: payroll,
    });
  } catch (error) {
    logger.error('payrollController.lock', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to lock payroll',
    });
  }
};

const cancel = async (req, res) => {
  try {
    const payroll = await payrollService.cancel(
      req.schoolId,
      req.params.id,
      req.user._id
    );

    return res.status(200).json({
      success: true,
      message: 'Payroll cancelled successfully',
      data: payroll,
    });
  } catch (error) {
    logger.error('payrollController.cancel', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to cancel payroll',
    });
  }
};

const generateTeacherPayroll = async (req, res) => {
  try {
    // payrollId is optional — required when called as part of a batch run,
    // but can be omitted for ad-hoc individual payslip generation
    const { teacherId, month, year, payrollId } = req.body;

    if (!teacherId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: 'teacherId, month, and year are required',
      });
    }

    const payslip = await payrollService.generateTeacherPayroll(
      req.schoolId,
      { teacherId, month, year, payrollId },
      req.user._id
    );

    return res.status(201).json({
      success: true,
      message: 'Payroll generated successfully for teacher',
      data: payslip,
    });
  } catch (error) {
    logger.error('payrollController.generateTeacherPayroll', { 
      error: error.message, 
      schoolId: req.schoolId,
      teacherId: req.body.teacherId 
    });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to generate teacher payroll',
    });
  }
};

module.exports = {
  generateTeacherPayroll,
  list,
  initiate,
  getById,
  process,
  getStatus,
  approve,
  lock,
  cancel,
};