/**
 * autoFineService.js
 *
 * Calculates and stamps late-fee fines on overdue Installment records.
 * This is a PURE ADDITIVE service — it does not modify any existing
 * payment, collection, or StudentFee logic.
 *
 * Fine policy (per FeeStructure config or school-level default):
 *   - Flat fine  : a fixed amount per overdue installment
 *   - Percent fine: a % of the installment's remaining amount per day overdue
 *
 * Called:
 *   1. On-demand via POST /api/v1/fee/installments/apply-fines (admin trigger)
 *   2. Can be scheduled via a cron job (optional, see bottom of file)
 *
 * Returns a summary: { processed, fineApplied, alreadyFined, errors }
 */

'use strict';

const Installment = require('../../models/fee/Installment');
const StudentFee  = require('../../models/fee/StudentFee');
const logger      = require('../../../src/core/logging/logger.js');

// ─── Constants ────────────────────────────────────────────────────────────────
// Default fine policy when FeeStructure has no explicit config.
// Admin can override these per-school via the fine policy fields added below.
const DEFAULT_FINE_TYPE    = 'flat';   // 'flat' | 'percent'
const DEFAULT_FLAT_FINE    = 50;       // ₹50 flat per overdue installment
const DEFAULT_PERCENT_FINE = 2;        // 2% of remaining amount per day overdue
const DEFAULT_MAX_FINE_PCT = 20;       // cap: never exceed 20% of installment amount

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the number of calendar days between dueDate and today (IST).
 * Returns 0 if not yet overdue.
 */
const daysPastDue = (dueDate) => {
  const todayIST = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  );
  todayIST.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffMs = todayIST - due;
  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) : 0;
};

/**
 * Calculates the fine amount for one installment.
 * @param {Object} installment  - Installment document
 * @param {Object} finePolicy   - { type, flatAmount, percentPerDay, maxPct }
 * @returns {number} fine amount (0 if not overdue or already max-fined)
 */
const calculateFine = (installment, finePolicy) => {
  const days = daysPastDue(installment.dueDate);
  if (days <= 0) return 0;                     // not overdue
  if (installment.status === 'paid') return 0; // already paid

  const remaining = installment.remainingAmount || 0;
  if (remaining <= 0) return 0;

  const {
    type       = DEFAULT_FINE_TYPE,
    flatAmount = DEFAULT_FLAT_FINE,
    percentPerDay = DEFAULT_PERCENT_FINE,
    maxPct     = DEFAULT_MAX_FINE_PCT,
  } = finePolicy;

  let fine = 0;

  if (type === 'flat') {
    fine = flatAmount;
  } else if (type === 'percent') {
    fine = (percentPerDay / 100) * remaining * days;
    // Cap at maxPct % of the original installment amount
    const cap = (maxPct / 100) * installment.amount;
    fine = Math.min(fine, cap);
  }

  // Never exceed remaining amount
  fine = Math.min(fine, remaining);

  // Round to 2 decimal places
  return Math.round(fine * 100) / 100;
};

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * applyFines
 *
 * Finds all overdue pending/partial installments for a school and
 * stamps `fineAmount` + marks status as 'overdue'.
 * Also updates StudentFee.totalDue to include the new fine.
 *
 * @param {string|ObjectId} schoolId   - Required for data isolation
 * @param {Object}          finePolicy - Fine calculation config (optional, uses defaults)
 * @param {Object}          filters    - Extra Installment filters (e.g. studentFeeId)
 *
 * @returns {Object} { processed, fineApplied, alreadyFined, skipped, errors[] }
 */
const applyFines = async (schoolId, finePolicy = {}, filters = {}) => {
  if (!schoolId) {
    throw new Error('[AutoFine] schoolId is required — cannot apply fines without school scope');
  }

  const summary = {
    processed:    0,
    fineApplied:  0,
    alreadyFined: 0,
    skipped:      0,
    errors:       [],
  };

  try {
    // Step 1: Find all StudentFee IDs that belong to this school
    const schoolFees = await StudentFee
      .find({ schoolId })
      .select('_id')
      .lean();

    if (!schoolFees.length) return summary;

    const schoolFeeIds = schoolFees.map(sf => sf._id);

    // Step 2: Find overdue installments scoped to this school's fees
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
      studentFeeId: { $in: schoolFeeIds },
      status:       { $in: ['pending', 'partial'] },
      dueDate:      { $lt: today },              // past due
      ...filters,
    };

    const overdueInstallments = await Installment.find(query);

    if (!overdueInstallments.length) return summary;

    // Step 3: Apply fine to each installment
    for (const inst of overdueInstallments) {
      summary.processed++;
      try {
        const newFine = calculateFine(inst, finePolicy);

        if (newFine <= 0) {
          summary.skipped++;
          continue;
        }

        // If fine is already equal (idempotent check), skip update
        if (inst.fineAmount >= newFine) {
          summary.alreadyFined++;
          continue;
        }

        const fineDelta = newFine - (inst.fineAmount || 0);

        // Stamp fine on installment + mark overdue
        inst.fineAmount = newFine;
        inst.status     = 'overdue';
        await inst.save();

        // Update StudentFee.totalDue to reflect the new fine delta
        // Use $inc to be safe against concurrent updates
        await StudentFee.findByIdAndUpdate(
          inst.studentFeeId,
          {
            $inc: { totalDue: fineDelta },
          }
        );

        summary.fineApplied++;

        logger.info('[AutoFine] Fine applied', {
          installmentId: inst._id,
          studentFeeId:  inst.studentFeeId,
          fineAmount:    newFine,
          fineDelta,
          daysOverdue:   daysPastDue(inst.dueDate),
        });

      } catch (err) {
        summary.errors.push({
          installmentId: inst._id?.toString(),
          reason:        err.message,
        });
        logger.error('[AutoFine] Failed for installment', {
          installmentId: inst._id,
          error:         err.message,
        });
      }
    }
  } catch (err) {
    logger.error('[AutoFine] applyFines fatal error', { error: err.message, schoolId });
    throw err;
  }

  return summary;
};

module.exports = { applyFines, calculateFine, daysPastDue };
