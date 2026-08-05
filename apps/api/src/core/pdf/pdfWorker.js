const queue = require('../config/queue');
const pdfService = require('../../../src-old/services/payroll/pdfService');
const logger = require('../utils/logger');
const Payslip = require('../../../src-old/models/Payslip');

/**
 * Worker to handle PDF generation jobs
 */
queue.process('GENERATE_PDFS', async (job) => {
  const { schoolId, payrollId } = job.data;

  logger.info('GENERATE_PDFS job started', { payrollId });

  try {
    // 1. Fetch all payslips for this payroll run that don't have a PDF yet
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

    // 2. Process each payslip (Parallel with limit if needed, but sequential is safer for PDFKit memory)
    for (const p of payslips) {
      try {
        await pdfService.generatePayslipPDF(p._id);
        processedCount++;
        
        // Update job progress
        await job.progress(Math.round((processedCount / payslips.length) * 100));
      } catch (err) {
        logger.error('Failed to generate PDF for payslip', { payslipId: p._id, error: err.message });
      }
    }

    logger.info('GENERATE_PDFS job completed', { payrollId, processedCount });

    // 🔥 Chain Email Delivery if requested
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
