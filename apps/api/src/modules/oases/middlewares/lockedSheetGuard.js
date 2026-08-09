// OASES Middleware — Locked Sheet Guard
// Returns 403 if the requested sheet is already locked.
// Mounted on all evaluation MUTATION routes (saveMark, submit, draft).
const AnswerSheet = require('../models/AnswerSheet');
const { SHEET_STATUS } = require('../lib/constants');
const oasesAsync = require('../../../core/http/asyncHandler');

/**
 * Middleware — reject mutations on locked/rejected/UFM sheets.
 * Reads :sheetId from req.params.
 */
const lockedSheetGuard = oasesAsync(async (req, res, next) => {
  const sheetId = req.params.sheetId || req.params.id || req.body?.sheetId;
  if (!sheetId) return next(); // no sheetId in route → skip

  const sheet = await AnswerSheet.findById(sheetId)
    .select('status schoolId').lean();

  if (!sheet) {
    return res.status(404).json({
      success: false,
      error:   'Answer sheet not found.',
      errors:  [],
    });
  }

  // School isolation check
  if (sheet.schoolId?.toString() !== req.schoolId?.toString()) {
    return res.status(403).json({
      success: false,
      error:   'Access denied.',
      errors:  [],
    });
  }

  const BLOCKED_STATUSES = [
    SHEET_STATUS.LOCKED,
    SHEET_STATUS.REJECTED,
    SHEET_STATUS.UFM_FLAGGED,
  ];

  if (BLOCKED_STATUSES.includes(sheet.status)) {
    return res.status(403).json({
      success: false,
      error:   `Sheet is ${sheet.status}. No further mutations allowed.`,
      errors:  [],
      status:  sheet.status,
    });
  }

  next();
});

module.exports = lockedSheetGuard;
