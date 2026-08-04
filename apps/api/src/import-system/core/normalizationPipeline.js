/**
 * NormalizationPipeline - Applies row-level normalization
 * Applies defaults, format standardization, and data cleanup
 * Converts data to internal system format ready for database insertion
 */

const logger = require('../../utils/logger');

class NormalizationPipeline {
  constructor(config = {}) {
    this.config = config;
    this.results = {
      normalized: {},
      applied: [],
      skipped: [],
    };
  }

  /**
   * Normalize entire row
   */
  async normalizeRow(rowData, normalizationRules = {}) {
    this.results = {
      normalized: { ...rowData },
      applied: [],
      skipped: [],
    };

    try {
      // Apply defaults
      if (normalizationRules.defaults) {
        this.applyDefaults(this.results.normalized, normalizationRules.defaults);
      }

      // Remove null/undefined fields
      if (normalizationRules.removeEmpty !== false) {
        this.removeEmptyFields(this.results.normalized);
      }

      // Apply field formatting
      if (normalizationRules.fields) {
        for (const [field, fieldRules] of Object.entries(normalizationRules.fields)) {
          if (this.results.normalized.hasOwnProperty(field)) {
            await this.normalizeField(field, this.results.normalized, fieldRules);
          }
        }
      }

      // Generate computed fields
      if (normalizationRules.computed) {
        this.applyComputedFields(this.results.normalized, normalizationRules.computed);
      }

      // Rename fields (mapping internal names)
      if (normalizationRules.rename) {
        this.renameFields(this.results.normalized, normalizationRules.rename);
      }

      // Apply filters (remove certain fields)
      if (normalizationRules.filterFields) {
        this.filterFields(this.results.normalized, normalizationRules.filterFields);
      }

      // Validate final structure
      if (normalizationRules.structureValidation) {
        this.validateStructure(this.results.normalized, normalizationRules.structureValidation);
      }
    } catch (error) {
      logger.error('Normalization pipeline error:', error);
      throw error;
    }

    return this.results;
  }

  /**
   * Apply default values
   */
  applyDefaults(rowData, defaults) {
    for (const [field, defaultValue] of Object.entries(defaults)) {
      if (!rowData.hasOwnProperty(field) || rowData[field] === null || rowData[field] === undefined) {
        rowData[field] = typeof defaultValue === 'function' ? defaultValue(rowData) : defaultValue;
        this.results.applied.push({
          type: 'default',
          field,
          value: rowData[field],
        });
      }
    }
  }

  /**
   * Remove empty fields
   */
  removeEmptyFields(rowData, keepFields = []) {
    const fieldsToRemove = [];

    for (const [field, value] of Object.entries(rowData)) {
      // Skip protected fields
      if (keepFields.includes(field)) {
        continue;
      }

      // Remove null, undefined, empty strings, 'NULL', 'null'
      if (
        value === null ||
        value === undefined ||
        value === '' ||
        value === 'NULL' ||
        value === 'null'
      ) {
        fieldsToRemove.push(field);
      }
    }

    for (const field of fieldsToRemove) {
      delete rowData[field];
      this.results.applied.push({
        type: 'removed_empty',
        field,
      });
    }
  }

  /**
   * Normalize individual field
   */
  async normalizeField(field, rowData, fieldRules) {
    let value = rowData[field];

    // Skip if null or not required
    if (value === null || value === undefined) {
      return;
    }

    // Apply type conversion
    if (fieldRules.type) {
      const converted = this.convertType(value, fieldRules.type);
      if (converted !== value) {
        rowData[field] = converted;
        this.results.applied.push({
          type: 'type_conversion',
          field,
          before: value,
          after: converted,
          targetType: fieldRules.type,
        });
      }
    }

    // Apply set (restricted values)
    if (fieldRules.set && Array.isArray(fieldRules.set)) {
      const strValue = String(value).toLowerCase();
      const mapped = fieldRules.set.find(
        (item) => item.aliases && item.aliases.some((alias) => alias.toLowerCase() === strValue)
      );

      if (mapped) {
        rowData[field] = mapped.value;
        this.results.applied.push({
          type: 'enum_mapping',
          field,
          before: value,
          after: mapped.value,
        });
      }
    }

    // Apply value mapping
    if (fieldRules.valueMap && typeof fieldRules.valueMap === 'object') {
      const strValue = String(value).toLowerCase();
      if (fieldRules.valueMap[strValue]) {
        rowData[field] = fieldRules.valueMap[strValue];
        this.results.applied.push({
          type: 'value_mapping',
          field,
          before: value,
          after: fieldRules.valueMap[strValue],
        });
      }
    }

    // Ensure minimum/maximum
    if (fieldRules.min !== undefined && Number(value) < fieldRules.min) {
      rowData[field] = fieldRules.min;
      this.results.applied.push({
        type: 'min_enforcement',
        field,
        before: value,
        after: fieldRules.min,
      });
    }

    if (fieldRules.max !== undefined && Number(value) > fieldRules.max) {
      rowData[field] = fieldRules.max;
      this.results.applied.push({
        type: 'max_enforcement',
        field,
        before: value,
        after: fieldRules.max,
      });
    }
  }

