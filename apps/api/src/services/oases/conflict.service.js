// ══════════════════════════════════════════════════════════════════
// OASES Service — Conflict Detection + Auto-resolution (Sprint 4)
// Called by evaluationController.submitMarks after round 2 submit.
// ══════════════════════════════════════════════════════════════════
const AnswerSheet       = require('../../models/oases/AnswerSheet');
const EvaluationMark    = require('../../models/oases/EvaluationMark');
const ExamConfig        = require('../../models/oases/ExamConfig');
const Exam              = require('../../models/Exam');
const OasesNotification = require('../../models/oases/OasesNotification');
const { emitToAll }     = require('../../socket');
const auditService      = require('./auditService');
const { lockSheet }     = require('./result.service');
const {
  SHEET_STATUS, EVAL_ROUNDS, NOTIFICATION_TYPES,
} = require('../../utils/oasesConstants');

/**
 * Check if round 1 vs round 2 totals are within conflict threshold.
 * If within → auto-average and lock.
 * If outside → mark 'conflict', notify head examiners.
 *
 * @param {string} sheetId
 * @param {string} schoolId
 */
const checkConflict = async (sheetId, schoolId) => {
  try {
    const sheet = await AnswerSheet.findById(sheetId).lean();
    if (!sheet) return;

    // Try legacy OasesExamConfig, fall back to unified Exam model
    const examConfig = (await ExamConfig.findById(sheet.examConfigId).lean())
      || (await Exam.findById(sheet.examConfigId).select('conflictThreshold').lean());
    const threshold  = examConfig?.conflictThreshold ?? 5;

    const [e1, e2] = await Promise.all([
      EvaluationMark.findOne({ sheetId, round: EVAL_ROUNDS.ROUND_1, isDraft: false }).lean(),
      EvaluationMark.findOne({ sheetId, round: EVAL_ROUNDS.ROUND_2, isDraft: false }).lean(),
    ]);

    if (!e1 || !e2) return; // both rounds must be submitted

    const t1   = e1.grandTotal || e1.totalMarksAwarded || 0;
    const t2   = e2.grandTotal || e2.totalMarksAwarded || 0;
    const diff = Math.abs(t1 - t2);

    if (diff <= threshold) {
      // ── Auto-average: round to nearest 0.5 ─────────────────────
      const averaged = Math.round(((t1 + t2) / 2) * 2) / 2;
      await lockSheet(sheetId, schoolId, averaged, { hadConflict: false, lockedBy: sheet.lockedBy || sheet.eval2AssignedTo });
    } else {
      // ── Mark conflict ──────────────────────────────────────────
      await AnswerSheet.findByIdAndUpdate(sheetId, { status: SHEET_STATUS.CONFLICT });

      emitToAll('oases:sheet:status', {
        sheetId, examConfigId: sheet.examConfigId, status: SHEET_STATUS.CONFLICT,
      });

      auditService.log({
        schoolId,
        entityType: 'AnswerSheet',
        entityId:   sheetId,
        actorId:    e2.evaluatorId,
        actorRole:  'SYSTEM',
        action:     'CONFLICT_RAISED',
        details:    { e1Total: t1, e2Total: t2, diff, threshold },
      });

      // Notify all head examiners for this school
      const { User } = require('../../models/user.js');
      const heads = await User.find({ schoolId, oasesRole: 'HEAD_EXAMINER' }).select('_id').lean();
      if (heads.length) {
        await OasesNotification.insertMany(
          heads.map((h) => ({
            schoolId,
            recipientId: h._id,
            type:        NOTIFICATION_TYPES.CONFLICT,
            title:       'Mark Conflict Detected',
            message:     `Sheet ${sheet.anonymousCode} has a mark conflict (E1: ${t1}, E2: ${t2}, diff: ${diff.toFixed(1)}).`,
            entityType:  'AnswerSheet',
            entityId:    sheetId,
          }))
        );
      }
    }
  } catch (err) {
    console.error('[conflict.service] checkConflict error:', err.message);
  }
};

module.exports = { checkConflict };
