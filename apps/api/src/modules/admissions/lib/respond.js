const logger = require('../../../core/logging/logger.js');

// 17 controller catch blocks returned this exact body. The frontend parses
// { success, message } — keep the shape identical.
//
// Logs the error object, not error.message, so the stack survives. The 12
// customForm/admission catches that logged only .message are deliberately left
// alone: routing them through here would change what lands in the log.
const serviceError = (res, tag, error) => {
  logger.error(tag, error);
  return res.status(500).json({ success: false, message: error.message });
};

module.exports = { serviceError };
