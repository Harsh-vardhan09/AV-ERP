/**
 * Payroll Processing Service — CORE FINTECH ENGINE
 * ───────────────────────────────────────────────────
 * Implements strict financial formulas for PF, ESI, PT, and TDS.
 * All logic is audit-grade and prorates correctly.
 *
 * FIXES APPLIED:
 *  - Bug 4: calculatePayroll now correctly resolves component amounts from
 *    fixedAmount/percentage fields (previously always returned monthlyGross=0
 *    because it was reading .amount which is never set on raw structure components).
 *  - proratedComponents now correctly uses resolved amounts.
 */
const logger = require('../../../src/core/logging/logger.js');

/**
 * 1. LOP (Loss of Pay) Calculations
 */
const calculateLopDetails = (monthlyGross, workingDays, absentDays, paidLeavesBalance = 0) => {
  if (!workingDays || workingDays <= 0) return { lopDays: 0, lopAmount: 0, dailyRate: 0 };

  const lopDays = Math.max(0, absentDays - paidLeavesBalance);
  const dailyRate = monthlyGross / workingDays;
  const lopAmount = Math.round(dailyRate * lopDays);

  return { lopDays, lopAmount, dailyRate };
};

/**
 * 2. PF Calculation
 */
const calculatePF = (basicAfterLOP, rates = {}) => {
  const pfEmployeeRate = (rates.pfEmployeeRate || 12) / 100;
  const pfEmployerRate = (rates.pfEmployerRate || 12) / 100;

  const pfWage = Math.min(basicAfterLOP, 15000);
  const pfEmployee = Math.round(pfWage * pfEmployeeRate);
  const pfEmployer = Math.round(pfWage * pfEmployerRate);

  return { pfWage, pfEmployee, pfEmployer };
};

/**
 * 3. ESI Calculation
 */
const calculateESI = (effectiveGross, config = {}) => {
  const limit = config.esiApplicableLimit || 21000;
  const isApplicable = effectiveGross <= limit;

  const employeeRate = (config.esiEmployeeRate || 0.75) / 100;
  const employerRate = (config.esiEmployerRate || 3.25) / 100;

  const employee = isApplicable ? Math.round(effectiveGross * employeeRate) : 0;
  const employer = isApplicable ? Math.round(effectiveGross * employerRate) : 0;

  return { isApplicable, employee, employer };
};

/**
 * 4. Professional Tax (PT)
 */
const calculatePT = (effectiveGross, slabs = []) => {
  if (!slabs || slabs.length === 0) return 0;
  const sorted = [...slabs].sort((a, b) => a.maxSalary - b.maxSalary);

  for (const slab of sorted) {
    if (effectiveGross <= slab.maxSalary) return slab.monthlyTax;
  }
  return sorted[sorted.length - 1].monthlyTax;
};

/**
 * 5. TDS Calculation
 */
const calculateTDS = (monthlyEffectiveGross, taxConfig, pfEmployee = 0) => {
  const annualGross = monthlyEffectiveGross * 12;
  const standardDeduction = taxConfig.standardDeduction || 50000;

  let totalDeductions = standardDeduction;

  if (taxConfig.regime === 'old') {
    const pfAnnual = pfEmployee * 12;
    const limit80C = taxConfig.section80CLimit || 150000;
    totalDeductions += Math.min(pfAnnual, limit80C);
  }

  const annualTaxableIncome = Math.max(0, annualGross - totalDeductions);
  let annualTax = 0;
  const slabs = taxConfig.taxSlabs || [];

  for (const slab of slabs) {
    if (annualTaxableIncome <= slab.minIncome) continue;
    const max = (slab.maxIncome === Infinity || slab.maxIncome === null)
      ? annualTaxableIncome : slab.maxIncome;

    const taxableInSlab = Math.min(annualTaxableIncome, max) - slab.minIncome;
    if (taxableInSlab > 0) {
      annualTax += taxableInSlab * (slab.taxRate / 100);
    }
  }

  // Add 4% health & education cess
  annualTax = Math.round(annualTax * 1.04);
  const monthlyTDS = Math.round(annualTax / 12);

  return { annualTaxableIncome, annualTax, monthlyTDS };
};

/**
 * Resolve a single component's rupee amount.
 * Handles three cases:
 *   (a) Pre-computed: component already has .amount or .paidAmount
 *   (b) Fixed:        component has .fixedAmount > 0
 *   (c) Percentage:   component has .percentage > 0 (calculated from baseSalary)
 */
