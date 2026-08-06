/**
 * ValidationPipeline - Multi-layer validation system
 * Validates data through 5 sequential layers:
 * 1. File validation (structure, format)
 * 2. Header validation (columns exist)
 * 3. Row validation (types, formats)
 * 4. Business validation (rules, duplicates)
 * 5. Permission validation (auth checks)
 */

const BaseValidator = require('../validators/baseValidator');
const DuplicateChecker = require('../utils/duplicateChecker');
const { SEVERITY, ERROR_TYPES, VALIDATION_STRICTNESS } = require('../constants/importConstants');
const logger = require('../../../src/core/logging/logger.js');

class ValidationPipeline {
  constructor(config = {}) {
    this.config = config;
    this.validators = [];
    this.results = {
      isValid: true,
      errors: [],
      warnings: [],
      skipped: [],
      byLayer: {},
    };
    this.strictness = config.strictness || VALIDATION_STRICTNESS.MODERATE;
  }

  /**
   * Add a validator to the pipeline
   */
  addValidator(name, validator, layer = 'custom') {
    this.validators.push({
      name,
      validator,
      layer,
    });
    return this;
  }

  /**
   * LAYER 1: File Validation
   */
  async validateFile(fileBuffer, fileMetadata) {
    const layer = 'FILE';
    const layerResult = {
      passed: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check file size
      const maxSize = fileMetadata.maxSize || 50 * 1024 * 1024;
      if (fileBuffer.length > maxSize) {
        layerResult.passed = false;
        layerResult.errors.push({
          errorType: ERROR_TYPES.VALIDATION_ERROR,
          message: `File size (${fileBuffer.length} bytes) exceeds limit (${maxSize} bytes)`,
          field: 'file_size',
        });
      }

      // Check file encoding
      try {
        const text = fileBuffer.toString('utf-8');
        if (text.indexOf('\ufffd') !== -1) {
          layerResult.warnings.push({
            errorType: ERROR_TYPES.VALIDATION_ERROR,
            message: 'File contains invalid UTF-8 characters. They will be replaced.',
            severity: SEVERITY.WARNING,
          });
        }
      } catch (e) {
        layerResult.passed = false;
        layerResult.errors.push({
          errorType: ERROR_TYPES.FILE_CORRUPTION_ERROR,
          message: 'Unable to decode file. Check encoding.',
          field: 'encoding',
        });
      }

      // Check for null bytes (binary content)
      if (fileBuffer.indexOf(0) !== -1) {
        layerResult.passed = false;
        layerResult.errors.push({
          errorType: ERROR_TYPES.FILE_CORRUPTION_ERROR,
          message: 'File appears to be binary. Only text-based CSV/XLSX supported.',
          field: 'file_type',
        });
      }
    } catch (error) {
      logger.error('File validation error:', error);
      layerResult.passed = false;
      layerResult.errors.push({
        errorType: ERROR_TYPES.SYSTEM_ERROR,
        message: `File validation failed: ${error.message}`,
      });
    }

    this.results.byLayer[layer] = layerResult;
    if (!layerResult.passed && this.strictness === VALIDATION_STRICTNESS.STRICT) {
      this.results.isValid = false;
    }

    this.results.errors.push(...layerResult.errors);
    this.results.warnings.push(...layerResult.warnings);

    return layerResult;
  }

