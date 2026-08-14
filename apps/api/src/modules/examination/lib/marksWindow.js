/**
 * Single source of truth for "may marks be entered for this exam right now?".
 *
 * The decision AND the message shown to the user come out of this one call, so
 * they cannot disagree. They used to: the decision was `status === 'upcoming' ||
 * now < startDate` while the message was built only from `startDate`, so an exam
 * locked by the status term announced "Marks entry opens on 5 Aug 2026" on
 * 15 Aug 2026 — a date ten days in the past.
 *
 * Exam.status is deliberately NOT consulted. It defaults to 'upcoming'
 * (models/Exam.js), nothing ever transitions it — examination/module.js declares
 * `jobs: []` and no scheduler exists anywhere in the repo — and no UI writes it.
 * Every exam therefore read as permanently not-started. The window is derived
 * from dates at read time so a worker that never runs cannot lock a teacher out.
 *
 * The window CLOSES on an explicit act (evaluationLocked, or an admin setting
 * marksEntryOverride='closed'), not on exam.endDate: marks are normally entered
 * after the last paper is written, so closing at endDate would lock every
 * finished exam.
 */

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });

/**
 * @param {object} exam  needs name, startDate, evaluationLocked, marksEntryOverride
 * @returns {{open:boolean, code:string, message:string|null, opensOn:string|null}}
 */
const evaluateMarksWindow = (exam) => {
  if (!exam) {
    return { open: false, code: 'NO_EXAM', message: 'Exam not found.', opensOn: null };
  }

  if (exam.evaluationLocked) {
    return {
      open: false,
      code: 'EVALUATION_LOCKED',
      message: `Evaluation is locked for "${exam.name}". Marks can no longer be changed.`,
      opensOn: null,
    };
  }

  // Manual override, used when a school reschedules and the dates on the exam no
  // longer describe reality. It is a dedicated field because Exam.status cannot
  // serve the purpose: its default is indistinguishable from a deliberate
  // choice, which is exactly how every exam ended up locked.
  if (exam.marksEntryOverride === 'open') {
    return { open: true, code: 'ADMIN_OPEN', message: null, opensOn: null };
  }
  if (exam.marksEntryOverride === 'closed') {
    return {
      open: false,
      code: 'ADMIN_CLOSED',
      message: `Marks entry for "${exam.name}" has been closed by an administrator.`,
      opensOn: null,
    };
  }

  const opensAt = exam.startDate ? new Date(exam.startDate) : null;
  if (opensAt && Date.now() < opensAt.getTime()) {
    return {
      open: false,
      code: 'NOT_OPEN_YET',
      message: `"${exam.name}" has not started yet. Marks entry opens on ${fmtDate(opensAt)}.`,
      opensOn: opensAt.toISOString(),
    };
  }

  return { open: true, code: 'OPEN', message: null, opensOn: null };
};

module.exports = { evaluateMarksWindow };
