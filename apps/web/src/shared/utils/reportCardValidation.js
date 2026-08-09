/**
 * REPORT CARD VALIDATION HELPERS (Frontend)
 * Unified logic for determining if report card generation is allowed
 */

/**
 * Check if report card generation is allowed
 * Takes isOasesEnabled, exams, and checks accordingly
 */
export const canGenerateReport = ({ isOasesEnabled, exams = [] }) => {
  if (isOasesEnabled) {
    // OASES ON: All exams must be evaluated
    return exams.length > 0 && exams.every((e) => e.evaluationStatus === 'completed');
  } else {
    // OASES OFF: Just need to have exams configured (marks can be entered manually)
    // Note: Backend will do stricter validation on marks existence
    return true;
  }
};

/**
 * Get dynamic message for why report generation is blocked
 */
export const getBlockReasonMessage = ({ isOasesEnabled, exams = [] }) => {
  if (!isOasesEnabled) {
    // Never blocked when OASES is OFF (marks entry is manual)
    return null;
  }

  // OASES ON: Show evaluation status
  if (!exams.length) {
    return 'No exams configured for this class';
  }

  const completedCount = exams.filter((e) => e.evaluationStatus === 'completed').length;
  if (completedCount < exams.length) {
    const pendingCount = exams.length - completedCount;
    return `${pendingCount} exam(s) not yet evaluated. Complete all exams before generating.`;
  }

  return null;
};

/**
 * Filter exams to show based on OASES toggle
 * OASES ON: Only show evaluated exams
 * OASES OFF: Show all exams (for informational purposes)
 */
export const getDisplayExams = ({ isOasesEnabled, allExams = [] }) => {
  if (isOasesEnabled) {
    // OASES ON: Filter to completed only
    return allExams.filter((e) => e.evaluationStatus === 'completed');
  } else {
    // OASES OFF: Show all exams
    return allExams;
  }
};

/**
 * Check if marks are complete (for OASES OFF mode)
 * This is a lightweight frontend check — backend does the real validation
 */
export const areMarksComplete = ({ marksRows = [], exams = [] }) => {
  if (!marksRows.length || !exams.length) return false;

  // For OASES OFF, check if every subject has at least one mark entered
  return marksRows.every((row) => {
    if (!row.dynamicMarks) return false;
    const markCount = Object.values(row.dynamicMarks || {}).filter(
      (m) => m !== null && m !== ''
    ).length;
    return markCount > 0;
  });
};