  /**
   * LAYER 2: Header Validation
   */
  async validateHeaders(headers, requiredFields = [], optionalFields = []) {
    const layer = 'HEADER';
    const layerResult = {
      passed: true,
      errors: [],
      warnings: [],
      details: {},
    };

    try {
      // Check header existence
      if (!headers || headers.length === 0) {
        layerResult.passed = false;
        layerResult.errors.push({
          errorType: ERROR_TYPES.MISSING_REQUIRED_FIELD,
          message: 'No headers found in file',
          field: 'headers',
        });
        this.results.byLayer[layer] = layerResult;
        this.results.errors.push(...layerResult.errors);
        this.results.isValid = false;
        return layerResult;
      }

      // Check for duplicate column names
      const duplicates = headers.filter((item, index) => headers.indexOf(item) !== index);
      if (duplicates.length > 0) {
        layerResult.warnings.push({
          errorType: ERROR_TYPES.VALIDATION_ERROR,
          message: `Duplicate column headers found: ${duplicates.join(', ')}. Using first occurrence.`,
          severity: SEVERITY.WARNING,
        });
      }

      // Check for required fields
      const headerLower = headers.map((h) => h.toLowerCase());
      const missingRequired = requiredFields.filter((field) => !headerLower.includes(field.toLowerCase()));

      if (missingRequired.length > 0) {
        if (this.strictness === VALIDATION_STRICTNESS.STRICT) {
          layerResult.passed = false;
          layerResult.errors.push({
            errorType: ERROR_TYPES.MISSING_REQUIRED_FIELD,
            message: `Missing required columns: ${missingRequired.join(', ')}`,
            field: 'headers',
            missingFields: missingRequired,
          });
          this.results.isValid = false;
        } else {
          layerResult.warnings.push({
            errorType: ERROR_TYPES.MISSING_REQUIRED_FIELD,
            message: `Missing columns (non-strict mode): ${missingRequired.join(', ')}`,
            severity: SEVERITY.WARNING,
            missingFields: missingRequired,
          });
        }
      }

      // Check for completely unknown headers
      const allAllowed = [...requiredFields, ...optionalFields];
      const unknownHeaders = headers.filter(
        (h) => !allAllowed.some((a) => a.toLowerCase() === h.toLowerCase())
      );

      if (unknownHeaders.length > 0) {
        layerResult.warnings.push({
          errorType: ERROR_TYPES.VALIDATION_ERROR,
          message: `Unknown columns found: ${unknownHeaders.join(', ')}. They will be ignored.`,
          severity: SEVERITY.WARNING,
          unknownColumns: unknownHeaders,
        });
      }

      layerResult.details = {
        totalHeaders: headers.length,
        requiredPresent: requiredFields.filter((f) => headerLower.includes(f.toLowerCase())).length,
        requiredTotal: requiredFields.length,
      };
    } catch (error) {
      logger.error('Header validation error:', error);
      layerResult.passed = false;
      layerResult.errors.push({
        errorType: ERROR_TYPES.SYSTEM_ERROR,
        message: `Header validation failed: ${error.message}`,
      });
      this.results.isValid = false;
    }

    this.results.byLayer[layer] = layerResult;
    this.results.errors.push(...layerResult.errors);
    this.results.warnings.push(...layerResult.warnings);

    return layerResult;
  }

