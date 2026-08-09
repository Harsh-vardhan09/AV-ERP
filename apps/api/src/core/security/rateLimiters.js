const rateLimit = require('express-rate-limit');

const base = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
};

const authLimiter = rateLimit({ ...base, max: 50 });    // login, signup, reset
const apiLimiter  = rateLimit({ ...base, max: 300 });   // everything else

module.exports = { authLimiter, apiLimiter };