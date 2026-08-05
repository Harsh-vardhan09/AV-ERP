/**
 * Report Service
 * MongoDB aggregation pipelines for payroll reports
 * Always filters by schoolId + date range, uses .lean() on all queries
 */
const Payslip = require('../../models/Payslip');
const Payroll = require('../../models/Payroll');
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * @param {string} schoolId
 * @param {Object} query - month, year
 * @returns {Object} Monthly payroll summary
 */
const monthlySummary = async (schoolId, query = {}) => {
  const month = parseInt(query.month);
  const year = parseInt(query.year);
  if (!month || !year) {
    const error = new Error('month and year are required');
    error.statusCode = 400; throw error;
  }
  const result = await Payslip.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), month, year } },
    { $group: {
      _id: null,
      totalEmployees: { $sum: 1 },
      totalGross: { $sum: '$grossEarnings' },
      totalDeductions: { $sum: '$totalDeductions' },
      totalNet: { $sum: '$netPayable' },
      totalTDS: { $sum: '$tdsAmount' },
      totalPF: { $sum: '$pfEmployeeAmount' },
      avgSalary: { $avg: '$netPayable' },
    }},
  ]);
  return result[0] || { totalEmployees: 0, totalGross: 0, totalDeductions: 0, totalNet: 0 };
};

/**
 * @param {string} schoolId
 * @param {Object} query - month, year
 * @returns {Array} Department-wise breakdown
 */
const departmentBreakdown = async (schoolId, query = {}) => {
  const month = parseInt(query.month);
  const year = parseInt(query.year);
  
  if (!month || !year) {
    const error = new Error('month and year are required');
    error.statusCode = 400; throw error;
  }

  // Optimized: Uses denormalized 'department' field + index
  const result = await Payslip.aggregate([
    { 
      $match: { 
        schoolId: new mongoose.Types.ObjectId(schoolId), 
        month, 
        year,
        status: { $ne: 'cancelled' }
      } 
    },
    { 
      $group: {
        _id: '$department',
        employeeCount: { $sum: 1 },
        totalGross: { $sum: '$grossEarnings' },
        totalDeductions: { $sum: '$totalDeductions' },
        totalNet: { $sum: '$netPayable' },
      }
    },
    { $sort: { totalNet: -1 } }
  ]);

  return result;
};

/**
 * @param {string} schoolId
 * @param {Object} query - month, year OR financialYear
 * @returns {Array} TDS summary per employee
 */
const tdsSummary = async (schoolId, query = {}) => {
  const matchStage = { 
    schoolId: new mongoose.Types.ObjectId(schoolId), 
    tdsAmount: { $gt: 0 },
    status: { $ne: 'cancelled' }
  };

  if (query.month) matchStage.month = parseInt(query.month);
  if (query.year) matchStage.year = parseInt(query.year);

  const result = await Payslip.aggregate([
    { $match: matchStage },
    {
      $group: { 
        _id: '$teacherId', 
        employeeName: { $first: '$employeeName' }, // Requires employeeName denormalization or lookup
        employeeId: { $first: '$employeeId' },
        totalTDS: { $sum: '$tdsAmount' }, 
        totalTaxableIncome: { $sum: '$grossEarnings' },
        count: { $sum: 1 } 
      } 
    },
    { $lookup: { from: 'teacherprofiles', localField: '_id', foreignField: '_id', as: 'teacher' } },
    { $unwind: '$teacher' },
    { 
      $project: { 
        name: { $concat: ['$teacher.firstName', ' ', '$teacher.lastName'] },
        employeeId: 1,
        panNumber: { $ifNull: ['$teacher.panNumber', '$teacher.panCard'] },
        totalTDS: 1, 
        totalTaxableIncome: 1 
      } 
    },
    { $sort: { name: 1 } }
  ]);
  return result;
};

/**
 * @param {string} schoolId
 * @param {Object} query - month, year
 * @returns {Array} PF register
 */
const pfRegister = async (schoolId, query = {}) => {
  const month = parseInt(query.month);
  const year = parseInt(query.year);

  const result = await Payslip.aggregate([
    { 
      $match: { 
        schoolId: new mongoose.Types.ObjectId(schoolId), 
        month, 
        year, 
        pfEmployeeAmount: { $gt: 0 },
        status: { $ne: 'cancelled' }
      } 
    },
    { $lookup: { from: 'teacherprofiles', localField: 'teacherId', foreignField: '_id', as: 'teacher' } },
    { $unwind: '$teacher' },
    { 
      $project: {
        employeeId: 1,
        name: { $concat: ['$teacher.firstName', ' ', '$teacher.lastName'] },
        uan: '$teacher.uanNumber',
        pfWage: '$pfWage',
        employeeContribution: '$pfEmployeeAmount', 
        employerContribution: '$pfEmployerAmount',
        gross: '$grossEarnings'
      }
    },
    { $sort: { employeeId: 1 } }
  ]);
  return result;
};

