const config = require('../../config/feeConfig');

/**
 * calculateFine(dueDate) → number
 *
 * Returns the fine amount for an overdue installment based on
 * feeConfig.fine.perDay (per day) and feeConfig.fine.maxDays (cap).
 * Returns 0 if the due date is in the future or today.
 */
const calculateFine = (dueDate) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (due >= now) return 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  const overdueDays = Math.floor((now - due) / msPerDay);
  const cappedDays = Math.min(overdueDays, config.fine.maxDays);

  return Math.round(cappedDays * config.fine.perDay * 100) / 100;
};

module.exports = { calculateFine };
