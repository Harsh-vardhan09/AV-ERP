/**
 * Payroll Service (Production Ready)
 */

const Payroll = require('../models/Payroll');
const Payslip = require('../models/Payslip');
const EmployeeSalary = require('../models/EmployeeSalary');
const TeacherProfile = require('../../people').TeacherProfile;
const SalaryStructure = require('../models/SalaryStructure');
const TeacherAttendance = require('../../attendance').TeacherAttendance;
const taxConfigService = require('./taxConfigService');
const payrollProcessingService = require('./payrollProcessingService');
const payrollQueue = require('../jobs/payrollQueue');
const logger = require('../../../core/logging/logger.js');

// LIST
const list = async (schoolId, filters = {}, page = 1, limit = 20) => {
  const query = { schoolId };

  if (filters.year) query.year = parseInt(filters.year);
  if (filters.status) query.status = filters.status;
  if (filters.academicYearId) query.academicYearId = filters.academicYearId;

  const skip = (page - 1) * limit;

  const [docs, totalDocs] = await Promise.all([
    Payroll.find(query)
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payroll.countDocuments(query),
  ]);

  return {
    data: docs,
    meta: {
      total: totalDocs,
      page,
      totalPages: Math.ceil(totalDocs / limit),
    },
  };
};

// INITIATE
const initiate = async (schoolId, data, userId) => {
  // Strict validation
  if (!data.month || !data.year || !data.workingDays) {
    const error = new Error('month, year, and workingDays are required');
    error.statusCode = 400;
    throw error;
  }

  // Bug 7 fix: validate academicYearId before create
  if (!data.academicYearId) {
    const error = new Error('academicYearId is required to initiate a payroll run');
    error.statusCode = 400;
    throw error;
  }

  // Duplicate check
  const existing = await Payroll.findOne({
    schoolId,
    month: data.month,
    year: data.year,
  }).lean();

  if (existing) {
    const error = new Error(
      `Payroll for ${data.month}/${data.year} already exists (status: ${existing.status})`
    );
    error.statusCode = 400;
    throw error;
  }

  // Pre-run validation
  const { validatePayrollRun } = require('./payrollValidationService');
  const validation = await validatePayrollRun(schoolId, data.month, data.year);

  if (!validation.isValid) {
    const error = new Error('Pre-run validation failed');
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  // Employee count
  const employeesWithSalary = await EmployeeSalary.find({
    schoolId,
    isActive: true,
  }).lean();

  const employeeCount = employeesWithSalary.length;

  if (employeeCount === 0) {
    const error = new Error('No employees found with active salary assignments');
    error.statusCode = 400;
    throw error;
  }

  logger.info('payrollService.initiate: Creating payroll run', {
    employeeCount,
    month: data.month,
    year: data.year,
    schoolId,
  });

  const payroll = await Payroll.create({
    schoolId,
    academicYearId: data.academicYearId,
    month: data.month,
    year: data.year,
    status: 'draft',
    totalEmployees: employeeCount,
    workingDays: data.workingDays,
    totalGross: 0,
    totalDeductions: 0,
    totalNet: 0,
    totalTax: 0,
    createdBy: userId,
  });

  return payroll;
};

// GET BY ID
const getById = async (schoolId, payrollId) => {
  const payroll = await Payroll.findOne({
    _id: payrollId,
    schoolId,
  })
    .populate('approvedBy', 'name email')
    .lean();

  if (!payroll) {
    const error = new Error('Payroll run not found');
    error.statusCode = 404;
    throw error;
  }

  return payroll;
};

// PROCESS (ATOMIC SAFE)
const process = async (schoolId, payrollId, userId) => {
  // 🔥 Atomic update prevents duplicate processing
  const payroll = await Payroll.findOneAndUpdate(
    {
      _id: payrollId,
      schoolId,
      status: { $in: ['draft', 'failed', 'partially_processed'] },
    },
    {
      $set: { status: 'processing' },
    },
    { new: true }
  );

  if (!payroll) {
    const error = new Error('Payroll already processed or not found');
    error.statusCode = 400;
    throw error;
  }

  try {
    const job = await payrollQueue.add(
      'PROCESS_PAYROLL',
      {
        schoolId,
        payrollId,
        month: payroll.month,
        year: payroll.year,
        workingDays: payroll.workingDays,
        userId,
      },
      {
        jobId: `process-${payrollId}`, // Deduplication: prevents duplicate jobs in queue
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );

    logger.info('payrollService.process: Job queued', { jobId: job.id, payrollId });

    return {
      jobId: job.id,
      status: 'processing',
    };
  } catch (e) {
    // Rollback on queue failure
    await Payroll.updateOne(
      { _id: payrollId },
      { $set: { status: 'draft' } }
    );

    logger.error('payrollService.process: Queue failed — rolled back to draft', {
      payrollId,
      error: e.message,
    });

    const error = new Error('Failed to queue payroll processing');
    error.statusCode = 500;
    throw error;
  }
};

// STATUS (WITH PROGRESS)
const getStatus = async (schoolId, payrollId) => {
  const payroll = await Payroll.findOne({
    _id: payrollId,
    schoolId,
  }).lean();

  if (!payroll) {
    const error = new Error('Payroll run not found');
    error.statusCode = 404;
    throw error;
  }

  const processedCount = await Payslip.countDocuments({
    schoolId,
    payrollId,
  });

  const progress = payroll.totalEmployees
    ? Math.round((processedCount / payroll.totalEmployees) * 100)
    : 0;

  return {
    status: payroll.status,
    totalEmployees: payroll.totalEmployees,
    processedCount,
    progress,
    totalGross: payroll.totalGross,
    totalDeductions: payroll.totalDeductions,
    totalNet: payroll.totalNet,
  };
};

// APPROVE
const approve = async (schoolId, payrollId, userId) => {
  const payroll = await Payroll.findOne({ _id: payrollId, schoolId });

  if (!payroll) {
    const error = new Error('Payroll run not found');
    error.statusCode = 404;
    throw error;
  }

  if (payroll.status !== 'processed') {
    const error = new Error(`Cannot approve payroll in ${payroll.status} status`);
    error.statusCode = 400;
    throw error;
  }

  payroll.status = 'approved';
  payroll.approvedBy = userId;
  payroll.approvedAt = new Date();

  await payroll.save();

  await Payslip.updateMany(
    { schoolId, payrollId },
    { $set: { status: 'finalised' } }
  );

  logger.info('payrollService.approve: Payroll approved', { payrollId });
  return payroll;
};

// LOCK
const lock = async (schoolId, payrollId, userId) => {
  const payroll = await Payroll.findOne({ _id: payrollId, schoolId });

  if (!payroll) {
    const error = new Error('Payroll run not found');
    error.statusCode = 404;
    throw error;
  }

  if (payroll.status !== 'approved') {
    const error = new Error(`Cannot lock payroll in ${payroll.status} status`);
    error.statusCode = 400;
    throw error;
  }

  payroll.status = 'locked';
  payroll.lockedBy = userId;
  payroll.lockedAt = new Date();

  await payroll.save();

  // Trigger PDF Generation (which chains to Email Delivery)
  try {
    await payrollQueue.add(
      'GENERATE_PDFS',
      { schoolId, payrollId, triggerEmail: true },
      { jobId: `pdfs-${payrollId}` }
    );
    logger.info('payrollService.lock: PDF generation queued after lock', { payrollId });
  } catch (err) {
    logger.error('payrollService.lock: Failed to queue post-lock jobs', {
      payrollId,
      error: err.message,
    });
  }

  return payroll;
};

// CANCEL (SAFE)
const cancel = async (schoolId, payrollId, userId) => {
  const payroll = await Payroll.findOne({ _id: payrollId, schoolId });

  if (!payroll) {
    const error = new Error('Payroll run not found');
    error.statusCode = 404;
    throw error;
  }

  if (['locked', 'cancelled'].includes(payroll.status)) {
    const error = new Error(`Cannot cancel payroll in ${payroll.status} status`);
    error.statusCode = 400;
    throw error;
  }

  payroll.status = 'cancelled';
  payroll.cancelledBy = userId;
  payroll.cancelledAt = new Date();

  await payroll.save();

  // Soft-cancel draft payslips only (finalised ones stay for audit trail)
  await Payslip.updateMany(
    { schoolId, payrollId, status: 'draft' },
    { $set: { status: 'cancelled' } }
  );

  logger.info('payrollService.cancel: Payroll cancelled', { payrollId });
  return payroll;
};

/**
 * 🎯 Generate Payroll for a Specific Teacher (Ad-hoc / Individual)
 * Components are resolved via resolveComponentAmount before calculatePayroll, and
 * SalaryStructure is populated with component names so the earnings snapshot is complete.
 */
const generateTeacherPayroll = async (schoolId, { teacherId, month, year, payrollId }, userId) => {
  // Step 1: Fetch & validate Teacher
  const teacher = await TeacherProfile.findOne({ _id: teacherId, schoolId }).lean();
  if (!teacher) {
    const error = new Error('Teacher not found');
    error.statusCode = 404;
    throw error;
  }
  if (teacher.status !== 'active') {
    const error = new Error('Cannot process payroll for inactive teacher');
    error.statusCode = 400;
    throw error;
  }

  // Step 2: Fetch Active EmployeeSalary
  const empSalary = await EmployeeSalary.findOne({
    teacherId,
    schoolId,
    isActive: true,
  }).lean();

  if (!empSalary) {
    const error = new Error('No active salary assignment found for this teacher');
    error.statusCode = 400;
    throw error;
  }

  // Step 3: Fetch SalaryStructure WITH populated component names
  // CRITICAL: Must populate componentId to get name for payslip earnings snapshot
  const structure = await SalaryStructure.findOne({
    _id: empSalary.salaryStructureId,
    schoolId,
  })
    .populate('components.componentId', 'name code type')
    .lean();

  if (!structure) {
    const error = new Error('Salary structure not found or has been deactivated');
    error.statusCode = 400;
    throw error;
  }

  // Step 4: Resolve Components (merge overrides, compute amounts)
  const baseSalary = teacher.salary?.basic || 0;

  const resolvedComponents = structure.components.map((comp) => {
    // Check if there is an override for this component
    const override = empSalary.componentOverrides?.find(
      (ov) => ov.componentId?.toString() === comp.componentId?._id?.toString()
    );

    const fixedAmt = override?.fixedAmount ?? comp.fixedAmount ?? 0;
    const pct = override?.percentage ?? comp.percentage ?? 0;

    // Resolve rupee amount
    const amount = fixedAmt > 0
      ? fixedAmt
      : (pct > 0 && baseSalary > 0 ? Math.round((baseSalary * pct) / 100) : 0);

    return {
      componentId: comp.componentId?._id || comp.componentId,
      name: comp.componentId?.name || 'Component',
      type: comp.componentId?.type || 'allowance',
      fixedAmount: fixedAmt,
      percentage: pct,
      amount,
    };
  });

  // Step 5: Fetch Attendance
  const attendanceRecord = await TeacherAttendance.findOne({
    teacherId,
    schoolId,
    month: parseInt(month),
    year: parseInt(year),
  }).lean();

  // Use 26 working days as default; absent days default to 0 (full pay)
  const attendance = {
    workingDays: attendanceRecord?.workingDays || 26,
    absentDays: attendanceRecord?.absentDays || 0,
    paidLeavesBalance: 0,
  };

  // Step 6: Duplicate check
  const existingPayslip = await Payslip.findOne({
    teacherId,
    schoolId,
    month: parseInt(month),
    year: parseInt(year),
    status: { $ne: 'cancelled' },
  }).lean();

  if (existingPayslip) {
    const error = new Error(`Payroll already generated for this teacher for ${month}/${year}`);
    error.statusCode = 400;
    throw error;
  }

  // Step 7: Fetch Tax Config
  const taxConfig = await taxConfigService.getEffectiveConfig(schoolId);

  // Step 8: Calculate Payroll
  const payrollResult = payrollProcessingService.calculatePayroll({
    baseSalary,
    components: resolvedComponents,
    attendance,
    month,
    year,
    taxConfig,
  });

  // Step 9: Save Payslip (correct schema field mapping)
  const payslip = await Payslip.create({
    schoolId,
    payrollId: payrollId || undefined, // Optional for ad-hoc; required for batch runs
    teacherId,
    userId: teacher.userId,
    employeeSalaryId: empSalary._id,

    month: parseInt(month),
    year: parseInt(year),

    // Attendance fields (required by schema)
    workingDays: attendance.workingDays,
    presentDays: Math.max(0, attendance.workingDays - payrollResult.attendance.lopDays),
    absentDays: payrollResult.attendance.absentDays,
    paidLeaves: 0,
    lopDays: payrollResult.attendance.lopDays,

    // Denormalized fields for reporting performance
    department: teacher.department || '',
    employeeId: teacher.employeeId || '',

    // Earnings snapshot — name + amount for each component
    earnings: payrollResult.breakdown.earnings.map((e) => ({
      componentId: e.componentId,
      name: e.name,
      amount: e.paidAmount || e.amount || 0,
    })),

    // Deductions snapshot
    deductions: payrollResult.breakdown.deductions,

    // Financial summary
    grossEarnings: payrollResult.summary.effectiveGross,
    totalDeductions: payrollResult.summary.totalDeductions,
    netPayable: payrollResult.summary.netPayable,

    // Statutory breakdown
    tdsAmount: payrollResult.statutory.tds.monthlyTDS,
    pfEmployeeAmount: payrollResult.statutory.pf.pfEmployee,
    pfEmployerAmount: payrollResult.statutory.pf.pfEmployer,
    esiApplicable: payrollResult.statutory.esi.isApplicable,
    esiEmployeeAmount: payrollResult.statutory.esi.employee,
    esiEmployerAmount: payrollResult.statutory.esi.employer,

    paymentStatus: 'pending',
    status: 'draft',
  });

  logger.info('payrollService.generateTeacherPayroll: Payslip created', {
    payslipId: payslip._id,
    teacherId,
    month,
    year,
    netPayable: payslip.netPayable,
  });

  return payslip;
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