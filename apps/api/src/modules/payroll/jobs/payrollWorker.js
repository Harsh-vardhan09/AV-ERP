/**
 * Payroll Worker — Integrated into Main School ERP
 * NOTE: DB connection and dotenv are handled by the main index.js.
 *       This worker registers queue processors only — no connectDB() call.
 */
const logger = require('../../../core/logging/logger.js');
const queue  = require('.//payrollQueue');

// Services & Models
const processingService = require('../services/payrollProcessingService');
const Payroll           = require('../models/Payroll');
const Payslip           = require('../models/Payslip');
const EmployeeSalary    = require('../models/EmployeeSalary');
const TaxConfig         = require('../models/TaxConfig');

// PROCESS_PAYROLL — Bulk salary calculation for entire school
queue.process('PROCESS_PAYROLL', async (job) => {
  const { schoolId, payrollId, month, year, workingDays } = job.data;

  logger.info('payrollWorker: Job started', { jobId: job.id, payrollId, month, year });

  try {
    const [payroll, taxConfigRaw] = await Promise.all([
      Payroll.findById(payrollId),
      TaxConfig.findOne({ schoolId, isActive: true }).lean(),
    ]);

    if (!payroll) throw new Error('Payroll record not found');

    // Graceful fallback if no tax config
    const taxConfig = taxConfigRaw || {
      regime: 'new',
      standardDeduction: 50000,
      taxSlabs: [],
      esiApplicableLimit: 21000,
      pfEmployeeRate: 12,
      pfEmployerRate: 12,
    };

    // Idempotency: clean up any existing draft payslips before re-run
    await Payslip.deleteMany({ payrollId, schoolId, status: 'draft' });

    // Batch-fetch all active employees with their salary structures
    const employees = await EmployeeSalary.find({ schoolId, isActive: true })
      .populate('teacherId')
      .populate({
        path: 'salaryStructureId',
        populate: { path: 'components.componentId' },
      })
      .lean();

    if (!employees.length) throw new Error('No active employees with salary assignments');

    logger.info(`payrollWorker: Processing ${employees.length} employees`, { payrollId });

    let totalNet = 0;
    let totalGross = 0;
    let totalDeductions = 0;
    let successCount = 0;
    const errors = [];

    const effectiveWorkingDays = workingDays || 26;
    const BATCH_SIZE = parseInt(process.env.PAYROLL_BATCH_SIZE) || 50;

    for (let i = 0; i < employees.length; i += BATCH_SIZE) {
      const chunk = employees.slice(i, i + BATCH_SIZE);

      for (const emp of chunk) {
        try {
          const teacher = emp.teacherId;
          if (!teacher?._id) {
            throw new Error(`Missing TeacherProfile for EmployeeSalary ${emp._id}`);
          }

          // Attendance — per user requirement, assume 100% attendance (absent = 0)
          const absentDays = 0;

          // Resolve component amounts using updated helper
          const resolvedComponents = (emp.salaryStructureId?.components || []).map((c) => ({
            componentId: c.componentId?._id,
            name: c.componentId?.name || 'Component',
            fixedAmount: c.fixedAmount || 0,
            percentage: c.percentage || 0,
            amount: 0, // will be resolved by resolveComponentAmount
          }));

          const baseSalary = teacher.salary?.basic || 0;

          // Use the updated, fixed calculatePayroll (handles fixedAmount/percentage correctly)
          const result = processingService.calculatePayroll({
            baseSalary,
            components: resolvedComponents,
            attendance: {
              workingDays: effectiveWorkingDays,
              absentDays,
              paidLeavesBalance: 0,
            },
            month,
            year,
            taxConfig,
          });

          await Payslip.create({
            schoolId,
            payrollId,
            teacherId: teacher._id,
            userId: emp.userId || teacher.userId,
            employeeSalaryId: emp._id,
            month,
            year,
            workingDays: effectiveWorkingDays,
            presentDays: effectiveWorkingDays,
            absentDays: 0,
            lopDays: result.attendance.lopDays,
            paidLeaves: 0,
            department: teacher.department || 'General',
            employeeId: teacher.employeeId || '',

            earnings: result.breakdown.earnings.map((e) => ({
              componentId: e.componentId,
              name: e.name,
              amount: e.paidAmount || 0,
            })),
            deductions: result.breakdown.deductions,

            grossEarnings:   result.summary.effectiveGross,
            totalDeductions: result.summary.totalDeductions,
            netPayable:      result.summary.netPayable,

            tdsAmount:         result.statutory.tds.monthlyTDS,    // ← FIXED: was .monthly
            pfEmployeeAmount:  result.statutory.pf.pfEmployee,
            pfEmployerAmount:  result.statutory.pf.pfEmployer,
            esiApplicable:     result.statutory.esi.isApplicable,
            esiEmployeeAmount: result.statutory.esi.employee,
            esiEmployerAmount: result.statutory.esi.employer,

            status: 'finalised',
            paymentStatus: 'pending',
          });

          totalNet         += result.summary.netPayable;
          totalGross       += result.summary.effectiveGross;
          totalDeductions  += result.summary.totalDeductions;
          successCount++;

        } catch (empError) {
          const empName = emp.teacherId
            ? `${emp.teacherId.firstName || ''} ${emp.teacherId.lastName || ''}`.trim()
            : `EmployeeSalary:${emp._id}`;
          logger.error('payrollWorker: Employee processing error', {
            employee: empName,
            error: empError.message,
          });
          errors.push({ employee: empName, error: empError.message });
        }
      }

      // Report progress to Bull
      const progress = Math.round(((i + chunk.length) / employees.length) * 100);
      await job.progress(progress);
    }

    // Update payroll run summary
    const finalStatus = successCount === employees.length ? 'processed' : 'partially_processed';
    await Payroll.findByIdAndUpdate(payrollId, {
      status: finalStatus,
      totalNet:        Math.round(totalNet),
      totalGross:      Math.round(totalGross),
      totalDeductions: Math.round(totalDeductions),
      totalEmployees:  successCount,
      processedAt:     new Date(),
      processingNotes: errors.length
        ? `Errors in ${errors.length} records. First: ${errors[0].error}`
        : 'All records processed successfully',
    });

    logger.info('payrollWorker: Job completed', {
      payrollId,
      successCount,
      errorCount: errors.length,
      finalStatus,
    });

    return { success: true, count: successCount, errors: errors.length };

  } catch (error) {
    logger.error('payrollWorker: Fatal job failure', { payrollId, error: error.message });

    await Payroll.findByIdAndUpdate(payrollId, {
      status: 'failed',
      processingNotes: `Fatal Error: ${error.message}`,
    });

    throw error; // Let Bull retry with exponential backoff
  }
});

// Bull global event listeners
queue.on('failed', (job, err) => {
  logger.error('payrollWorker: Bull job failed', { jobId: job.id, error: err.message });
});

queue.on('completed', (job, result) => {
  logger.info('payrollWorker: Bull job completed', { jobId: job.id, result });
});