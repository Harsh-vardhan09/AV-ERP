const employeeSalaryService = require('../../services/payroll/employeeSalaryService');
const logger = require('../../utils/logger');

/**
 * GET /api/v1/payroll/employee-salaries
 * List all employee salary assignments with pagination
 */
const list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await employeeSalaryService.list(req.schoolId, req.query, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Employee salaries fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('employeeSalaryController.list', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch employee salaries',
    });
  }
};

/**
 * POST /api/v1/payroll/employee-salaries
 * Assign a salary structure to an employee with optional overrides
 * Requirement: "Return: { success: true, data: employeeSalary }"
 */
const assign = async (req, res) => {
  try {
    const { teacherId, salaryStructureId, academicYearId, effectiveFrom } = req.body;

    // 1. Validation
    if (!teacherId || !salaryStructureId || !academicYearId) {
      return res.status(400).json({
        success: false,
        message: 'teacherId, salaryStructureId, and academicYearId are required',
      });
    }

    // 2. Service Call
    const employeeSalary = await employeeSalaryService.assign(
      req.schoolId, 
      req.body, 
      req.user._id
    );

    // 3. Response
    return res.status(201).json({
      success: true,
      data: employeeSalary,
    });
  } catch (error) {
    logger.error('employeeSalaryController.assign', { 
      error: error.message, 
      stack: error.stack,
      schoolId: req.schoolId 
    });
    
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to assign salary',
    });
  }
};

/**
 * GET /api/v1/payroll/employee-salaries/:teacherId/current
 * Get the current active salary for an employee
 */
const getCurrent = async (req, res) => {
  try {
    const salary = await employeeSalaryService.getCurrent(req.schoolId, req.params.teacherId);
    return res.status(200).json({
      success: true,
      message: 'Current employee salary fetched successfully',
      data: salary,
    });
  } catch (error) {
    logger.error('employeeSalaryController.getCurrent', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch current salary',
    });
  }
};

/**
 * GET /api/v1/payroll/employee-salaries/:teacherId/history
 * Get full salary revision history for an employee
 */
const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await employeeSalaryService.getHistory(req.schoolId, req.params.teacherId, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Employee salary history fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('employeeSalaryController.getHistory', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch salary history',
    });
  }
};

/**
 * POST /api/v1/payroll/employee-salaries/:teacherId/revise
 * Create a salary revision for an employee
 */
const revise = async (req, res) => {
  try {
    const { teacherId, salaryStructureId, revisionReason } = req.body;

    if (!teacherId || !salaryStructureId || !revisionReason) {
      return res.status(400).json({
        success: false,
        message: 'teacherId, salaryStructureId, and revisionReason are required',
      });
    }

    const result = await employeeSalaryService.revise(req.schoolId, req.body, req.user._id);

    return res.status(201).json({
      success: true,
      message: 'Salary revised successfully',
      data: {
        oldSalaryId: result.oldSalaryId,
        newSalaryId: result.newSalaryId,
        monthlyGross: result.monthlyGross,
        annualCTC: result.annualCTC,
      },
    });
  } catch (error) {
    logger.error('employeeSalaryController.revise', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to revise salary',
    });
  }
};

/**
 * GET /api/v1/payroll/employee-salaries/unassigned
 * Get list of employees without salary assignment
 */
const getUnassigned = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await employeeSalaryService.getUnassigned(req.schoolId, page, limit);
    return res.status(200).json({
      success: true,
      message: 'Unassigned employees fetched successfully',
      data: result,
    });
  } catch (error) {
    logger.error('employeeSalaryController.getUnassigned', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch unassigned employees',
    });
  }
};

module.exports = {
  list,
  assign,
  getCurrent,
  getHistory,
  revise,
  getUnassigned,
};