/**
 * @param {string} schoolId
 * @param {Object} query - month, year
 * @returns {Array} ESI register
 */
const esiRegister = async (schoolId, query = {}) => {
  const month = parseInt(query.month);
  const year = parseInt(query.year);

  const result = await Payslip.aggregate([
    { 
      $match: { 
        schoolId: new mongoose.Types.ObjectId(schoolId), 
        month, 
        year, 
        esiApplicable: true,
        status: { $ne: 'cancelled' }
      } 
    },
    { $lookup: { from: 'teacherprofiles', localField: 'teacherId', foreignField: '_id', as: 'teacher' } },
    { $unwind: '$teacher' },
    { 
      $project: {
        employeeId: 1,
        name: { $concat: ['$teacher.firstName', ' ', '$teacher.lastName'] },
        esiNumber: '$teacher.esiNumber',
        gross: '$grossEarnings', 
        employeeContribution: '$esiEmployeeAmount',
        employerContribution: '$esiEmployerAmount'
      }
    },
    { $sort: { employeeId: 1 } }
  ]);
  return result;
};

/**
 * @param {string} schoolId
 * @param {Object} query - year or financialYear
 * @returns {Array} YTD payroll summary per employee
 */
const ytd = async (schoolId, query = {}) => {
  const year = parseInt(query.year);
  if (!year) {
    const error = new Error('year is required');
    error.statusCode = 400; throw error;
  }
  const result = await Payslip.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), year } },
    { $group: {
      _id: '$teacherId',
      totalGross: { $sum: '$grossEarnings' },
      totalDeductions: { $sum: '$totalDeductions' },
      totalNet: { $sum: '$netPayable' },
      totalTDS: { $sum: '$tdsAmount' },
      totalPF: { $sum: '$pfEmployeeAmount' },
      monthsProcessed: { $sum: 1 },
    }},
    { $lookup: { from: 'teacherprofiles', localField: '_id', foreignField: '_id', as: 'teacher' } },
    { $unwind: { path: '$teacher', preserveNullAndEmptyArrays: true } },
    { $project: {
      employeeName: { $concat: ['$teacher.firstName', ' ', '$teacher.lastName'] },
      employeeId: '$teacher.employeeId',
      totalGross: 1, totalDeductions: 1, totalNet: 1, totalTDS: 1, totalPF: 1, monthsProcessed: 1,
    }},
    { $sort: { employeeName: 1 } },
  ]);
  return result;
};

/**
 * Initiate async report export via Bull queue
 * @param {string} schoolId
 * @param {Object} data - { reportType, month, year, format }
 * @param {string} userId
 * @returns {Object} { jobId }
 */
const exportReport = async (schoolId, data, userId) => {
  const validTypes = ['monthly-summary', 'department-breakdown', 'tds-summary', 'pf-register', 'esi-register', 'ytd'];
  if (!validTypes.includes(data.reportType)) {
    const error = new Error(`Invalid report type. Must be one of: ${validTypes.join(', ')}`);
    error.statusCode = 400; throw error;
  }
  try {
    const payrollQueue = require('../../config/queue');
    const job = await payrollQueue.add('EXPORT_REPORT', {
      schoolId, reportType: data.reportType,
      month: data.month, year: data.year,
      format: data.format || 'xlsx', userId,
    });
    return { jobId: job.id };
  } catch (e) {
    logger.error('reportService.exportReport', { error: e.message });
    const error = new Error('Failed to initiate report export');
    error.statusCode = 500; throw error;
  }
};

/**
 * Check export job status
 * @param {string} jobId
 * @returns {Object} { status, progress, downloadUrl }
 */
const getExportStatus = async (jobId) => {
  try {
    const payrollQueue = require('../../config/queue');
    const job = await payrollQueue.getJob(jobId);
    if (!job) {
      const error = new Error('Export job not found');
      error.statusCode = 404; throw error;
    }
    const state = await job.getState();
    return {
      status: state, progress: job.progress(),
      downloadUrl: job.returnvalue?.downloadUrl || null,
    };
  } catch (e) {
    if (e.statusCode) throw e;
    logger.error('reportService.getExportStatus', { jobId, error: e.message });
    const error = new Error('Failed to check export status');
    error.statusCode = 500; throw error;
  }
};

module.exports = {
  monthlySummary, departmentBreakdown, tdsSummary,
  pfRegister, esiRegister, ytd, exportReport, getExportStatus,
};
