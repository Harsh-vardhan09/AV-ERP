/**
 * helpers.js — shared utility functions
 */
const crypto = require('crypto'); // Node built-in — no npm package needed

/**
 * round(val) — round to 2 decimal places (financial precision)
 */
const round = (val) => Math.round((val || 0) * 100) / 100;

/**
 * generateReceiptNumber() — cryptographically unique receipt number.
 *
 * Format: RCP-<YYYYMMDD>-<6-char random hex uppercase>
 * e.g.    RCP-20240326-A3F9C2
 *
 * FIX MED-1: Uses crypto.randomBytes() instead of Math.random() to
 * eliminate collision risk under concurrent payment processing.
 * Math.random() is NOT cryptographically unique and caused collisions
 * when multiple payments arrived within the same second.
 */
const generateReceiptNumber = () => {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

  // crypto.randomBytes(3) = 3 bytes = 6 hex chars — guaranteed unique
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `RCP-${datePart}-${randomPart}`;
};

module.exports = { round, generateReceiptNumber };
