/**
 * BaseValidator - Abstract base class for all validators
 * Provides common validation methods and structure
 * Validators follow the Pipeline pattern for composability
 */

const { ERROR_TYPES, SEVERITY, VALIDATION_RULES } = require('../constants/importConstants');

class BaseValidator {
  constructor(config = {}) {
    this.config = config;
    this.errors = [];
    this.warnings = [];
    this.validationRules = config.validationRules || [];
  }

  /**
   * Main validation method - implemented by subclasses
   */
  async validate(data) {
    throw new Error('validate() must be implemented by subclass');
  }

  /**
   * Add an error to the error list
   */
  addError(errorType, message, metadata = {}) {
    this.errors.push({
      type: errorType,
      severity: SEVERITY.ERROR,
      message,
      timestamp: new Date(),
      ...metadata,
    });
    return this;
  }

  /**
   * Add a warning to the warning list
   */
  addWarning(message, metadata = {}) {
    this.warnings.push({
      severity: SEVERITY.WARNING,
      message,
      timestamp: new Date(),
      ...metadata,
    });
    return this;
  }

  /**
   * Check if value is required but missing
   */
  validateRequired(value, fieldName) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      this.addError(ERROR_TYPES.MISSING_REQUIRED_FIELD, `${fieldName} is required`, {
        field: fieldName,
        value,
      });
      return false;
    }
    return true;
  }

  /**
   * Check if value matches pattern
   */
  validatePattern(value, pattern, fieldName, errorMessage) {
    if (value && !pattern.test(value)) {
      this.addError(ERROR_TYPES.VALIDATION_ERROR, errorMessage || `${fieldName} format is invalid`, {
        field: fieldName,
        value,
        pattern: pattern.toString(),
      });
      return false;
    }
    return true;
  }

  /**
   * Check if value is in enum
   */
  validateEnum(value, enumValues, fieldName) {
    if (value && !enumValues.includes(value)) {
      this.addError(ERROR_TYPES.INVALID_ENUM_VALUE, `${fieldName} must be one of: ${enumValues.join(', ')}`, {
        field: fieldName,
        value,
        allowedValues: enumValues,
      });
      return false;
    }
    return true;
  }

  /**
   * Check string length
   */
  validateLength(value, minLength, maxLength, fieldName) {
    if (value && (value.length < minLength || value.length > maxLength)) {
      this.addError(
        ERROR_TYPES.VALIDATION_ERROR,
        `${fieldName} must be between ${minLength} and ${maxLength} characters`,
        {
          field: fieldName,
          value,
          minLength,
          maxLength,
        }
      );
      return false;
    }
    return true;
  }

  /**
   * Check numeric range
   */
  validateRange(value, minValue, maxValue, fieldName) {
    if (value !== null && value !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < minValue || numValue > maxValue) {
        this.addError(
          ERROR_TYPES.VALIDATION_ERROR,
          `${fieldName} must be between ${minValue} and ${maxValue}`,
          {
            field: fieldName,
            value,
            minValue,
            maxValue,
          }
        );
        return false;
      }
    }
    return true;
  }

  /**
   * Validate email format
   */
  validateEmail(value, fieldName = 'email') {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailPattern.test(value)) {
      this.addError(ERROR_TYPES.VALIDATION_ERROR, `${fieldName} is not a valid email address`, {
        field: fieldName,
        value,
      });
      return false;
    }
    return true;
  }

  /**
   * Validate phone format (basic)
   */
  validatePhone(value, fieldName = 'phone') {
    const phonePattern = /^\+?[\d\s\-\(\)]{10,}$/;
    if (value && !phonePattern.test(value)) {
      this.addWarning(`${fieldName} format may be invalid`, {
        field: fieldName,
        value,
      });
    }
    return true;
  }

  /**
   * Check for formula injection
   */
  validateFormulaInjection(value, fieldName) {
    if (typeof value === 'string' && value.length > 0) {
      const injectionChars = ['=', '@', '+', '-'];
      const firstChar = value.charAt(0);

      if (injectionChars.includes(firstChar)) {
        this.addError(ERROR_TYPES.FORMULA_INJECTION_DETECTED, `${fieldName} appears to contain a formula`, {
          field: fieldName,
          value,
          injectionChar: firstChar,
        });
        return false;
      }
    }
    return true;
  }

  /**
   * Check for malicious patterns
   */
  validateMaliciousPayload(value, fieldName) {
    if (typeof value === 'string') {
      const dangerousPatterns = [/javascript:/i, /<script/i, /onclick/i, /onerror/i, /eval\(/i, /exec\(/i];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          this.addError(
            ERROR_TYPES.MALICIOUS_PAYLOAD_DETECTED,
            `${fieldName} contains potentially malicious content`,
            {
              field: fieldName,
              value: value.substring(0, 100), // Truncate for security
              pattern: pattern.toString(),
            }
          );
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get validation summary
   */
  getSummary() {
    return {
      isValid: this.errors.length === 0,
      errorCount: this.errors.length,
      warningCount: this.warnings.length,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Clear errors and warnings
   */
  reset() {
    this.errors = [];
    this.warnings = [];
    return this;
  }

  /**
   * Throw if errors exist
   */
  throwIfErrors() {
    if (this.errors.length > 0) {
      const error = new Error('Validation failed');
      error.errors = this.errors;
      error.warnings = this.warnings;
      throw error;
    }
  }
}

module.exports = BaseValidator;
