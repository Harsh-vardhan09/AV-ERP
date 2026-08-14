const logger = require('../logging/logger');

const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong. Please try again.';

  if (err.code === 11000) {
    statusCode = 400;
    const keyValue = err.keyValue || {};
    const fields = Object.keys(keyValue);

    if (
      fields.includes('subjectCode') ||
      fields.includes('classLevel') ||
      fields.includes('academicYear')
    ) {
      message = `An exam config for subject "${keyValue.subjectCode || ''}", class "${keyValue.classLevel || ''}", year "${keyValue.academicYear || ''}" already exists for this school.`;
    } else {
      const field = fields[0] || 'field';
      const fieldLabel =
        {
          email: 'Email address',
          admissionNumber: 'Admission number',
          rollNo: 'Roll number',
          studentId: 'Student ID',
          employeeId: 'Employee ID',
          teacherId: 'Teacher ID',
          phone: 'Phone number',
        }[field] || field.charAt(0).toUpperCase() + field.slice(1);
      message = `${fieldLabel} already exists. Please use a different value.`;
    }
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors[0] || 'Please fill in all required fields correctly.';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid record ID. The requested item could not be found.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication failed. Please log in again.';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File is too large. Please upload a smaller file.';
  } else if (statusCode === 500) {
    // Log the real error server-side but never expose it to the client
    logger.error(`[SERVER ERROR] ${req.method} ${req.path}:`, err);
    message = 'An unexpected error occurred. Please try again or contact support.';
  }

  // ApiError.details carries machine-readable context the client acts on — e.g. a
  // 409 from an exam delete reports how many marks it would destroy, so the UI can
  // name the number. Never attached to a 500: that message is deliberately scrubbed.
  const details = statusCode !== 500 ? err.details : undefined;

  res.status(statusCode).json({ success: false, message, ...(details && { details }) });
};

module.exports = errorMiddleware;
