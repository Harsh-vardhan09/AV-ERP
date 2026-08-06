/**
 * Email Worker — Payslip Delivery
 * ─────────────────────────────────
 * NOTE: DB connection handled by main ERP's index.js.
 *       No connectDB() call needed here.
 */
const queue        = require('../../src/modules/payroll/jobs/payrollQueue');
const emailService = require('../utils/emailService');
const logger       = require('../../src/core/logging/logger.js');
const Payslip      = require('../models/Payslip');
const School       = require('../models/School');

/**
 * SEND_EMAILS — bulk payslip email delivery after lock
 */
queue.process('SEND_EMAILS', async (job) => {
  const { schoolId, payrollId } = job.data;
  logger.info('emailWorker: SEND_EMAILS job started', { payrollId });

  try {
    const school = await School.findById(schoolId).lean();

    // Populate firstName + lastName (main ERP TeacherProfile has no .name field)
    const payslips = await Payslip.find({
      schoolId,
      payrollId,
      pdfUrl:  { $exists: true, $ne: null },
      status:  { $ne: 'cancelled' },
    })
      .populate('userId',    'email firstName lastName')
      .populate('teacherId', 'firstName lastName')
      .lean();

    if (!payslips.length) {
      logger.warn('emailWorker: No payslips with PDF found for delivery', { payrollId });
      return { success: true, count: 0 };
    }

    let sentCount = 0;

    for (const p of payslips) {
      try {
        // Compute full name from firstName + lastName (main ERP stores them separately)
        const teacherName = p.teacherId
          ? `${p.teacherId.firstName || ''} ${p.teacherId.lastName || ''}`.trim()
          : (p.userId ? `${p.userId.firstName || ''} ${p.userId.lastName || ''}`.trim() : 'Employee');

        await emailService.sendPayslipEmail({
          to:         p.userId?.email,
          teacherName,
          month:      p.month,
          year:       p.year,
          schoolName: school?.name || '',
          pdfUrl:     p.pdfUrl,
        });

        await Payslip.updateOne(
          { _id: p._id },
          { $set: { status: 'sent', emailSentAt: new Date() } }
        );
        sentCount++;

        await job.progress(Math.round((sentCount / payslips.length) * 100));

      } catch (err) {
        // Log but continue — don't fail the whole batch for one bad email
        logger.error('emailWorker: Failed to send payslip email', {
          payslipId: p._id,
          error:     err.message,
        });
      }
    }

    logger.info('emailWorker: SEND_EMAILS job completed', { payrollId, sentCount });
    return { success: true, count: sentCount };

  } catch (error) {
    logger.error('emailWorker: SEND_EMAILS job failed', { payrollId, error: error.message });
    throw error; // Bull will retry
  }
});

logger.info('emailWorker: SEND_EMAILS processor registered');
