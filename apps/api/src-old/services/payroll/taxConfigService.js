const TaxConfig = require('../../models/TaxConfig');
const logger = require('../../../src/core/logging/logger.js');

/**
 * Get all tax configurations for a school with optional filters
 */
const getAllConfigs = async (schoolId, filters = {}) => {
  const query = { schoolId };

  if (filters.financialYear) {
    query.financialYear = filters.financialYear;
  }
  if (filters.regime) {
    query.regime = filters.regime;
  }
  if (filters.isActive !== undefined && filters.isActive !== '') {
    query.isActive = filters.isActive === 'true' || filters.isActive === true;
  }

  const configs = await TaxConfig.find(query).sort({ financialYear: -1 }).lean();
  return configs;
};

/**
 * Get a single tax config by ID
 */
const getConfigById = async (schoolId, configId) => {
  const config = await TaxConfig.findOne({
    _id: configId,
    schoolId,
  }).lean();

  if (!config) {
    const error = new Error('Tax configuration not found');
    error.statusCode = 404;
    throw error;
  }

  return config;
};

/**
 * SRS-Compliant Tax Config Lookup Helper
 * Must be used across structures, processing, and payroll runs.
 */
const getActiveTaxConfig = async ({ schoolId, financialYear, regime }) => {
  const params = { schoolId, isActive: true };

  if (financialYear && typeof financialYear === 'string') {
    params.financialYear = financialYear.trim();
  }
  if (regime) {
    params.regime = regime;
  }

  logger.debug('taxConfigService.getActiveTaxConfig: query', { params });

  // If specific FY/Regime provided, look for it; otherwise sort by latest
  const config = await TaxConfig.findOne(params).sort({ financialYear: -1 }).lean();

  logger.debug('taxConfigService.getActiveTaxConfig: result', { found: config ? config.financialYear : null });

  if (!config) {
    const error = new Error('No active tax configuration found for the specified financial year and regime');
    error.statusCode = 404;
    throw error;
  }

  return config;
};

/**
 * Create a new tax configuration
 */
