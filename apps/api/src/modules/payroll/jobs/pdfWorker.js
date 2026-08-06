const queue = require('./payrollQueue');
const logger = require('../../../core/logging/logger');
// TEMP: move with the rest of payroll
const pdfService = require('../../../../src-old/services/payroll/pdfService');
const Payslip = require('../../../../src-old/models/Payslip');

queue.process('GENERATE_PDFS', async (job) => {
  const { schoolId, payrollId } = job.data;

  logger.info('GENERATE_PDFS job started', { payrollId });

  try {
    const payslips = await Payslip.find({
      schoolId,
      payrollId,
      status: { $ne: 'cancelled' }
    }).select('_id').lean();

    if (!payslips.length) {
      logger.warn('No payslips found for PDF generation', { payrollId });
      return { success: true, count: 0 };
    }

    let processedCount = 0;

    // Sequential, not parallel — PDFKit holds each document in memory until end()
    for (const p of payslips) {
      try {
        await pdfService.generatePayslipPDF(p._id);
        processedCount++;
        await job.progress(Math.round((processedCount / payslips.length) * 100));
      } catch (err) {
        logger.error('Failed to generate PDF for payslip', { payslipId: p._id, error: err.message });
      }
    }

    logger.info('GENERATE_PDFS job completed', { payrollId, processedCount });

    if (job.data.triggerEmail) {
      await queue.add('SEND_EMAILS', { schoolId, payrollId });
      logger.info('SEND_EMAILS queued after PDF completion', { payrollId });
    }

    return { success: true, count: processedCount };

  } catch (error) {
    logger.error('GENERATE_PDFS job failed', { payrollId, error: error.message });
    throw error;
  }
});

logger.info('PDF Worker registered for GENERATE_PDFS queue');
