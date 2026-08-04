/**
 * Fee Import Configuration
 */

const { DATA_TYPES, VALIDATION_STRICTNESS } = require('../constants/importConstants');

const FEE_IMPORT_CONFIG = {
  entity: 'fee',
  name: 'Fee Structure',
  description: 'Import fee structures and fee amounts for classes',
  version: '1.0',

  requiredFields: ['className', 'feeTypeName', 'amount'],
  optionalFields: [
    'description',
    'dueDate',
    'lateFeePercentage',
    'concessionEligible',
    'concessionPercentage',
    'remarks',
  ],

  columnAliases: {
    className: ['class_name', 'class', 'grade'],
    feeTypeName: ['fee_type', 'fee_name', 'type'],
    dueDate: ['due_date', 'due_month'],
    lateFeePercentage: ['late_fee', 'late_fee_percentage'],
  },

  fieldRules: {
    className: {
      required: true,
      type: DATA_TYPES.STRING,
    },
    feeTypeName: {
      required: true,
      type: DATA_TYPES.STRING,
    },
    amount: {
      required: true,
      type: DATA_TYPES.NUMBER,
      min: 0,
    },
    description: {
      type: DATA_TYPES.STRING,
      maxLength: 500,
    },
    lateFeePercentage: {
      type: DATA_TYPES.NUMBER,
      min: 0,
      max: 100,
    },
    concessionPercentage: {
      type: DATA_TYPES.NUMBER,
      min: 0,
      max: 100,
    },
  },

  transformationRules: {
    className: {
      transformations: ['trim', 'uppercase'],
    },
    feeTypeName: {
      transformations: ['trim', 'capitalize'],
    },
    amount: {
      transformations: ['convertToDecimal'],
    },
    lateFeePercentage: {
      transformations: ['convertToDecimal'],
    },
  },

  normalizationRules: {
    defaults: {
      concessionEligible: false,
      concessionPercentage: 0,
      lateFeePercentage: 0,
      isActive: true,
    },
  },

  references: {
    className: {
      sourceField: 'className',
      targetField: 'classId',
      entityType: 'class',
      lookupField: 'name',
      required: true,
    },
  },

  businessRules: {
    checkDuplicates: true,
    duplicateMode: 'update', // Update if class+feeType combination exists
    uniqueKeys: ['className', 'feeTypeName'],
    customRules: [
      async (rowData) => {
        if (rowData.concessionPercentage > 100) {
          return {
            passed: false,
            field: 'concessionPercentage',
            message: 'Concession percentage cannot exceed 100%',
          };
        }
        return { passed: true };
      },
      async (rowData) => {
        if (rowData.lateFeePercentage && rowData.lateFeePercentage > 50) {
          return {
            passed: false,
            field: 'lateFeePercentage',
            message: 'Late fee percentage seems too high (> 50%)',
            severity: 'warning',
          };
        }
        return { passed: true };
      },
    ],
  },

  adapter: async (rowData, schoolId, context) => {
    throw new Error('Adapter not configured. Use FeeAdapter.');
  },

  duplicateMode: 'update',
  validationStrictness: VALIDATION_STRICTNESS.MODERATE,
  maxRowsPerBatch: 2000,

  errorMessages: {
    INVALID_AMOUNT: 'Fee amount must be a positive number',
    INVALID_CLASS: 'Class not found',
    DUPLICATE_FEE_TYPE: 'Fee type already exists for this class',
  },

  sampleData: [
    {
      className: 'Class 1',
      feeTypeName: 'Tuition Fee',
      amount: 5000,
      description: 'Monthly tuition fee',
      dueDate: '1',
      lateFeePercentage: 5,
      concessionEligible: true,
      concessionPercentage: 10,
    },
    {
      className: 'Class 1',
      feeTypeName: 'Exam Fee',
      amount: 1000,
      description: 'Annual exam fee',
      lateFeePercentage: 0,
      concessionEligible: false,
    },
  ],
};

module.exports = FEE_IMPORT_CONFIG;
