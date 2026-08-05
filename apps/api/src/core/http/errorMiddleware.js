const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong. Please try again.';

  // ── Mongoose: Duplicate key (e.g. unique field already exists) ──
  if (err.code === 11000) {
    statusCode = 400;
    const keyValue = err.keyValue || {};
    const fields   = Object.keys(keyValue);

    // ExamConfig compound unique key: schoolId + subjectCode + classLevel + academicYear
    if (fields.includes('subjectCode') || fields.includes('classLevel') || fields.includes('academicYear')) {
      message = `An exam config for subject "${keyValue.subjectCode || ''}", class "${keyValue.classLevel || ''}", year "${keyValue.academicYear || ''}" already exists for this school.`;
    } else {
      const field = fields[0] || 'field';
      const fieldLabel = {
        email:            'Email address',
        admissionNumber:  'Admission number',
        rollNo:           'Roll number',
        studentId:        'Student ID',
        employeeId:       'Employee ID',
        teacherId:        'Teacher ID',
        phone:            'Phone number',
      }[field] || field.charAt(0).toUpperCase() + field.slice(1);
      message = `${fieldLabel} already exists. Please use a different value.`;
    }
  }

  // ── Mongoose: Validation errors ──
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    message = errors[0] || 'Please fill in all required fields correctly.';
  }

  // ── Mongoose: Bad ObjectId (invalid ID in URL) ──
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid record ID. The requested item could not be found.';
  }

  // ── JWT: Token expired ──
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  }

  // ── JWT: Invalid token ──
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Authentication failed. Please log in again.';
  }

  // ── Multer: File too large ──
  else if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File is too large. Please upload a smaller file.';
  }

  // ── Generic 500: hide raw details ──
  else if (statusCode === 500) {
    // Log the real error server-side but don't expose it
    console.error(`[SERVER ERROR] ${req.method} ${req.path}:`, err);
    message = 'An unexpected error occurred. Please try again or contact support.';
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorMiddleware;