const createConfig = async (schoolId, data, userId) => {
  // Sanitize input
  if (data.financialYear && typeof data.financialYear === 'string') {
    // Normalizing whitespace and common dash variations (en-dash, em-dash)
    data.financialYear = data.financialYear.trim().replace(/[\u2013\u2014]/g, '-');
  }

  // Robust Debug Logging
  logger.debug('taxConfigService.createConfig: Payload investigation', {
    receivedKeys: Object.keys(data),
    financialYearValue: data.financialYear,
    financialYearType: typeof data.financialYear,
    financialYearLength: data.financialYear?.length
  });

  // 1. Format Validation (YYYY-YY)
  const fyRegex = /^\d{4}-\d{2}$/;
  if (!data.financialYear) {
    const error = new Error('Financial year is missing in request body');
    error.statusCode = 400;
    throw error;
  }

  if (!fyRegex.test(data.financialYear)) {
    const error = new Error(`Financial year "${data.financialYear}" must be in format YYYY-YY (e.g. 2025-26). Check for hidden characters.`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Logical Sequence Validation
  const [startYear, endYearSuffix] = data.financialYear.split('-').map(Number);
  const expectedEndSuffix = (startYear + 1) % 100;

  if (endYearSuffix !== expectedEndSuffix) {
    const error = new Error(
      `Invalid financial year sequence. For start year ${startYear}, the end year suffix must be ${expectedEndSuffix
        .toString()
        .padStart(2, '0')} (e.g. ${startYear}-${expectedEndSuffix.toString().padStart(2, '0')})`
    );
    error.statusCode = 400;
    throw error;
  }

  // Validate tax slabs — each slab must have minIncome < maxIncome
  if (data.taxSlabs && data.taxSlabs.length > 0) {
    for (let i = 0; i < data.taxSlabs.length; i++) {
      const slab = data.taxSlabs[i];
      if (slab.minIncome >= slab.maxIncome) {
        const error = new Error(`Tax slab ${i + 1}: minIncome must be less than maxIncome`);
        error.statusCode = 400;
        throw error;
      }
      if (slab.taxRate < 0 || slab.taxRate > 100) {
        const error = new Error(`Tax slab ${i + 1}: taxRate must be between 0 and 100`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  // Validate PF and ESI rates are between 0–100
  const rateFields = ['pfEmployerRate', 'pfEmployeeRate', 'esiEmployerRate', 'esiEmployeeRate'];
  for (const field of rateFields) {
    if (data[field] !== undefined && (data[field] < 0 || data[field] > 100)) {
      const error = new Error(`${field} must be between 0 and 100`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Check for duplicate active config for same school + financialYear + regime
  const existing = await TaxConfig.findOne({
    schoolId,
    financialYear: data.financialYear,
    regime: data.regime,
    isActive: true,
  }).lean();

  if (existing) {
    const error = new Error(
      `An active tax configuration already exists for ${data.financialYear} (${data.regime} regime)`
    );
    error.statusCode = 400;
    throw error;
  }

  const config = await TaxConfig.create({
    schoolId,
    financialYear: data.financialYear,
    regime: data.regime,
    taxSlabs: data.taxSlabs || [],
    standardDeduction: data.standardDeduction,
    section80CLimit: data.section80CLimit,
    hraExemptionAllowed: data.hraExemptionAllowed,
    professionalTaxSlab: data.professionalTaxSlab || [],
    pfEmployerRate: data.pfEmployerRate,
    pfEmployeeRate: data.pfEmployeeRate,
    esiEmployerRate: data.esiEmployerRate,
    esiEmployeeRate: data.esiEmployeeRate,
    esiApplicableLimit: data.esiApplicableLimit,
    createdBy: userId,
  });

  return config;
};

/**
 * Update an existing tax configuration
 */
const updateConfig = async (schoolId, configId, data) => {
  // Block immutable fields
  delete data.schoolId;
  delete data.createdBy;

  // Sanitize and validate financialYear if provided
  if (data.financialYear) {
    if (typeof data.financialYear === 'string') {
      data.financialYear = data.financialYear.trim();
    }
    
    const fyRegex = /^\d{4}-\d{2}$/;
    if (!fyRegex.test(data.financialYear)) {
      const error = new Error('Financial year must be in format YYYY-YY (e.g. 2025-26)');
      error.statusCode = 400;
      throw error;
    }

    const [startYear, endYearSuffix] = data.financialYear.split('-').map(Number);
    if (endYearSuffix !== (startYear + 1) % 100) {
      const error = new Error('Invalid financial year sequence');
      error.statusCode = 400;
      throw error;
    }
  }

  // Data Immutability: Block edits if any payroll is locked for the year
  const Payroll = require('../../models/Payroll');
  const lockedPayroll = await Payroll.findOne({ schoolId, status: 'locked' }).lean();
  if (lockedPayroll) {
    const error = new Error('Cannot modify tax configuration as payroll is already locked for the year');
    error.statusCode = 400;
    throw error;
  }

  // Validate tax slabs if provided
  if (data.taxSlabs && data.taxSlabs.length > 0) {
    for (let i = 0; i < data.taxSlabs.length; i++) {
      const slab = data.taxSlabs[i];
      if (slab.minIncome >= slab.maxIncome) {
        const error = new Error(`Tax slab ${i + 1}: minIncome must be less than maxIncome`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  const config = await TaxConfig.findOneAndUpdate(
    { _id: configId, schoolId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!config) {
    const error = new Error('Tax configuration not found');
    error.statusCode = 404;
    throw error;
  }

  return config;
};

/**
 * Toggle isActive status of a tax config
 */
const toggleConfigStatus = async (schoolId, configId) => {
  const config = await TaxConfig.findOne({
    _id: configId,
    schoolId,
  });

  if (!config) {
    const error = new Error('Tax configuration not found');
    error.statusCode = 404;
    throw error;
  }

  // If activating, check no other active config exists for same year + regime
  if (!config.isActive) {
    const existingActive = await TaxConfig.findOne({
      schoolId,
      financialYear: config.financialYear,
      regime: config.regime,
      isActive: true,
      _id: { $ne: configId },
    }).lean();

    if (existingActive) {
      const error = new Error(
        `Another active tax configuration already exists for ${config.financialYear} (${config.regime} regime). Deactivate it first.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  config.isActive = !config.isActive;
  await config.save();

  return config;
};

/**
 * Seed default tax configuration for FY 2025-26 (New Regime)
 */
const seedDefaultConfig = async (schoolId, userId) => {
  const existing = await TaxConfig.countDocuments({ schoolId });
  if (existing > 0) {
    const error = new Error('Tax configuration already exists for this school');
    error.statusCode = 400;
    throw error;
  }

  const defaultConfig = await TaxConfig.create({
    schoolId,
    financialYear: '2025-26',
    regime: 'new',
    taxSlabs: [
      { minIncome: 0, maxIncome: 300000, taxRate: 0, surchargeRate: 0 },
      { minIncome: 300001, maxIncome: 700000, taxRate: 5, surchargeRate: 0 },
      { minIncome: 700001, maxIncome: 1000000, taxRate: 10, surchargeRate: 0 },
      { minIncome: 1000001, maxIncome: 1200000, taxRate: 15, surchargeRate: 0 },
      { minIncome: 1200001, maxIncome: 1500000, taxRate: 20, surchargeRate: 0 },
      { minIncome: 1500001, maxIncome: Infinity, taxRate: 30, surchargeRate: 0 },
    ],
    standardDeduction: 75000,
    section80CLimit: 0,
    hraExemptionAllowed: false,
    professionalTaxSlab: [
      { maxSalary: 15000, monthlyTax: 0 },
      { maxSalary: 20000, monthlyTax: 150 },
      { maxSalary: Infinity, monthlyTax: 200 },
    ],
    pfEmployerRate: 12,
    pfEmployeeRate: 12,
    esiEmployerRate: 3.25,
    esiEmployeeRate: 0.75,
    esiApplicableLimit: 21000,
    isActive: true,
    createdBy: userId,
  });

  return defaultConfig;
};

/**
 * Get the effective (active) tax config for a school.
 * Used by payrollService during payroll runs.
 * Falls back to most-recent config if none is active.
 */
const getEffectiveConfig = async (schoolId) => {
  // Primary: active config sorted by most recent FY
  const config = await TaxConfig.findOne({ schoolId, isActive: true })
    .sort({ financialYear: -1 })
    .lean();

  if (config) return config;

  // Fallback: any config (most recent), warn admin
  const fallback = await TaxConfig.findOne({ schoolId })
    .sort({ createdAt: -1 })
    .lean();

  if (!fallback) {
    const error = new Error(
      'No tax configuration found for this school. Please create one via the Tax Config page before running payroll.'
    );
    error.statusCode = 404;
    throw error;
  }

  logger.warn('taxConfigService.getEffectiveConfig: No active config — using most recent as fallback', {
    schoolId,
    configId: fallback._id,
    financialYear: fallback.financialYear,
  });

  return fallback;
};

module.exports = {
  getAllConfigs,
  getConfigById,
  getActiveTaxConfig,
  getEffectiveConfig,
  createConfig,
  updateConfig,
  toggleConfigStatus,
  seedDefaultConfig,
};
