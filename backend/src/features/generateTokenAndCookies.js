const jwt = require("jsonwebtoken");

exports.genereteTokenAndCookies = (res, userid) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set. Server cannot start safely.');
  }

  // FIX HIGH-1: JWT expiry and cookie expiry now BOTH set to 7 days.
  // Previously JWT expired in 1d but cookie lasted 7d, causing daily forced re-login.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const token = jwt.sign({ userid }, process.env.JWT_SECRET, { expiresIn: '7d' });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie("token", token, {
    httpOnly: true,
    secure:   isProduction,                // HTTPS only in production
    sameSite: isProduction ? 'None' : 'Lax',
    // NOTE: Do NOT set domain for Vercel deployments.
    // Setting domain breaks cross-subdomain cookies on Vercel.
    expires: new Date(Date.now() + SEVEN_DAYS_MS),
    path:    '/',
  });

  return token;
};
