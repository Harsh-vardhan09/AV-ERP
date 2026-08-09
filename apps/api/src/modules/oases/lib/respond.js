// Error responses for this module.
//
// core/http/ApiResponse.fail() emits { success, message, details? }. The oases
// controllers emit { success, message, error, errors } — four keys, with `error`
// duplicating `message`. The frontend parses that shape, so errors keep it here
// rather than moving to fail(). Success responses did move: they are already
// { success, message, data }, identical to ok()/created().
//
// Signature is the old oasesError order. The examConfig / questionScheme / auth
// controllers used the opposite order and their call sites were reordered.
const apiError = (res, message, status = 500, errors = []) =>
  res.status(status).json({
    success: false,
    message: message || 'An error occurred',
    error:   message || 'An error occurred',
    errors,
  });

module.exports = { apiError };