const resolveComponentAmount = (comp, baseSalary) => {
  // (a) Pre-computed amount — highest priority
  if (comp.paidAmount > 0) return comp.paidAmount;
  if (comp.amount > 0) return comp.amount;
  // (b) Fixed rupee amount
  if (comp.fixedAmount > 0) return comp.fixedAmount;
  // (c) Percentage of basic
  if (comp.percentage > 0 && baseSalary > 0) {
    return Math.round((baseSalary * comp.percentage) / 100);
  }
  return 0;
};

/**
 * 🎯 PURE FUNCTION: calculatePayroll
 * Computes earnings, deductions, and LOP.
 *
 * @param {number} baseSalary     - Employee's basic pay (used for percentage calculations)
 * @param {Array}  components     - Salary components — may be raw structure components
 *                                  (with fixedAmount/percentage) OR pre-computed (with amount).
 * @param {Object} attendance     - { workingDays, absentDays, paidLeavesBalance }
 * @param {number} month
 * @param {number} year
 * @param {Object} taxConfig      - Active TaxConfig document
 */
const calculatePayroll = ({
  baseSalary = 0,
  components = [],
  attendance,
  month,
  year,
  taxConfig = {},
}) => {
  const { workingDays, absentDays, paidLeavesBalance = 0 } = attendance;

  // ── 1. Resolve each component's rupee amount (FIX: was reading .amount which was always 0) ──
  const resolvedComponents = components.map((c) => ({
    ...c,
    amount: resolveComponentAmount(c, baseSalary),
  }));

  // ── 2. Monthly Gross = sum of all resolved component amounts ──────────────
  const monthlyGross = resolvedComponents.reduce((acc, c) => acc + (c.amount || 0), 0);

  // ── 3. LOP Calculation ───────────────────────────────────────────────────
  const { lopDays, lopAmount, dailyRate } = calculateLopDetails(
    monthlyGross, workingDays, absentDays, paidLeavesBalance
  );
  const effectiveGross = Math.round(monthlyGross - lopAmount);
  const lopFactor = monthlyGross > 0 ? effectiveGross / monthlyGross : 1;

  // ── 4. Prorate Components ─────────────────────────────────────────────────
  const proratedComponents = resolvedComponents.map((c) => ({
    ...c,
    paidAmount: Math.round((c.amount || 0) * lopFactor),
  }));

  const basicAfterLOP = Math.round(baseSalary * lopFactor);

  // ── 5. Statutory Deductions ───────────────────────────────────────────────
  const pf = calculatePF(basicAfterLOP, taxConfig);
  const esi = calculateESI(effectiveGross, taxConfig);
  const pt = calculatePT(effectiveGross, taxConfig.professionalTaxSlab);
  const tds = calculateTDS(effectiveGross, taxConfig, pf.pfEmployee);

  // ── 6. Final Totals ───────────────────────────────────────────────────────
  const totalStatutory = pf.pfEmployee + esi.employee + pt + tds.monthlyTDS;
  const totalDeductions = Math.round(totalStatutory + lopAmount);
  const netPayable = Math.round(Math.max(0, effectiveGross - totalStatutory));

  logger.debug('payrollProcessingService.calculatePayroll', {
    monthlyGross,
    effectiveGross,
    lopDays,
    lopAmount,
    totalDeductions,
    netPayable,
  });

  return {
    summary: {
      scheduledGross: Math.round(monthlyGross),
      effectiveGross: Math.round(effectiveGross),
      totalDeductions,
      netPayable,
    },
    attendance: {
      workingDays,
      absentDays,
      lopDays,
      lopAmount,
      dailyRate: Math.round(dailyRate || 0),
    },
    statutory: {
      pf,
      esi,
      pt,
      tds,
    },
    breakdown: {
      earnings: proratedComponents,
      deductions: [
        { name: 'Loss of Pay', amount: lopAmount },
        { name: 'Employee PF', amount: pf.pfEmployee },
        { name: 'Employee ESI', amount: esi.employee },
        { name: 'Professional Tax', amount: pt },
        { name: 'Income Tax (TDS)', amount: tds.monthlyTDS },
      ].filter((d) => d.amount > 0),
    },
  };
};

/**
 * Legacy wrapper (kept for backward compatibility)
 */
const processEmployeePayroll = (params) => {
  return calculatePayroll({
    baseSalary: params.basicSalary,
    components: params.earnings || [],
    attendance: {
      workingDays: params.workingDays,
      absentDays: params.absentDays,
      paidLeavesBalance: params.paidLeavesBalance,
    },
    taxConfig: params.taxConfig,
  });
};

module.exports = {
  calculateLopDetails,
  calculatePF,
  calculateESI,
  calculatePT,
  calculateTDS,
  resolveComponentAmount,
  calculatePayroll,
  processEmployeePayroll,
};
