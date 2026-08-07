const logger = require('../../../core/logging/logger.js');

// 49 controller catch blocks ended with this exact pair. `payload` is forwarded to
// logger.error untouched, because callers pass two different shapes — a bare error
// object, or { error: error.message, schoolId: req.schoolId } — and both must survive.
// The 500 body is what the frontend parses; keep it identical.
const serviceError = (res, tag, payload) => {
  logger.error(tag, payload);
  return res.status(500).json({ success: false, message: 'Internal server error' });
};

module.exports = { serviceError };