  /**
   * Convert value to specified type
   */
  convertType(value, targetType) {
    if (value === null || value === undefined) {
      return value;
    }

    switch (targetType) {
      case 'string':
        return String(value).trim();

      case 'number':
      case 'integer':
        const num = Number(value);
        return isNaN(num) ? value : num;

      case 'float':
      case 'decimal':
        const float = parseFloat(value);
        return isNaN(float) ? value : float;

      case 'boolean':
        const str = String(value).toLowerCase().trim();
        return ['yes', 'y', 'true', '1', 'on'].includes(str);

      case 'date':
        if (value instanceof Date) {
          return value;
        }
        const date = new Date(value);
        return isNaN(date.getTime()) ? value : date;

      case 'array':
        if (Array.isArray(value)) {
          return value;
        }
        return [value];

      case 'object':
        if (typeof value === 'object') {
          return value;
        }
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }

      default:
        return value;
    }
  }

  /**
   * Apply computed fields
   */
  applyComputedFields(rowData, computedFields) {
    for (const [field, computeFn] of Object.entries(computedFields)) {
      if (typeof computeFn === 'function') {
        try {
          rowData[field] = computeFn(rowData);
          this.results.applied.push({
            type: 'computed_field',
            field,
            value: rowData[field],
          });
        } catch (error) {
          logger.warn(`Error computing field ${field}:`, error);
        }
      }
    }
  }

  /**
   * Rename fields
   */
  renameFields(rowData, renameMap) {
    for (const [oldName, newName] of Object.entries(renameMap)) {
      if (rowData.hasOwnProperty(oldName)) {
        rowData[newName] = rowData[oldName];
        delete rowData[oldName];
        this.results.applied.push({
          type: 'field_rename',
          oldName,
          newName,
        });
      }
    }
  }

  /**
   * Filter fields (keep only specified fields)
   */
  filterFields(rowData, keepFields) {
    const fieldsToRemove = Object.keys(rowData).filter((field) => !keepFields.includes(field));

    for (const field of fieldsToRemove) {
      delete rowData[field];
      this.results.skipped.push({
        type: 'filtered_field',
        field,
      });
    }
  }

  /**
   * Validate final structure
   */
  validateStructure(rowData, structureRules) {
    if (structureRules.requiredFields && Array.isArray(structureRules.requiredFields)) {
      const missingFields = structureRules.requiredFields.filter(
        (field) => !rowData.hasOwnProperty(field) || rowData[field] === null || rowData[field] === undefined
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields after normalization: ${missingFields.join(', ')}`);
      }
    }

    if (structureRules.allowedFields && Array.isArray(structureRules.allowedFields)) {
      const unexpectedFields = Object.keys(rowData).filter(
        (field) => !structureRules.allowedFields.includes(field)
      );

      if (unexpectedFields.length > 0) {
        logger.warn(`Unexpected fields found: ${unexpectedFields.join(', ')}`);
      }
    }
  }

  /**
   * Create nested object from flat data
   */
  createNestedObject(rowData, nestingRules) {
    const result = { ...rowData };

    for (const [parentPath, childFields] of Object.entries(nestingRules)) {
      const nested = {};

      for (const childField of childFields) {
        if (result.hasOwnProperty(childField)) {
          nested[childField] = result[childField];
          delete result[childField];
        }
      }

      if (Object.keys(nested).length > 0) {
        result[parentPath] = nested;
      }
    }

    return result;
  }

  /**
   * Flatten nested object
   */
  flattenObject(obj, prefix = '') {
    const result = {};

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(result, this.flattenObject(value, fullKey));
      } else {
        result[fullKey] = value;
      }
    }

    return result;
  }

  /**
   * Get normalization summary
   */
  getSummary() {
    return {
      totalApplied: this.results.applied.length,
      appliedByType: this.groupAppliedByType(),
      skipped: this.results.skipped.length,
    };
  }

  /**
   * Group applied changes by type
   */
  groupAppliedByType() {
    return this.results.applied.reduce((acc, change) => {
      const type = change.type;
      if (!acc[type]) {
        acc[type] = 0;
      }
      acc[type]++;
      return acc;
    }, {});
  }

  /**
   * Reset pipeline
   */
  reset() {
    this.results = {
      normalized: {},
      applied: [],
      skipped: [],
    };
    return this;
  }
}

module.exports = NormalizationPipeline;
