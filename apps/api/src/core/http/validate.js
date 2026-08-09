const ApiError = require('./ApiError');

const PARTS = ['body', 'query', 'params'];

// Replaces req[part] with the parsed value so downstream code gets coerced types
const validate = (schemas = {}) => (req, res, next) => {
  const fieldErrors = {};

  for (const part of PARTS) {
    const schema = schemas[part];
    if (!schema) continue;

    const result = schema.safeParse(req[part]);
    if (result.success) {
      req[part] = result.data;
    } else {
      Object.assign(fieldErrors, result.error.flatten().fieldErrors);
    }
  }

  if (Object.keys(fieldErrors).length) {
    return next(ApiError.badRequest('Validation failed', fieldErrors));
  }
  next();
};

module.exports = { validate };
