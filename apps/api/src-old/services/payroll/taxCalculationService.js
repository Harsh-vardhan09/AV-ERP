/**
 * Tax Calculation Service
 * Handles Old Regime and New Regime Indian tax slabs, Section 80C, HRA exemption
 */
const logger = require('../../../src/core/logging/logger.js');

/**
 * Calculate annual tax under New Regime (FY 2025-26)
 * @param {number} annualGross
 * @param {Object} taxConfig - TaxConfig document
 * @returns {Object} { taxableIncome, taxAmount, effectiveRate }
 */
const calculateNewRegimeTax = (annualGross, taxConfig) => {
  const standardDeduction = taxConfig.standardDeduction || 75000;
  const taxableIncome = Math.max(0, annualGross - standardDeduction);
  let taxAmount = 0;
  const slabs = taxConfig.taxSlabs || [];

  for (const slab of slabs) {
    if (taxableIncome <= slab.minIncome) continue;
    const upper = (slab.maxIncome === Infinity || slab.maxIncome === null)
      ? taxableIncome : slab.maxIncome;
    const taxableInSlab = Math.min(taxableIncome, upper) - slab.minIncome;
    if (taxableInSlab > 0) {
      taxAmount += taxableInSlab * (slab.taxRate / 100);
    }
  }

  // Add cess (4% health and education cess)
  const cess = taxAmount * 0.04;
  taxAmount = Math.round(taxAmount + cess);

  const effectiveRate = annualGross > 0 ? ((taxAmount / annualGross) * 100).toFixed(2) : 0;
  return { taxableIncome, taxAmount, effectiveRate, regime: 'new' };
};

/**
 * Calculate annual tax under Old Regime
 * @param {number} annualGross
 * @param {Object} taxConfig - TaxConfig document
 * @param {Object} deductions - { section80C, hra, otherDeductions }
 * @returns {Object} { taxableIncome, taxAmount, effectiveRate }
 */
const calculateOldRegimeTax = (annualGross, taxConfig, deductions = {}) => {
  const standardDeduction = taxConfig.standardDeduction || 50000;
  let totalDeductions = standardDeduction;

  // Section 80C (max limit from config)
  const section80CLimit = taxConfig.section80CLimit || 150000;
  const section80C = Math.min(deductions.section80C || 0, section80CLimit);
  totalDeductions += section80C;

  // HRA exemption (if allowed in config)
  if (taxConfig.hraExemptionAllowed && deductions.hra) {
    totalDeductions += deductions.hra;
  }

  // Other deductions (80D, 80E, etc.)
  if (deductions.otherDeductions) {
    totalDeductions += deductions.otherDeductions;
  }

  const taxableIncome = Math.max(0, annualGross - totalDeductions);
  let taxAmount = 0;
  const slabs = taxConfig.taxSlabs || [];

  for (const slab of slabs) {
    if (taxableIncome <= slab.minIncome) continue;
    const upper = (slab.maxIncome === Infinity || slab.maxIncome === null)
      ? taxableIncome : slab.maxIncome;
    const taxableInSlab = Math.min(taxableIncome, upper) - slab.minIncome;
    if (taxableInSlab > 0) {
      taxAmount += taxableInSlab * (slab.taxRate / 100);
    }
  }

  const cess = taxAmount * 0.04;
  taxAmount = Math.round(taxAmount + cess);

  const effectiveRate = annualGross > 0 ? ((taxAmount / annualGross) * 100).toFixed(2) : 0;
  return { taxableIncome, taxAmount, effectiveRate, regime: 'old', deductionsClaimed: totalDeductions };
};

/**
 * Calculate monthly TDS with March adjustment
 * @param {number} annualTax - Total annual tax liability
 * @param {number} tdsPaidYTD - TDS already paid year-to-date
 * @param {number} currentMonth - Current month (1-12)
 * @returns {Object} { monthlyTDS, isLastMonth, adjustment }
 */
const calculateMonthlyTDS = (annualTax, tdsPaidYTD, currentMonth) => {
  const remainingMonths = 12 - currentMonth + 1;
  const isLastMonth = currentMonth === 3; // March = last month of FY

  if (isLastMonth) {
    // March adjustment: collect/refund shortfall/excess
    const adjustment = annualTax - tdsPaidYTD;
    return {
      monthlyTDS: Math.max(0, adjustment),
      isLastMonth: true,
      adjustment,
    };
  }

  const remainingTax = Math.max(0, annualTax - tdsPaidYTD);
  const monthlyTDS = Math.round(remainingTax / remainingMonths);
  return { monthlyTDS, isLastMonth: false, adjustment: 0 };
};

/**
 * Compare tax under both regimes and return the beneficial one
 * @param {number} annualGross
 * @param {Object} newRegimeConfig - TaxConfig for new regime
 * @param {Object} oldRegimeConfig - TaxConfig for old regime
 * @param {Object} deductions - Employee's declared deductions
 * @returns {Object} { recommended, newRegime, oldRegime }
 */
const compareTaxRegimes = (annualGross, newRegimeConfig, oldRegimeConfig, deductions = {}) => {
  const newRegime = calculateNewRegimeTax(annualGross, newRegimeConfig);
  const oldRegime = oldRegimeConfig
    ? calculateOldRegimeTax(annualGross, oldRegimeConfig, deductions)
    : null;

  const recommended = (!oldRegime || newRegime.taxAmount <= oldRegime.taxAmount) ? 'new' : 'old';
  return { recommended, newRegime, oldRegime };
};

module.exports = {
  calculateNewRegimeTax,
  calculateOldRegimeTax,
  calculateMonthlyTDS,
  compareTaxRegimes,
};
