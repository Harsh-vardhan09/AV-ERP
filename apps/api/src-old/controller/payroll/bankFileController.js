const bankFileService = require('../../services/payroll/bankFileService');
const logger = require('../../utils/logger');

/**
 * Generate bank transfer CSV
 */
const generateBankFile = async (req, res) => {
  try {
    const { payrollId } = req.body;
    const { schoolId, _id: userId } = req.user;

    if (!payrollId) {
      return res.status(400).json({ success: false, message: 'payrollId is required' });
    }

    const batch = await bankFileService.generateBankFile(schoolId, payrollId, userId);

    res.status(201).json({
      success: true,
      message: 'Bank transfer file generated successfully',
      data: batch
    });
  } catch (error) {
    logger.error('bankFileController.generateBankFile:', { error: error.message });
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

/**
 * List batches for a payroll
 */
const listBatches = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { schoolId } = req.user;

    const batches = await bankFileService.listBatches(schoolId, payrollId);

    res.status(200).json({
      success: true,
      data: batches
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  generateBankFile,
  listBatches
};
