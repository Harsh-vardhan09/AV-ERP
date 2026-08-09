// ══════════════════════════════════════════════════════════════════
// OASES Util — Client-side marks validation (Sprint 4)
// Mirror of backend marksValidation.service for instant UI feedback.
// Run BEFORE opening SubmitConfirmDialog.
// ══════════════════════════════════════════════════════════════════

/**
 * @param {object} marksMap    - { [questionNo]: { marksGiven, isNA, stepMarks } }
 * @param {Array}  sections    - scheme.sections array
 * @param {object} examConfig  - { totalMarks }
 * @param {Array}  pagesReviewed
 * @param {number} totalPages
 * @returns {{ isValid, errors, warnings, errorMap }}
 */
export const validateAllMarks = (
  marksMap,
  sections,
  examConfig,
  pagesReviewed = [],
  totalPages = 0
) => {
  const errors = [];
  const warnings = [];
  const errorMap = {}; // { questionNo: message }

  const allQuestions = sections.flatMap((s) => s.questions || []);

  // Track optional groups
  const optGroups = {}; // groupId → { allowed, attempted }

  allQuestions.forEach((q) => {
    const m = marksMap[q.questionNo];

    // HARD: no marks and not NA (only for non-optional)
    if (!m && !q.isOptional) {
      const msg = `Q${q.questionNo}: No marks entered and not marked NA.`;
      errors.push({ questionNo: q.questionNo, msg });
      errorMap[q.questionNo] = msg;
      return;
    }
    if (!m) return;

    // HARD: over max
    if (!m.isNA && m.marksGiven > q.maxMarks) {
      const msg = `Q${q.questionNo}: Marks (${m.marksGiven}) exceed max (${q.maxMarks}).`;
      errors.push({ questionNo: q.questionNo, msg });
      errorMap[q.questionNo] = msg;
    }

    // HARD: negative below allowed
    if (!m.isNA && m.marksGiven < 0) {
      const minAllowed = q.questionType === 'mcq' ? -(q.negativeMarks || 0) : 0;
      if (m.marksGiven < minAllowed) {
        const msg = `Q${q.questionNo}: Marks (${m.marksGiven}) below minimum (${minAllowed}).`;
        errors.push({ questionNo: q.questionNo, msg });
        errorMap[q.questionNo] = msg;
      }
    }

    // HARD: step sum > max
    if (m.stepMarks?.length) {
      const stepSum = m.stepMarks.reduce((s, st) => s + (st.marks || 0), 0);
      if (stepSum > q.maxMarks) {
        const msg = `Q${q.questionNo}: Step total (${stepSum}) > max (${q.maxMarks}).`;
        errors.push({ questionNo: q.questionNo, msg });
        errorMap[q.questionNo] = msg;
      }
    }

    // Optional group tracking
    if (q.isOptional && q.optionGroup) {
      if (!optGroups[q.optionGroup]) {
        optGroups[q.optionGroup] = { allowed: q.optionGroupAllowed || 1, attempted: 0 };
      }
      if (!m.isNA) optGroups[q.optionGroup].attempted++;
    }
  });

  // Optional group checks
  Object.entries(optGroups).forEach(([groupId, { allowed, attempted }]) => {
    if (attempted > allowed) {
      errors.push({
        questionNo: null,
        msg: `Group ${groupId}: ${attempted} answered but only ${allowed} allowed.`,
      });
    } else if (attempted < allowed) {
      warnings.push({
        questionNo: null,
        msg: `Group ${groupId}: Only ${attempted}/${allowed} attempted.`,
      });
    }
  });

  // Warnings
  const answeredMarks = allQuestions
    .filter((q) => marksMap[q.questionNo] && !marksMap[q.questionNo].isNA)
    .map((q) => marksMap[q.questionNo].marksGiven || 0);

  const grandTotal = answeredMarks.reduce((s, v) => s + v, 0);

  if (answeredMarks.length > 0 && grandTotal === 0) {
    warnings.push({
      questionNo: null,
      msg: 'All answered questions have 0 marks — did you forget to mark?',
    });
  }

  if (examConfig?.totalMarks && grandTotal > 0.9 * examConfig.totalMarks) {
    warnings.push({
      questionNo: null,
      msg: `Total (${grandTotal}) is unusually high (> 90% of ${examConfig.totalMarks}).`,
    });
  }

  const unreviewedPages = totalPages - (pagesReviewed?.length || 0);
  if (unreviewedPages > 0) {
    warnings.push({ questionNo: null, msg: `${unreviewedPages} page(s) not reviewed.` });
  }

  return { isValid: errors.length === 0, errors, warnings, errorMap };
};
