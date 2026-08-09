/**
 * generatePassword.js
 * Utility to generate strong temporary passwords for admin-created staff accounts.
 */

/**
 * generateTempPassword
 * Returns a 12-character password with at least:
 *   - 1 uppercase letter
 *   - 1 lowercase letter
 *   - 1 digit
 *   - 1 special character (@#$!)
 * Remaining characters are drawn from a combined pool and the result is shuffled.
 */
exports.generateTempPassword = () => {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '@#$!';
  const all     = upper + lower + digits + special;

  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];

  // Guarantee at least one from each category
  const mandatory = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(special),
  ];

  // Fill remaining 8 characters from the combined pool
  const rest = Array.from({ length: 8 }, () => pick(all));

  // Combine and Fisher-Yates shuffle
  const combined = [...mandatory, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
};

/**
 * generateStaffUsername
 * Returns a human-readable username hint (not stored — for display in emails only).
 * e.g. "john.doe@SUNRISE01"
 */
exports.generateStaffUsername = (firstName, lastName, schoolCode) => {
  const cleanFirst = (firstName || '').toLowerCase().replace(/\s+/g, '');
  const cleanLast  = (lastName  || '').toLowerCase().replace(/\s+/g, '');
  return `${cleanFirst}.${cleanLast}@${(schoolCode || '').toUpperCase()}`;
};
