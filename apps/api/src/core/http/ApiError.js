class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.statusCode = status;      // errorMiddleware already reads statusCode — keep both
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
  static badRequest(m, d)   { return new ApiError(400, m, d); }
  static unauthorized(m = 'Unauthorized') { return new ApiError(401, m); }
  static forbidden(m = 'Forbidden')       { return new ApiError(403, m); }
  static notFound(m = 'Not found')        { return new ApiError(404, m); }
  static conflict(m, d)     { return new ApiError(409, m, d); }
}
module.exports = ApiError;