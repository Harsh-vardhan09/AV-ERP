const logger = require('../../../core/logging/logger.js');

// The 18 controller catch blocks in this module all logged and then returned this
// exact body. The frontend parses { success, message } — keep the shape identical.
const serviceError = (res, tag, error) => {
  logger.error(tag, error);
  return res.status(500).json({
    success: false,
    message: error.message,
  });
};

module.exports = { serviceError };
