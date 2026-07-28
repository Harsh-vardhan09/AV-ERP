/**
 * Import System Constants
 * Centralized configuration for all import operations
 * Ensures consistency across validation, transformation, and processing
 */

module.exports = {
  // ============ ENTITIES ============
  ENTITIES: {
    STUDENT: 'student',
    TEACHER: 'teacher',
    FEE: 'fee',
    ATTENDANCE: 'attendance',
    CLASS: 'class',
    SECTION: 'section',
    SUBJECT: 'subject',
    PAYROLL: 'payroll',
    INVENTORY: 'inventory',
  },

  // ============ FILE CONFIGURATION ============
  FILE: {
    // Max file sizes (in bytes)
    MAX_SIZE_CSV: 50 * 1024 * 1024, // 50 MB
    MAX_SIZE_XLSX: 100 * 1024 * 1024, // 100 MB
    MAX_SIZE_JSON: 50 * 1024 * 1024, // 50 MB

    // Max rows per file
    MAX_ROWS_PER_FILE: 100000, // 100k rows
    MAX_ROWS_PER_BATCH: 1000, // 1k rows per processing batch

    // Allowed MIME types — include all browser variants for CSV and XLSX
    ALLOWED_MIME_TYPES: [
      'text/csv',
      'text/plain',
      'application/vnd.ms-excel',                                          // .xls / xlsx (older browsers)
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx (standard)
      'application/octet-stream',                                          // Generic binary (some browsers/OS)
    ],
    CSV_MIME_TYPES: ['text/csv', 'text/plain'],
    XLSX_MIME_TYPES: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ],

    // File processing
    ENCODING: 'utf-8',
    CSV_DELIMITER: [',', ';', '\t', '|'],
    XLSX_SHEET_INDEX: 0,

    // Security scanning
    FORMULA_INJECTION_CHARS: ['=', '@', '+', '-'], // Excel formula prefixes
    MAX_CELL_LENGTH: 32767, // Excel cell limit
    DANGEROUS_PATTERNS: [
      /javascript:/i,
      /<script/i,
      /onclick/i,
      /onerror/i,
      /eval\(/i,
      /exec\(/i,
    ],
  },

  // ============ IMPORT STATUS ============
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    PARTIALLY_COMPLETED: 'partially_completed',
  },

  // ============ DUPLICATE HANDLING ============
  DUPLICATE_MODE: {
    SKIP: 'skip', // Skip duplicate rows
    UPDATE: 'update', // Update existing records
    STOP: 'stop', // Stop import on duplicate
  },

  // ============ VALIDATION STRICTNESS ============
  VALIDATION_STRICTNESS: {
    STRICT: 'strict', // Fail on any warning
    MODERATE: 'moderate', // Fail only on errors
    LENIENT: 'lenient', // Allow most data, flag warnings
  },

  // ============ ERROR TYPES ============
  ERROR_TYPES: {
    VALIDATION_ERROR: 'validation_error',
    BUSINESS_RULE_VIOLATION: 'business_rule_violation',
    DUPLICATE_DETECTED: 'duplicate_detected',
    REFERENCE_NOT_FOUND: 'reference_not_found',
    PERMISSION_DENIED: 'permission_denied',
    SYSTEM_ERROR: 'system_error',
    DATA_FORMAT_ERROR: 'data_format_error',
    MISSING_REQUIRED_FIELD: 'missing_required_field',
    INVALID_ENUM_VALUE: 'invalid_enum_value',
    FORMULA_INJECTION_DETECTED: 'formula_injection_detected',
    MALICIOUS_PAYLOAD_DETECTED: 'malicious_payload_detected',
    FILE_CORRUPTION_ERROR: 'file_corruption_error',
  },

  // ============ SEVERITY LEVELS ============
  SEVERITY: {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
  },

  // ============ DATA TYPES ============
  DATA_TYPES: {
    STRING: 'string',
    NUMBER: 'number',
    DATE: 'date',
    BOOLEAN: 'boolean',
    EMAIL: 'email',
    PHONE: 'phone',
    ENUM: 'enum',
    OBJECT_ID: 'objectId',
    DECIMAL: 'decimal',
    INTEGER: 'integer',
  },

  // ============ TRANSFORMATIONS ============
  TRANSFORMATIONS: {
    TRIM: 'trim',
    UPPERCASE: 'uppercase',
    LOWERCASE: 'lowercase',
    CAPITALIZE: 'capitalize',
    NORMALIZE_PHONE: 'normalizePhone',
    NORMALIZE_EMAIL: 'normalizeEmail',
    CONVERT_DATE_FORMAT: 'convertDateFormat',
    PARSE_BOOLEAN: 'parseBoolean',
    CONVERT_TO_INTEGER: 'convertToInteger',
    CONVERT_TO_DECIMAL: 'convertToDecimal',
    SPLIT_NAME: 'splitName',
    CONCATENATE_FIELDS: 'concatenateFields',
    CUSTOM_FUNCTION: 'customFunction',
  },

  // ============ VALIDATION RULES ============
  VALIDATION_RULES: {
    REQUIRED: 'required',
    UNIQUE: 'unique',
    UNIQUE_PER_SCHOOL: 'unique_per_school',
    UNIQUE_PER_CLASS: 'unique_per_class',
    UNIQUE_PER_SESSION: 'unique_per_session',
    EMAIL_FORMAT: 'email_format',
    PHONE_FORMAT: 'phone_format',
    MIN_LENGTH: 'min_length',
    MAX_LENGTH: 'max_length',
    MIN_VALUE: 'min_value',
    MAX_VALUE: 'max_value',
    PATTERN: 'pattern',
    ENUM: 'enum',
    DATE_FORMAT: 'date_format',
    DATE_RANGE: 'date_range',
    CUSTOM: 'custom',
  },

  // ============ DATE FORMATS ============
  DATE_FORMATS: [
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'MM-DD-YYYY',
    'YYYY/MM/DD',
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'DDMMYYYY',
    'YYYY-MM-DD HH:mm:ss',
    'DD-MM-YYYY HH:mm:ss',
    'ISO_8601',
  ],

  // ============ PHONE FORMATS ============
  PHONE_FORMATS: [
    /^\d{10}$/, // 10 digits
    /^\+\d{1,3}\d{10}$/, // International
    /^\+91\d{10}$/, // India
    /^0\d{10}$/, // With leading 0
    /^\d{3}-\d{3}-\d{4}$/, // XXX-XXX-XXXX
    /^\(\d{3}\)\d{3}-\d{4}$/, // (XXX)XXX-XXXX
  ],

  // ============ GENDER OPTIONS ============
  GENDERS: ['Male', 'Female', 'Other'],

  // ============ ROLES (from User model) ============
  ROLES: ['admin', 'teacher', 'student', 'admission', 'accounts', 'superAdmin'],

  // ============ BLOOD GROUPS ============
  BLOOD_GROUPS: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],

  // ============ CATEGORY (CASTE CATEGORY) ============
  CATEGORIES: ['General', 'OBC', 'SC', 'ST', 'EWS'],

  // ============ EDUCATION QUALIFICATIONS ============
  QUALIFICATIONS: ['BA', 'BSc', 'BCom', 'BEd', 'MA', 'MSc', 'MCom', 'MEd', 'PhD', 'PG Diploma'],

  // ============ QUEUE CONFIGURATION ============
  QUEUE: {
    NAME: 'import_queue',
    PRIORITY: {
      CRITICAL: 1,
      HIGH: 2,
      NORMAL: 3,
      LOW: 4,
    },
    RETRY: {
      MAX_ATTEMPTS: 3,
      BACKOFF_TYPE: 'exponential',
      BACKOFF_DELAY: 5000, // 5 seconds base
    },
    TIMEOUT: 300000, // 5 minutes
    REMOVE_ON_COMPLETE: true,
    REMOVE_ON_FAILED: false, // Keep failed jobs for debugging
  },

  // ============ PROCESSING CONFIGURATION ============
  PROCESSING: {
    BATCH_SIZE: 1000,
    CHUNK_SIZE: 1000,
    TIMEOUT_PER_ROW: 5000, // 5 seconds
    MEMORY_LIMIT: 512 * 1024 * 1024, // 512 MB
    MAX_CONCURRENT_JOBS: 5,
  },

  // ============ NOTIFICATION CONFIGURATION ============
  NOTIFICATION: {
    TYPES: {
      IMPORT_STARTED: 'import_started',
      IMPORT_COMPLETED: 'import_completed',
      IMPORT_FAILED: 'import_failed',
      IMPORT_WARNING: 'import_warning',
      IMPORT_PAUSED: 'import_paused',
    },
    SEND_ON: {
      COMPLETION: true,
      FAILURE: true,
      WARNING_THRESHOLD: 10, // Notify if 10+ warnings
    },
  },

  // ============ PERFORMANCE THRESHOLDS ============
  PERFORMANCE: {
    SLOW_IMPORT_THRESHOLD: 300000, // 5 minutes
    WARNING_THRESHOLD_ERROR_RATE: 5, // 5% error rate
    WARNING_THRESHOLD_DUPLICATE_RATE: 10, // 10% duplicate rate
    MAX_ROWS_PER_SECOND: 100, // Expected throughput
  },

  // ============ RESPONSE MESSAGES ============
  MESSAGES: {
    FILE_UPLOADED_SUCCESSFULLY: 'File uploaded successfully. Processing started.',
    IMPORT_PREVIEW_GENERATED: 'Preview generated successfully',
    IMPORT_STARTED: 'Import started and queued for processing',
    IMPORT_COMPLETED: 'Import completed successfully',
    IMPORT_PARTIALLY_COMPLETED: 'Import completed with some errors',
    IMPORT_FAILED: 'Import failed',
    INVALID_FILE_TYPE: 'Invalid file type. Please upload CSV or XLSX.',
    FILE_TOO_LARGE: 'File size exceeds the limit',
    INVALID_HEADERS: 'Invalid column headers in file',
    DUPLICATE_DETECTED: 'Duplicate record detected',
    REFERENCE_NOT_FOUND: 'Referenced entity not found',
    PERMISSION_DENIED: 'You do not have permission to perform this import',
  },

  // ============ ERROR CODES ============
  ERROR_CODES: {
    INVALID_FILE: 'ERR_INVALID_FILE',
    FILE_TOO_LARGE: 'ERR_FILE_TOO_LARGE',
    INVALID_HEADERS: 'ERR_INVALID_HEADERS',
    DUPLICATE_DETECTED: 'ERR_DUPLICATE_DETECTED',
    REFERENCE_NOT_FOUND: 'ERR_REFERENCE_NOT_FOUND',
    VALIDATION_ERROR: 'ERR_VALIDATION_ERROR',
    BUSINESS_RULE_VIOLATION: 'ERR_BUSINESS_RULE_VIOLATION',
    PERMISSION_DENIED: 'ERR_PERMISSION_DENIED',
    IMPORT_IN_PROGRESS: 'ERR_IMPORT_IN_PROGRESS',
    IMPORT_FAILED: 'ERR_IMPORT_FAILED',
    SYSTEM_ERROR: 'ERR_SYSTEM_ERROR',
  },

  // ============ DEFAULT TRANSFORMATIONS ============
  DEFAULT_TRANSFORMATIONS: {
    student: [
      'trim',
      'normalizePhone',
      'normalizeEmail',
      'convertDateFormat',
      'uppercase', // For codes like roll number
    ],
    teacher: ['trim', 'normalizePhone', 'normalizeEmail', 'convertDateFormat'],
    fee: ['trim', 'convertToDecimal'],
    attendance: ['trim', 'convertDateFormat', 'parseBoolean'],
  },

  // ============ COLUMN ALIASES ============
  COLUMN_ALIASES: {
    // Student
    firstName: ['first_name', 'firstname', 'fname', 'forename', 'given_name'],
    lastName: ['last_name', 'lastname', 'lname', 'surname', 'family_name'],
    email: ['email_address', 'e-mail', 'mail'],
    phone: ['phone_number', 'mobile', 'contact', 'telephone'],
    dateOfBirth: ['dob', 'date_of_birth', 'birthdate', 'birth_date'],
    gender: ['sex', 'gender_type'],
    admissionNumber: ['admission_no', 'admission_id', 'adm_no', 'admno'],
    rollNo: ['roll_number', 'roll_no', 'roll'],
    studentId: ['student_id', 'std_id', 'student_no'],
    classId: ['class', 'class_name', 'grade', 'standard'],
    sectionId: ['section', 'section_name', 'division'],
    session: ['academic_session', 'session_name', 'year', 'academic_year'],

    // Teacher
    employeeId: ['emp_id', 'employee_id', 'empcode', 'staff_id'],
    teacherId: ['teacher_id', 'tch_id'],
    designation: ['designation_name', 'role', 'position'],
    department: ['dept', 'department_name'],

    // Attendance
    attendanceDate: ['date', 'attendance_date', 'date_of_attendance'],
    status: ['attendance_status', 'present_absent', 'status_type'],
    userId: ['user_id', 'student_id', 'staff_id', 'emp_id'],
  },

  // ============ RESERVED COLUMNS (should not be directly mapped) ============
  RESERVED_COLUMNS: ['_id', '__v', 'createdAt', 'updatedAt', 'isDeleted', 'deletedAt', 'schoolId'],

  // ============ AUDIT TRAIL ACTIONS ============
  AUDIT_ACTIONS: {
    IMPORT_CREATED: 'import_created',
    IMPORT_STARTED: 'import_started',
    IMPORT_PAUSED: 'import_paused',
    IMPORT_RESUMED: 'import_resumed',
    IMPORT_COMPLETED: 'import_completed',
    IMPORT_FAILED: 'import_failed',
    IMPORT_CANCELLED: 'import_cancelled',
    IMPORT_REVERSED: 'import_reversed',
    PROFILE_CREATED: 'profile_created',
    PROFILE_UPDATED: 'profile_updated',
    PROFILE_DELETED: 'profile_deleted',
  },

  // ============ PERMISSIONS ============
  PERMISSIONS: {
    IMPORT_STUDENT: 'import:student',
    IMPORT_TEACHER: 'import:teacher',
    IMPORT_FEE: 'import:fee',
    IMPORT_ATTENDANCE: 'import:attendance',
    IMPORT_ALL: 'import:all',
    VIEW_IMPORTS: 'import:view',
    DELETE_IMPORTS: 'import:delete',
    MANAGE_PROFILES: 'import:manage_profiles',
    APPROVE_IMPORTS: 'import:approve',
  },

  // ============ FEATURE FLAGS ============
  FEATURES: {
    ALLOW_FORMULA_CELLS: false, // Excel formula injection prevention
    AUTO_GENERATE_IDS: true, // Auto-generate admission number, roll number, etc.
    AUTO_ASSIGN_FEES: true, // Auto-assign fees to new students
    ASYNC_PROCESSING: true, // Use queue for large imports
    DUPLICATE_DETECTION: true,
    PREVIEW_BEFORE_IMPORT: true,
    PROFILE_TEMPLATES: true,
    PROFILE_VERSIONING: true,
    IMPORT_SCHEDULING: false, // Schedule imports for later (Phase 2+)
    IMPORT_REVERSAL: false, // Reverse imports (Phase 2+)
  },

  // ============ CACHE KEYS ============
  CACHE_KEYS: {
    PREFIX: 'import:',
    PROFILES: 'import:profiles:{schoolId}:{entity}',
    SCHEMA_CACHE: 'import:schema:{entity}',
    REFERENCE_CACHE: 'import:references:{schoolId}:{entity}',
    COLUMN_ALIASES_CACHE: 'import:column_aliases',
  },

  // ============ LOG LEVELS ============
  LOG_LEVELS: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
  },
};
