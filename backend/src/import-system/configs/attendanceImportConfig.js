/**
 * Attendance Import Configuration
 */

const { DATA_TYPES, VALIDATION_STRICTNESS } = require('../constants/importConstants');

const ATTENDANCE_IMPORT_CONFIG = {
  entity: 'attendance',
  name: 'Attendance',
  description: 'Import attendance records for students and teachers',
  version: '1.0',

  requiredFields: ['studentId', 'date', 'status'],
  optionalFields: [
    'remarks',
    'markedBy',
    'percentage',
    'sessionId',
  ],

  columnAliases: {
    studentId: ['student_id', 'roll_no', 'admission_no'],
    markedBy: ['marked_by', 'teacher_id', 'teacher_name'],
    percentage: ['attendance_percentage', 'percentage_present'],
  },

  fieldRules: {
    studentId: {
      required: true,
      type: DATA_TYPES.STRING,
    },
    date: {
      required: true,
      type: DATA_TYPES.DATE,
    },
    status: {
      required: true,
      type: DATA_TYPES.ENUM,
      enum: ['present', 'absent', 'leave', 'half-day'],
    },
    remarks: {
      type: DATA_TYPES.STRING,
      maxLength: 500,
    },
    percentage: {
      type: DATA_TYPES.NUMBER,
      min: 0,
      max: 100,
    },
  },

  transformationRules: {
    studentId: {
      transformations: ['trim', 'uppercase'],
    },
    status: {
      transformations: ['trim', 'lowercase'],
    },
    remarks: {
      transformations: ['trim'],
    },
  },

  normalizationRules: {
    defaults: {
      isActive: true,
    },
  },

  references: {
    studentId: {
      sourceField: 'studentId',
      targetField: 'studentId',
      entityType: 'student',
      lookupField: 'admissionNumber',
      required: true,
    },
  },

  businessRules: {
    checkDuplicates: true,
    duplicateMode: 'update',
    uniqueKeys: ['studentId', 'date'],
    customRules: [
      async (rowData) => {
        const validStatuses = ['present', 'absent', 'leave', 'half-day'];
        if (!validStatuses.includes(rowData.status?.toLowerCase())) {
          return {
            passed: false,
            field: 'status',
            message: `Invalid status: ${rowData.status}. Must be one of: ${validStatuses.join(', ')}`,
          };
        }
        return { passed: true };
      },
    ],
  },

  adapter: async (rowData, schoolId, context) => {
    throw new Error('Adapter not configured. Use AttendanceAdapter.');
  },

  duplicateMode: 'update',
  validationStrictness: VALIDATION_STRICTNESS.STRICT,
  maxRowsPerBatch: 5000,

  errorMessages: {
    INVALID_DATE: 'Invalid date format',
    INVALID_STATUS: 'Invalid attendance status',
    STUDENT_NOT_FOUND: 'Student not found',
    DUPLICATE_RECORD: 'Attendance already recorded for this student on this date',
  },

  sampleData: [
    {
      studentId: 'ADM-2024-00001',
      date: '2024-01-15',
      status: 'present',
      remarks: '',
    },
    {
      studentId: 'ADM-2024-00002',
      date: '2024-01-15',
      status: 'absent',
      remarks: 'Medical leave - submitted by parent',
    },
  ],
};

module.exports = ATTENDANCE_IMPORT_CONFIG;
