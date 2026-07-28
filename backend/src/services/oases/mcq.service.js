// ══════════════════════════════════════════════════════════════════
// OASES Service — MCQ Scoring (Sprint 5)
// scoreMCQ: returns marks based on student option vs correct key.
// Used by server-side saveMark validation for MCQ questions.
// ══════════════════════════════════════════════════════════════════

/**
 * Compute MCQ marks from a student's selected option.
 *
 * @param {string} studentOption   - 'A'|'B'|'C'|'D'|'NA'
 * @param {string} correctOption   - 'A'|'B'|'C'|'D'
 * @param {number} maxMarks        - marks for correct answer
 * @param {number} negMarks        - penalty (positive value, e.g. 0.25)
 * @returns {number}               - marks to award (can be negative)
 */
const scoreMCQ = (studentOption, correctOption, maxMarks, negMarks = 0) => {
  if (!studentOption || studentOption === 'NA') return 0;
  if (studentOption === correctOption) return maxMarks;
  return -Math.abs(negMarks);
};

/**
 * Validate that a manually-submitted MCQ mark equals the computed score.
 * Evaluator selects option; server recomputes score from answer key.
 *
 * @param {string}  studentOption  - from metadata.studentOption
 * @param {string}  correctOption  - from scheme (server-side only)
 * @param {number}  maxMarks
 * @param {number}  negMarks
 * @param {number}  submittedMark  - marksGiven sent by client
 * @returns {{ valid:boolean, expected:number }}
 */
const validateMCQMark = (studentOption, correctOption, maxMarks, negMarks, submittedMark) => {
  if (!correctOption) {
    // No answer key yet — soft validation only (accept any value)
    return { valid: true, expected: submittedMark };
  }
  const expected = scoreMCQ(studentOption, correctOption, maxMarks, negMarks);
  const valid    = Math.abs(submittedMark - expected) < 0.001;
  return { valid, expected };
};

module.exports = { scoreMCQ, validateMCQMark };
