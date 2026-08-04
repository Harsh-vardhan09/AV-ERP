// ══════════════════════════════════════════════════════════════════
// OASES Service — Marks Validation (Sprint 4)
// validateMarks: hard errors (block submit) + warnings (show only)
// calculateTotals: section totals + grand total from marks + scheme
// ══════════════════════════════════════════════════════════════════

/**
 * Calculate section totals + grand total.
 * Handles: NA questions, optional groups (only best N count).
 */
const calculateTotals = (marks, questions) => {
  const sectionTotals = {};
  let grandTotal = 0;

  // Build question lookup
  const qMap = {};
  (questions || []).forEach((q) => { qMap[q.questionNo] = q; });

  // Build mark lookup
  const mMap = {};
  (marks || []).forEach((m) => { mMap[m.questionNo] = m; });

  // Group optional questions by optionGroup
  const optGroups = {}; // { groupId: [{questionNo, marksGiven, section}] }
  const normalQs  = [];

  (questions || []).forEach((q) => {
    const m = mMap[q.questionNo];
    if (!m || m.isNA) return; // skip unanswered / NA

    if (q.isOptional && q.optionGroup) {
      if (!optGroups[q.optionGroup]) optGroups[q.optionGroup] = { allowed: q.optionGroupAllowed || 1, items: [] };
      optGroups[q.optionGroup].items.push({
        questionNo: q.questionNo,
        section:    q.section || 'A',
        marks:      m.marksGiven || 0,
      });
    } else {
      normalQs.push({ questionNo: q.questionNo, section: q.section || 'A', marks: m.marksGiven || 0 });
    }
  });

  // Count normal questions
  normalQs.forEach(({ section, marks }) => {
    sectionTotals[section] = (sectionTotals[section] || 0) + marks;
    grandTotal += marks;
  });

  // For optional groups: take best N (by marks)
  Object.values(optGroups).forEach(({ allowed, items }) => {
    const sorted = [...items].sort((a, b) => b.marks - a.marks);
    const accepted = sorted.slice(0, allowed);
    accepted.forEach(({ section, marks }) => {
      sectionTotals[section] = (sectionTotals[section] || 0) + marks;
      grandTotal += marks;
    });
  });

  return { sectionTotals, grandTotal: Math.round(grandTotal * 100) / 100 };
};

/**
 * Validate marks for a completed EvaluationMark doc.
 *
 * @param {object} evalMarkDoc   - EvaluationMark mongoose doc (lean)
 * @param {object} schemeDoc     - QuestionScheme mongoose doc (lean)
 * @param {object} examConfig    - ExamConfig (lean) — for totalMarks threshold
 * @returns {{ isValid:boolean, errors:Array, warnings:Array }}
 */
