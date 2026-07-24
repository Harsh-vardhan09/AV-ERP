/**
 * fineController.js
 *
 * HTTP layer for the auto-fine feature.
 * All routes are admin-only and fully schoolId-scoped.
 *
 * Endpoints:
 *   POST /api/v1/fee/installments/apply-fines
 *     → Apply fines to all overdue installments for this school
 *   GET  /api/v1/fee/installments/overdue-summary
 *     → Preview: how many installments are overdue + total fine due
 */

'use strict';

const mongoose    = require('mongoose');
const Installment = require('../../models/fee/Installment');
const StudentFee  = require('../../models/fee/StudentFee');
const { applyFines } = require('../../services/fee/autoFineService');
const logger      = require('../../utils/logger');

const sendError   = (res, status, msg) => res.status(status).json({ success: false, message: msg });
const sendSuccess = (res, status, msg, data = null) => {
  const body = { success: true, message: msg };
  if (data !== null) body.data = data;
  return res.status(status).json(body);
};

// ─── POST /apply-fines ────────────────────────────────────────────────────────
// Body (all optional): { fineType, flatAmount, percentPerDay, maxPct, studentFeeId }
//
// fineType      : 'flat' | 'percent'  (default: 'flat')
// flatAmount    : number              (default: 50)
// percentPerDay : number              (default: 2)
// maxPct        : number              (default: 20)
// studentFeeId  : ObjectId            (optional — restrict to one student's fee)

exports.applyFines = async (req, res) => {
  try {
    const {
      fineType,
      flatAmount,
      percentPerDay,
      maxPct,
      studentFeeId,
    } = req.body;

    // Build fine policy from request (falls back to defaults in service if not provided)
    const finePolicy = {};
    if (fineType      !== undefined) finePolicy.type           = fineType;
    if (flatAmount    !== undefined) finePolicy.flatAmount      = Number(flatAmount);
    if (percentPerDay !== undefined) finePolicy.percentPerDay   = Number(percentPerDay);
    if (maxPct        !== undefined) finePolicy.maxPct          = Number(maxPct);

    // Optional filter: scope to a single student's fee record
    const filters = {};
    if (studentFeeId) {
      if (!mongoose.Types.ObjectId.isValid(studentFeeId)) {
        return sendError(res, 400, 'Invalid studentFeeId format');
      }
      filters.studentFeeId = new mongoose.Types.ObjectId(studentFeeId);
    }

    const summary = await applyFines(req.schoolId, finePolicy, filters);

    logger.info('[FineController] applyFines completed', {
      schoolId: req.schoolId,
      triggeredBy: req.user._id,
      summary,
    });

    return sendSuccess(res, 200, 'Fines applied successfully', summary);
  } catch (err) {
    logger.error('[FineController] applyFines error', { error: err.message, schoolId: req.schoolId });
    return sendError(res, 500, 'Internal server error');
  }
};

// ─── GET /overdue-summary ─────────────────────────────────────────────────────
// Returns a preview of overdue installments WITHOUT applying any fines.
// Use this to show the admin what would be fined before triggering apply-fines.

exports.getOverdueSummary = async (req, res) => {
  try {
    // Step 1: Get all StudentFee IDs for this school
    const schoolFeeIds = await StudentFee
      .find({ schoolId: req.schoolId })
      .select('_id')
      .lean()
      .then(docs => docs.map(d => d._id));

    if (!schoolFeeIds.length) {
      return sendSuccess(res, 200, 'No fee records found for this school', {
        overdueCount: 0,
        totalFineAlreadyStamped: 0,
        totalRemainingOverdue: 0,
      });
    }

    // Step 2: Aggregate overdue installments
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await Installment.aggregate([
      {
        $match: {
          studentFeeId: { $in: schoolFeeIds },
          status:       { $in: ['pending', 'partial', 'overdue'] },
          dueDate:      { $lt: today },
        },
      },
      {
        $group: {
          _id:                     null,
          overdueCount:            { $sum: 1 },
          totalRemainingOverdue:   { $sum: '$remainingAmount' },
          totalFineAlreadyStamped: { $sum: '$fineAmount' },
        },
      },
    ]);

    return sendSuccess(res, 200, 'Overdue summary fetched', {
      overdueCount:            result?.overdueCount            ?? 0,
      totalRemainingOverdue:   result?.totalRemainingOverdue   ?? 0,
      totalFineAlreadyStamped: result?.totalFineAlreadyStamped ?? 0,
    });
  } catch (err) {
    logger.error('[FineController] getOverdueSummary error', { error: err.message, schoolId: req.schoolId });
    return sendError(res, 500, 'Internal server error');
  }
};