  /**
   * LAYER 3: Row Validation (Data types, formats)
   */
  async validateRow(rowData, rowNumber, fieldRules = {}) {
    const layer = 'ROW';
    const layerResult = {
      rowNumber,
      passed: true,
      errors: [],
      warnings: [],
    };

    try {
      for (const [field, rules] of Object.entries(fieldRules)) {
        const value = rowData[field];

        // Required check
        if (rules.required && (value === null || value === undefined || value === '')) {
          layerResult.passed = false;
          layerResult.errors.push({
            errorType: ERROR_TYPES.MISSING_REQUIRED_FIELD,
            message: `${field} is required`,
            field,
            rowNumber,
          });
          continue;
        }

        // Skip further validation if value is empty and not required
        if (!value || value === '') {
          continue;
        }

        // Data type validation
        if (rules.type) {
          const typeCheck = this.validateDataType(value, rules.type);
          if (!typeCheck.valid) {
            layerResult.passed = false;
            layerResult.errors.push({
              errorType: ERROR_TYPES.DATA_FORMAT_ERROR,
              message: `${field} must be ${rules.type}. Got: ${typeCheck.received}`,
              field,
              rowNumber,
              value,
              expectedType: rules.type,
            });
            continue;
          }
        }

        // Pattern validation
        if (rules.pattern) {
          const patternCheck = rules.pattern.test(value);
          if (!patternCheck) {
            layerResult.passed = false;
            layerResult.errors.push({
              errorType: ERROR_TYPES.VALIDATION_ERROR,
              message: `${field} format is invalid. Pattern: ${rules.pattern.toString()}`,
              field,
              rowNumber,
              value,
            });
          }
        }

        // Length validation
        if (rules.minLength || rules.maxLength) {
          const str = String(value);
          if (rules.minLength && str.length < rules.minLength) {
            layerResult.passed = false;
            layerResult.errors.push({
              errorType: ERROR_TYPES.VALIDATION_ERROR,
              message: `${field} is too short (minimum ${rules.minLength} characters)`,
              field,
              rowNumber,
              value,
            });
          }
          if (rules.maxLength && str.length > rules.maxLength) {
            layerResult.passed = false;
            layerResult.errors.push({
              errorType: ERROR_TYPES.VALIDATION_ERROR,
              message: `${field} is too long (maximum ${rules.maxLength} characters)`,
              field,
              rowNumber,
              value,
            });
          }
        }

        // Range validation
        if (rules.min !== undefined || rules.max !== undefined) {
          const num = Number(value);
          if (isNaN(num)) {
            layerResult.passed = false;
            layerResult.errors.push({
              errorType: ERROR_TYPES.DATA_FORMAT_ERROR,
              message: `${field} must be a number`,
              field,
              rowNumber,
              value,
            });
          } else {
            if (rules.min !== undefined && num < rules.min) {
              layerResult.passed = false;
              layerResult.errors.push({
                errorType: ERROR_TYPES.VALIDATION_ERROR,
                message: `${field} must be at least ${rules.min}`,
                field,
                rowNumber,
                value,
              });
            }
            if (rules.max !== undefined && num > rules.max) {
              layerResult.passed = false;
              layerResult.errors.push({
                errorType: ERROR_TYPES.VALIDATION_ERROR,
                message: `${field} must not exceed ${rules.max}`,
                field,
                rowNumber,
                value,
              });
            }
          }
        }

        // Enum validation
        if (rules.enum && Array.isArray(rules.enum)) {
          if (!rules.enum.includes(value)) {
            layerResult.passed = false;
            layerResult.errors.push({
              errorType: ERROR_TYPES.INVALID_ENUM_VALUE,
              message: `${field} must be one of: ${rules.enum.join(', ')}`,
              field,
              rowNumber,
              value,
              allowedValues: rules.enum,
            });
          }
        }

        // Email validation
        if (rules.email) {
          const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailPattern.test(value)) {
            if (rules.emailRequired) {
              layerResult.passed = false;
              layerResult.errors.push({
                errorType: ERROR_TYPES.VALIDATION_ERROR,
                message: `${field} is not a valid email address`,
                field,
                rowNumber,
                value,
              });
            } else {
              layerResult.warnings.push({
                errorType: ERROR_TYPES.VALIDATION_ERROR,
                message: `${field} format appears invalid`,
                field,
                rowNumber,
                value,
                severity: SEVERITY.WARNING,
              });
            }
          }
        }

        // Phone validation
        if (rules.phone) {
          const phonePattern = /^[\d\s\-\+\(\)\.]{10,}$/;
          if (!phonePattern.test(value)) {
            if (rules.phoneRequired) {
              layerResult.passed = false;
              layerResult.errors.push({
                errorType: ERROR_TYPES.VALIDATION_ERROR,
                message: `${field} is not a valid phone number`,
                field,
                rowNumber,
                value,
              });
            } else {
              layerResult.warnings.push({
                errorType: ERROR_TYPES.VALIDATION_ERROR,
                message: `${field} phone format appears invalid`,
                field,
                rowNumber,
                value,
                severity: SEVERITY.WARNING,
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Row validation error for row ${rowNumber}:`, error);
      layerResult.passed = false;
      layerResult.errors.push({
        errorType: ERROR_TYPES.SYSTEM_ERROR,
        message: `Row validation failed: ${error.message}`,
        rowNumber,
      });
    }

    // Store result if there are errors
    if (layerResult.errors.length > 0) {
      if (!this.results.byLayer['ROW']) {
        this.results.byLayer['ROW'] = {
          passed: true,
          errors: [],
          warnings: [],
          rowErrors: [],
        };
      }
      this.results.byLayer['ROW'].rowErrors.push(layerResult);
      this.results.errors.push(...layerResult.errors);

      if (this.strictness === VALIDATION_STRICTNESS.STRICT) {
        this.results.isValid = false;
      }
    }

    if (layerResult.warnings.length > 0) {
      this.results.warnings.push(...layerResult.warnings);
    }

    return layerResult;
  }

  /**
   * LAYER 4: Business Validation (Duplicates, references, rules)
   */
  async validateBusiness(rowData, rowNumber, businessRules = {}, context = {}) {
    const layer = 'BUSINESS';
    const layerResult = {
      rowNumber,
      passed: true,
      errors: [],
      warnings: [],
    };

    try {
      // Duplicate check
      if (businessRules.checkDuplicates) {
        const dupCheck = await DuplicateChecker.check(
          rowData,
          businessRules.uniqueKeys || [],
          businessRules.findExisting,
          businessRules.duplicateMode || 'skip'
        );

        if (dupCheck.isDuplicate) {
          if (businessRules.duplicateMode === 'skip') {
            this.results.skipped.push({
              rowNumber,
              reason: `Duplicate on ${dupCheck.duplicateKeys.join(', ')}`,
            });
            layerResult.action = 'skip';
          } else if (businessRules.duplicateMode === 'update') {
            layerResult.action = 'update';
            layerResult.existingId = dupCheck.existing._id;
          } else if (businessRules.duplicateMode === 'stop') {
            layerResult.passed = false;
            layerResult.errors.push({
              errorType: ERROR_TYPES.DUPLICATE_DETECTED,
              message: `Duplicate found on ${dupCheck.duplicateKeys.join(', ')}`,
              rowNumber,
              duplicateKeys: dupCheck.duplicateKeys,
              duplicateId: dupCheck.existing._id,
            });
            this.results.isValid = false;
          }
        }
      }

      // Reference validation (check if related entities exist)
      if (businessRules.references && context.referenceResolver) {
        for (const [field, refConfig] of Object.entries(businessRules.references)) {
          if (rowData[field]) {
            try {
              const exists = await context.referenceResolver.checkReference(
                field,
                rowData[field],
                refConfig,
                context.schoolId
              );

              if (!exists) {
                layerResult.passed = false;
                layerResult.errors.push({
                  errorType: ERROR_TYPES.REFERENCE_NOT_FOUND,
                  message: `${field} "${rowData[field]}" not found`,
                  field,
                  rowNumber,
                  value: rowData[field],
                });
              }
            } catch (error) {
              logger.warn(`Error checking reference for ${field}:`, error);
            }
          }
        }
      }

      // Custom business rules
      if (businessRules.customRules && Array.isArray(businessRules.customRules)) {
        for (const rule of businessRules.customRules) {
          try {
            const result = await rule(rowData, rowNumber, context);
            if (!result.passed) {
              layerResult.passed = false;
              layerResult.errors.push({
                errorType: ERROR_TYPES.BUSINESS_RULE_VIOLATION,
                message: result.message,
                rowNumber,
                field: result.field,
                rule: rule.name || 'custom_rule',
              });
            }
            if (result.warnings) {
              layerResult.warnings.push(...result.warnings);
            }
          } catch (error) {
            logger.error(`Custom business rule error:`, error);
          }
        }
      }
    } catch (error) {
      logger.error(`Business validation error for row ${rowNumber}:`, error);
      layerResult.passed = false;
      layerResult.errors.push({
        errorType: ERROR_TYPES.SYSTEM_ERROR,
        message: `Business validation failed: ${error.message}`,
        rowNumber,
      });
    }

    if (layerResult.errors.length > 0) {
      if (!this.results.byLayer['BUSINESS']) {
        this.results.byLayer['BUSINESS'] = {
          passed: true,
          errors: [],
          warnings: [],
          rowErrors: [],
        };
      }
      this.results.byLayer['BUSINESS'].rowErrors.push(layerResult);
      this.results.errors.push(...layerResult.errors);
    }

    if (layerResult.warnings.length > 0) {
      this.results.warnings.push(...layerResult.warnings);
    }

    return layerResult;
  }

  /**
   * LAYER 5: Permission Validation
   */
  async validatePermissions(user, schoolId, entity, action = 'import') {
    const layer = 'PERMISSION';
    const layerResult = {
      passed: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if user exists
      if (!user) {
        layerResult.passed = false;
        layerResult.errors.push({
          errorType: ERROR_TYPES.PERMISSION_DENIED,
          message: 'User not authenticated',
        });
        this.results.isValid = false;
        this.results.byLayer[layer] = layerResult;
        this.results.errors.push(...layerResult.errors);
        return layerResult;
      }

      // Check schoolId match
      if (user.schoolId && user.schoolId.toString() !== schoolId.toString()) {
        layerResult.passed = false;
        layerResult.errors.push({
          errorType: ERROR_TYPES.PERMISSION_DENIED,
          message: 'User does not have access to this school',
        });
        this.results.isValid = false;
        this.results.byLayer[layer] = layerResult;
        this.results.errors.push(...layerResult.errors);
        return layerResult;
      }

      // Check role-based permission
      const importPermissions = {
        admin: ['student', 'teacher', 'fee', 'attendance', 'class', 'section', 'subject', 'payroll', 'inventory'],
        superAdmin: ['student', 'teacher', 'fee', 'attendance', 'class', 'section', 'subject', 'payroll', 'inventory'],
        teacher: ['attendance'],
        admission: ['student'],
        accounts: ['fee', 'payroll'],
      };

      const allowedEntities = importPermissions[user.role] || [];

      if (!allowedEntities.includes(entity)) {
        layerResult.passed = false;
        layerResult.errors.push({
          errorType: ERROR_TYPES.PERMISSION_DENIED,
          message: `User role '${user.role}' is not allowed to import '${entity}'`,
          userRole: user.role,
          requestedEntity: entity,
        });
        this.results.isValid = false;
      }

      // Check if user is active
      if (!user.isActive) {
        layerResult.warnings.push({
          errorType: ERROR_TYPES.VALIDATION_ERROR,
          message: 'User account is inactive',
          severity: SEVERITY.WARNING,
        });
      }
    } catch (error) {
      logger.error('Permission validation error:', error);
      layerResult.passed = false;
      layerResult.errors.push({
        errorType: ERROR_TYPES.SYSTEM_ERROR,
        message: `Permission validation failed: ${error.message}`,
      });
      this.results.isValid = false;
    }

    this.results.byLayer[layer] = layerResult;
    this.results.errors.push(...layerResult.errors);
    this.results.warnings.push(...layerResult.warnings);

    return layerResult;
  }

  /**
   * Validate data type
   */
  validateDataType(value, expectedType) {
    const valueStr = String(value).trim();

    switch (expectedType) {
      case 'string':
        return { valid: typeof value === 'string' || value !== null, received: typeof value };

      case 'number':
      case 'integer':
      case 'decimal':
        const num = Number(valueStr);
        return { valid: !isNaN(num), received: isNaN(num) ? 'non-numeric' : 'number' };

      case 'boolean':
        const lowerVal = valueStr.toLowerCase();
        return {
          valid: ['yes', 'no', 'true', 'false', '1', '0', 'y', 'n'].includes(lowerVal),
          received: typeof value,
        };

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return { valid: emailPattern.test(valueStr), received: 'email' };

      case 'phone':
        const phonePattern = /^[\d\s\-\+\(\)\.]{10,}$/;
        return { valid: phonePattern.test(valueStr), received: 'phone' };

      case 'date':
        const datePattern = /^\d{1,4}[-\/]\d{1,2}[-\/]\d{2,4}/;
        return { valid: datePattern.test(valueStr), received: 'date' };

      case 'objectId':
        return { valid: /^[a-f\d]{24}$/i.test(valueStr), received: 'id' };

      default:
        return { valid: true, received: typeof value };
    }
  }

  /**
   * Get validation results
   */
  getResults() {
    return {
      ...this.results,
      summary: {
        isValid: this.results.isValid,
        totalErrors: this.results.errors.length,
        totalWarnings: this.results.warnings.length,
        totalSkipped: this.results.skipped.length,
        errorsByType: this.groupErrorsByType(),
        layersChecked: Object.keys(this.results.byLayer),
      },
    };
  }

  /**
   * Group errors by type
   */
  groupErrorsByType() {
    return this.results.errors.reduce((acc, error) => {
      const type = error.errorType || 'UNKNOWN';
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {});
  }

  /**
   * Clear results (for reuse)
   */
  reset() {
    this.results = {
      isValid: true,
      errors: [],
      warnings: [],
      skipped: [],
      byLayer: {},
    };
    return this;
  }

  /**
   * Should continue import based on errors and strictness
   */
  shouldContinue() {
    if (this.strictness === VALIDATION_STRICTNESS.STRICT) {
      return this.results.isValid;
    }

    if (this.strictness === VALIDATION_STRICTNESS.MODERATE) {
      // Continue if only warnings
      return this.results.errors.length === 0;
    }

    // LENIENT - always continue
    return true;
  }
}

module.exports = ValidationPipeline;
