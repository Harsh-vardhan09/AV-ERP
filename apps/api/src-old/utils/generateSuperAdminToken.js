const jwt = require('jsonwebtoken');
const { crossSiteCookie } = require('../../src/core/security/cookieOptions.js');

/**
 * generateSuperAdminToken
 *
 * Signs a JWT for the super admin and sets it as an HTTP-only cookie.
 *
 * CRITICAL ISOLATION:
 *  - Cookie name: "superAdminToken"  — NOT "token" (that belongs to school users)
 *  - Secret:      SUPER_ADMIN_JWT_SECRET — NOT JWT_SECRET
 *  - Expiry:      1 day (shorter than school users for security)
 *
 * @param {object} res          - Express response object
 * @param {string} superAdminId - SuperAdmin document _id
 * @returns {string}            - The signed JWT string
 */
exports.generateSuperAdminToken = (res, superAdminId) => {
  if (!process.env.SUPER_ADMIN_JWT_SECRET) {
    throw new Error(
      '[generateSuperAdminToken] ' +
      'SUPER_ADMIN_JWT_SECRET environment variable is not set.'
    );
  }

  const token = jwt.sign(
    { id: superAdminId },
    process.env.SUPER_ADMIN_JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.cookie('superAdminToken', token, {
    ...crossSiteCookie(res.req),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
  });

  return token;
};