const validateMarks = (evalMarkDoc, schemeDoc, examConfig) => {
  const errors   = [];
  const warnings = [];

  const marks     = evalMarkDoc?.marks || [];
  const questions = schemeDoc?.questions || [];

  // Build lookups
  const qMap = {};
  questions.forEach((q) => { qMap[q.questionNo] = q; });
  const mMap = {};
  marks.forEach((m) => { mMap[m.questionNo] = m; });

  // ── Schemaless mode: single TOTAL entry (no question scheme) ───
  // When teacher has no question scheme, frontend sends [{questionNo:'TOTAL', marksGiven:N}].
  // In this case skip all per-question checks — just validate the total.
  const isTotalOnlySubmission = marks.length === 1 && String(marks[0]?.questionNo).toUpperCase() === 'TOTAL';
  if (isTotalOnlySubmission) {
    const totalGiven = marks[0].marksGiven || 0;
    if (totalGiven < 0) {
      errors.push({ questionNo: 'TOTAL', msg: 'Total marks cannot be negative.' });
    }
    if (examConfig?.totalMarks && totalGiven > examConfig.totalMarks) {
      errors.push({ questionNo: 'TOTAL', msg: `Total (${totalGiven}) exceeds maximum allowed (${examConfig.totalMarks}).` });
    }
    return { isValid: errors.length === 0, errors, warnings, sectionTotals: {}, grandTotal: totalGiven };
  }

  // ── Check every question in scheme ─────────────────────────────
  questions.forEach((q) => {
    const m = mMap[q.questionNo];

    // HARD: question has neither marks nor isNA
    if (!m && !q.isOptional) {
      errors.push({ questionNo: q.questionNo, msg: `Q${q.questionNo}: No marks entered and not marked NA.` });
      return;
    }
    if (!m) return; // optional unanswered → warn later via group check

    // HARD: negative marks
    if (!m.isNA && m.marksGiven < 0) {
      // MCQ negative marks are allowed only down to -negativeMarks
      const minAllowed = q.questionType === 'mcq' ? -(q.negativeMarks || 0) : 0;
      if (m.marksGiven < minAllowed) {
        errors.push({ questionNo: q.questionNo, msg: `Q${q.questionNo}: Marks (${m.marksGiven}) below minimum (${minAllowed}).` });
      }
    }

    // HARD: exceeds maxMarks
    if (!m.isNA && m.marksGiven > q.maxMarks) {
      errors.push({ questionNo: q.questionNo, msg: `Q${q.questionNo}: Marks (${m.marksGiven}) exceed max (${q.maxMarks}).` });
    }

    // HARD: step marks sum > maxMarks
    if (m.stepMarks?.length > 0) {
      const stepSum = m.stepMarks.reduce((s, st) => s + (st.marks || 0), 0);
      if (stepSum > q.maxMarks) {
        errors.push({ questionNo: q.questionNo, msg: `Q${q.questionNo}: Step marks sum (${stepSum}) exceeds question max (${q.maxMarks}).` });
      }
    }
  });


  // ── Optional group checks ───────────────────────────────────────
  const optGroups = {}; // groupId → { allowed, attempted }
  questions.forEach((q) => {
    if (!q.isOptional || !q.optionGroup) return;
    if (!optGroups[q.optionGroup]) {
      optGroups[q.optionGroup] = { allowed: q.optionGroupAllowed || 1, attempted: 0 };
    }
    const m = mMap[q.questionNo];
    if (m && !m.isNA) optGroups[q.optionGroup].attempted++;
  });

  Object.entries(optGroups).forEach(([groupId, { allowed, attempted }]) => {
    if (attempted > allowed) {
      errors.push({ questionNo: null, msg: `Optional group ${groupId}: ${attempted} questions answered but only ${allowed} allowed.` });
    }
    if (attempted < allowed) {
      warnings.push({ questionNo: null, msg: `Optional group ${groupId}: Only ${attempted}/${allowed} optional questions answered.` });
    }
  });

  // ── Arithmetic integrity check ──────────────────────────────────
  const { sectionTotals, grandTotal } = calculateTotals(marks, questions);
  const sumOfSections = Object.values(sectionTotals).reduce((s, v) => s + v, 0);
  if (Math.abs(grandTotal - sumOfSections) > 0.01) {
    errors.push({ questionNo: null, msg: `Arithmetic error: grandTotal (${grandTotal}) ≠ sum of sections (${sumOfSections}).` });
  }

  // ── Stored grandTotal vs recalculated ──────────────────────────
  if (evalMarkDoc.grandTotal !== undefined && Math.abs(evalMarkDoc.grandTotal - grandTotal) > 0.01) {
    errors.push({ questionNo: null, msg: `Total mismatch: stored ${evalMarkDoc.grandTotal} ≠ recalculated ${grandTotal}.` });
  }

  // ── Warnings ───────────────────────────────────────────────────
  const answeredCount  = marks.filter((m) => !m.isNA).length;
  const totalQuestions = questions.length;

  if (answeredCount > 0 && grandTotal === 0) {
    warnings.push({ questionNo: null, msg: 'All answered questions have 0 marks — did you forget to mark?' });
  }

  if (examConfig?.totalMarks && grandTotal > 0.9 * examConfig.totalMarks) {
    warnings.push({ questionNo: null, msg: `Grand total (${grandTotal}) is unusually high (> 90% of ${examConfig.totalMarks}).` });
  }

  const pagesReviewed = evalMarkDoc.pagesReviewed?.length || 0;
  const totalPages    = examConfig?.totalPages || 0;
  if (totalPages > 0 && pagesReviewed < totalPages) {
    warnings.push({ questionNo: null, msg: `${totalPages - pagesReviewed} page(s) not reviewed.` });
  }

  return {
    isValid:       errors.length === 0,
    errors,
    warnings,
    sectionTotals,
    grandTotal,
  };
};

module.exports = { validateMarks, calculateTotals };
