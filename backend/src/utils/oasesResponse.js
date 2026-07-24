// ══════════════════════════════════════════════════════════════════
// OASES — Standardised API Response Helpers
// TWO naming conventions exist in the codebase — both are supported:
//
// Convention A (oasesSuccess / oasesError) — OLD controllers:
//   oasesSuccess(res, data, message, status=200)
//   oasesError(res, message, status=500, errors=[])
//
// Convention B (success / error) — examConfig / auth controllers:
//   success(res, statusCode, message, data)
//   error(res, statusCode, message, errors=[])
// ══════════════════════════════════════════════════════════════════

// ── Convention A (original — used by upload, eval, conflict, etc.) ──
const oasesSuccess = (res, data, message = 'OK', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const oasesError = (res, message, status = 500, errors = []) => {
  return res.status(status).json({
    success: false,
    message: message || 'An error occurred',
    error:   message || 'An error occurred',
    errors,
  });
};

// ── Convention B (used by examConfig, auth, scheme controllers) ───
// These controllers call: success(res, statusCode, 'message', data)
//                         error(res, statusCode, 'message', errors)
const success = (res, statusCode, message, data) => {
  return res.status(statusCode).json({
    success: true,
    message: message || 'OK',
    data,
  });
};

const error = (res, statusCode, message, errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message: message || 'An error occurred',
    error:   message || 'An error occurred',
    errors,
  });
};

module.exports = {
  oasesSuccess,
  oasesError,
  success,
  error,
};
