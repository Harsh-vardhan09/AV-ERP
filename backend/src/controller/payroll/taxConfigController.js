const taxConfigService = require('../../services/payroll/taxConfigService');
const logger = require('../../utils/logger');

/**
 * SUCCESS: { success: true, message: "...", data: ... }
 * ERROR:   { success: false, message: "..." }
 */

const getConfigs = async (req, res) => {
  try {
    const configs = await taxConfigService.getAllConfigs(req.schoolId, req.query);
    return res.status(200).json({
      success: true,
      message: 'Tax configurations fetched successfully',
      data: configs,
    });
  } catch (error) {
    logger.error('getConfigs', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch tax configurations',
    });
  }
};

const getConfigById = async (req, res) => {
  try {
    const config = await taxConfigService.getConfigById(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Tax configuration fetched successfully',
      data: config,
    });
  } catch (error) {
    logger.error('getConfigById', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch tax configuration',
    });
  }
};

const getActiveConfig = async (req, res) => {
  try {
    const { financialYear, regime } = req.query;

    const config = await taxConfigService.getActiveTaxConfig({
      schoolId: req.schoolId,
      financialYear,
      regime
    });

    return res.status(200).json({
      success: true,
      message: 'Active tax configuration fetched successfully',
      data: config,
    });
  } catch (error) {
    logger.error('getActiveConfig', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch active tax configuration',
    });
  }
};

const createConfig = async (req, res) => {
  try {
    const { financialYear, regime } = req.body;

    if (!financialYear || !regime) {
      return res.status(400).json({
        success: false,
        message: 'financialYear and regime are required',
      });
    }

    const config = await taxConfigService.createConfig(req.schoolId, req.body, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Tax configuration created successfully',
      data: config,
    });
  } catch (error) {
    logger.error('createConfig', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create tax configuration',
    });
  }
};

const updateConfig = async (req, res) => {
  try {
    const config = await taxConfigService.updateConfig(req.schoolId, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Tax configuration updated successfully',
      data: config,
    });
  } catch (error) {
    logger.error('updateConfig', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update tax configuration',
    });
  }
};

const toggleStatus = async (req, res) => {
  try {
    const config = await taxConfigService.toggleConfigStatus(req.schoolId, req.params.id);
    return res.status(200).json({
      success: true,
      message: `Tax configuration ${config.isActive ? 'activated' : 'deactivated'} successfully`,
      data: config,
    });
  } catch (error) {
    logger.error('toggleStatus', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to toggle tax configuration status',
    });
  }
};

const getTaxTemplate = async (req, res) => {
  try {
    const template = {
      financialYear: '2025-26',
      taxRegime: 'new',
      standardDeduction: 75000,
      taxSlabs: [
        { minIncome: 0, maxIncome: 300000, taxRate: 0, surchargeRate: 0 },
        { minIncome: 300001, maxIncome: 700000, taxRate: 5, surchargeRate: 0 },
        { minIncome: 700001, maxIncome: 1000000, taxRate: 10, surchargeRate: 0 },
        { minIncome: 1000001, maxIncome: 1200000, taxRate: 15, surchargeRate: 0 },
        { minIncome: 1200001, maxIncome: 1500000, taxRate: 20, surchargeRate: 0 },
        { minIncome: 1500001, maxIncome: Infinity, taxRate: 30, surchargeRate: 0 },
      ],
      pfEmployeeRate: 12,
      pfEmployerRate: 12,
      esiEmployeeRate: 0.75,
      esiEmployerRate: 3.25,
      esiApplicableLimit: 21000,
      professionalTaxSlabs: [
        { maxSalary: 15000, monthlyTax: 0 },
        { maxSalary: 20000, monthlyTax: 150 },
        { maxSalary: Infinity, monthlyTax: 200 },
      ],
    };

    return res.status(200).json({
      success: true,
      message: 'Tax template fetched successfully',
      data: template,
    });
  } catch (error) {
    logger.error('getTaxTemplate', { error: error.message, schoolId: req.schoolId });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tax template',
    });
  }
};

const seedConfig = async (req, res) => {
  try {
    const config = await taxConfigService.seedDefaultConfig(req.schoolId, req.user._id);
    return res.status(201).json({
      success: true,
      message: 'Default tax configuration seeded successfully',
      data: config,
    });
  } catch (error) {
    logger.error('seedConfig', { error: error.message, schoolId: req.schoolId });
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to seed default tax configuration',
    });
  }
};

module.exports = {
  getConfigs,
  getConfigById,
  getActiveConfig,
  createConfig,
  updateConfig,
  toggleStatus,
  seedConfig,
  getTaxTemplate,
};
