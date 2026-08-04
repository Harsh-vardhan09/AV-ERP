// ══════════════════════════════════════════════════════════════════
// OASES — Async Handler
// Wraps async route handlers so unhandled rejections reach the
// central error middleware instead of crashing the process.
// ══════════════════════════════════════════════════════════════════

/**
 * @param {Function} fn  Async express route handler
 * @returns {Function}   Express middleware
 */
const oasesAsyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = oasesAsyncHandler;
