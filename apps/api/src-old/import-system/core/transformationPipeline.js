/**
 * TransformationPipeline - Applies field-level transformations
 * Normalizes data from import format to internal format
 * E.g., uppercase names, split full names, convert phone formats, parse boolean strings
 */

const DateNormalizer = require('../utils/dateNormalizer');
const PhoneNormalizer = require('../utils/phoneNormalizer');
const logger = require('../../../src/core/logging/logger.js');

class TransformationPipeline {
  constructor(config = {}) {
    this.config = config;
    this.transformations = {};
    this.results = {
      transformed: {},
      changes: [],
      errors: [],
    };
  }

  /**
   * Apply transformations to row data
   */
  async transformRow(rowData, transformationRules = {}) {
    this.results = {
      transformed: { ...rowData },
      changes: [],
      errors: [],
    };

    try {
      for (const [field, rules] of Object.entries(transformationRules)) {
        if (!rowData.hasOwnProperty(field) || rowData[field] === null || rowData[field] === undefined) {
          continue;
        }

        let value = rowData[field];
        const originalValue = value;

        // Apply transformations in sequence
        if (Array.isArray(rules.transformations)) {
          for (const transformation of rules.transformations) {
            try {
              const result = await this.applyTransformation(value, transformation);
              if (result.value !== value) {
                this.results.changes.push({
                  field,
                  before: value,
                  after: result.value,
                  transformation,
                });
              }
              value = result.value;
            } catch (error) {
              logger.warn(`Transformation ${transformation} failed for ${field}:`, error);
              this.results.errors.push({
                field,
                transformation,
                originalValue,
                error: error.message,
              });

              // Continue with untransformed value
              value = originalValue;
            }
          }
        }

        // Apply single transformation if specified
        if (rules.transformation && typeof rules.transformation === 'string') {
          try {
            const result = await this.applyTransformation(value, rules.transformation);
            if (result.value !== value) {
              this.results.changes.push({
                field,
                before: value,
                after: result.value,
                transformation: rules.transformation,
              });
            }
            value = result.value;
          } catch (error) {
            logger.warn(`Transformation ${rules.transformation} failed for ${field}:`, error);
            this.results.errors.push({
              field,
              transformation: rules.transformation,
              originalValue,
              error: error.message,
            });
          }
        }

        // Apply custom function if provided
        if (rules.customFunction && typeof rules.customFunction === 'function') {
          try {
            const result = await rules.customFunction(value, rowData);
            if (result !== value) {
              this.results.changes.push({
                field,
                before: value,
                after: result,
                transformation: 'custom_function',
              });
            }
            value = result;
          } catch (error) {
            logger.warn(`Custom function failed for ${field}:`, error);
            this.results.errors.push({
              field,
              transformation: 'custom_function',
              originalValue,
              error: error.message,
            });
          }
        }

        // Set transformed value
        this.results.transformed[field] = value;
      }
    } catch (error) {
      logger.error('Transformation pipeline error:', error);
      throw error;
    }

    return this.results;
  }

  /**
   * Apply individual transformation
   */
  async applyTransformation(value, transformation) {
    if (value === null || value === undefined) {
      return { value };
    }

    const str = String(value);

    switch (transformation) {
      case 'trim':
        return { value: str.trim() };

      case 'uppercase':
        return { value: str.toUpperCase() };

      case 'lowercase':
        return { value: str.toLowerCase() };

      case 'capitalize':
        return { value: str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() };

      case 'normalizePhone':
        try {
          const normalized = PhoneNormalizer.normalize(value);
          return { value: normalized };
        } catch (error) {
          logger.warn(`Phone normalization failed for ${value}:`, error);
          return { value };
        }

      case 'normalizeEmail':
        return { value: str.trim().toLowerCase() };

      case 'convertDateFormat':
        try {
          const normalized = DateNormalizer.normalize(value);
          return { value: normalized };
        } catch (error) {
          logger.warn(`Date normalization failed for ${value}:`, error);
          return { value };
        }

      case 'parseBoolean':
        return {
          value: ['yes', 'y', 'true', '1'].includes(str.toLowerCase()),
        };

      case 'convertToInteger':
        const intVal = parseInt(str);
        return { value: isNaN(intVal) ? value : intVal };

      case 'convertToDecimal':
        const decVal = parseFloat(str);
        return { value: isNaN(decVal) ? value : decVal };

      case 'splitName':
        // Split "FirstName LastName" into separate fields
        const parts = str.trim().split(/\s+/);
        return {
          value: {
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || '',
          },
        };

      case 'concatenateFields':
        // This requires additional context, handled separately
        return { value };

      case 'removeSpaces':
        return { value: str.replace(/\s/g, '') };

      case 'removeSpecialChars':
        return { value: str.replace(/[^a-zA-Z0-9]/g, '') };

      case 'removeLeadingZeros':
        return { value: String(parseInt(str) || str) };

      case 'removeCountryCode':
        if (str.startsWith('+91')) {
          return { value: str.substring(3) };
        }
        if (str.startsWith('0')) {
          return { value: str.substring(1) };
        }
        return { value };

      case 'nullIfEmpty':
        return { value: str.trim() === '' ? null : value };

      case 'nullIfZero':
        return { value: value === 0 || str === '0' ? null : value };

      case 'slugify':
        return {
          value: str
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        };

      default:
        return { value };
    }
  }

  /**
   * Split full name into first and last name
   */
  splitFullName(fullName) {
    const parts = String(fullName).trim().split(/\s+/);
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
    };
  }

  /**
   * Concatenate multiple fields
   */
  concatenateFields(rowData, sourceFields, separator = ' ') {
    return sourceFields
      .map((field) => String(rowData[field] || '').trim())
      .filter((val) => val)
      .join(separator);
  }

  /**
   * Map enum values (e.g., M -> Male)
   */
  mapEnumValue(value, mappings) {
    return mappings[value] || value;
  }

  /**
   * Add a custom transformation
   */
  addTransformation(name, fn) {
    this.transformations[name] = fn;
    return this;
  }

  /**
   * Get transformation summary
   */
  getSummary() {
    return {
      totalChanges: this.results.changes.length,
      changesByField: this.groupChangesByField(),
      errors: this.results.errors.length,
      failedFields: this.getFailedFields(),
    };
  }

  /**
   * Group changes by field
   */
  groupChangesByField() {
    return this.results.changes.reduce((acc, change) => {
      if (!acc[change.field]) {
        acc[change.field] = [];
      }
      acc[change.field].push({
        before: change.before,
        after: change.after,
      });
      return acc;
    }, {});
  }

  /**
   * Get fields with transformation errors
   */
  getFailedFields() {
    return [...new Set(this.results.errors.map((e) => e.field))];
  }

  /**
   * Reset pipeline
   */
  reset() {
    this.results = {
      transformed: {},
      changes: [],
      errors: [],
    };
    return this;
  }
}

module.exports = TransformationPipeline;
