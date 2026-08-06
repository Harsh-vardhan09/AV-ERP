/**
 * BaseAdapter - Abstract base class for entity-specific import adapters
 * Handles transformation, validation, and creation of entities
 * Each entity (Student, Teacher, etc.) extends this class
 */

const logger = require('../../../src/core/logging/logger.js'); // Assuming logger exists

class BaseAdapter {
  constructor(config = {}, services = {}) {
    this.config = config;
    this.services = services;
    this.entity = config.entity || 'unknown';
    this.transformationPipeline = [];
    this.validationPipeline = [];
    this.preProcessHooks = [];
    this.postProcessHooks = [];
  }

  /**
   * Main import method - processes a single row
   */
  async importRow(rowData, schoolId, context = {}) {
    try {
      // Pre-process hooks
      let processedData = await this.executeHooks(this.preProcessHooks, rowData, context);

      // Transform data
      processedData = await this.transform(processedData);

      // Validate data
      await this.validate(processedData, context);

      // Check for duplicates if configured
      if (this.config.duplicateDetection) {
        await this.checkDuplicates(processedData, schoolId);
      }

      // Create/update entity
      const result = await this.create(processedData, schoolId, context);

      // Post-process hooks
      await this.executeHooks(this.postProcessHooks, result, context);

      return {
        success: true,
        data: result,
        warnings: [],
      };
    } catch (error) {
      logger.error(`Import failed for ${this.entity}:`, error);
      return {
        success: false,
        error: error.message,
        errors: error.errors || [],
      };
    }
  }

  /**
   * Transform row data according to pipeline
   */
  async transform(rowData) {
    let transformed = { ...rowData };

    for (const transformer of this.transformationPipeline) {
      transformed = await transformer(transformed);
    }

    return transformed;
  }

  /**
   * Validate transformed data
   */
  async validate(data, context = {}) {
    for (const validator of this.validationPipeline) {
      await validator(data, context);
    }
  }

  /**
   * Check for duplicates
   */
  async checkDuplicates(data, schoolId) {
    const uniqueKeys = this.config.uniqueKeys || [];
    const duplicateMode = this.config.duplicateMode || 'skip';

    for (const key of uniqueKeys) {
      if (data[key]) {
        const query = { [key]: data[key], schoolId };
        const existing = await this.findExisting(query);

        if (existing) {
          const error = new Error(`Duplicate ${key}: ${data[key]}`);
          error.code = 'DUPLICATE_DETECTED';
          error.duplicateMode = duplicateMode;
          error.existingId = existing._id;
          throw error;
        }
      }
    }
  }

  /**
   * Find existing record (must be implemented by subclass)
   */
  async findExisting(query) {
    throw new Error('findExisting() must be implemented by subclass');
  }

  /**
   * Create entity (must be implemented by subclass)
   */
  async create(data, schoolId, context = {}) {
    throw new Error('create() must be implemented by subclass');
  }

  /**
   * Add a transformation function to the pipeline
   */
  addTransformation(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Transformation must be a function');
    }
    this.transformationPipeline.push(fn);
    return this;
  }

  /**
   * Add a validation function to the pipeline
   */
  addValidator(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Validator must be a function');
    }
    this.validationPipeline.push(fn);
    return this;
  }

  /**
   * Add pre-process hook
   */
  addPreProcessHook(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Hook must be a function');
    }
    this.preProcessHooks.push(fn);
    return this;
  }

  /**
   * Add post-process hook
   */
  addPostProcessHook(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Hook must be a function');
    }
    this.postProcessHooks.push(fn);
    return this;
  }

  /**
   * Execute hooks in sequence
   */
  async executeHooks(hooks, data, context) {
    let result = data;
    for (const hook of hooks) {
      result = await hook(result, context);
    }
    return result;
  }

  /**
   * Map column names to field names
   */
  mapColumnToField(columnName) {
    const mapping = this.config.columnMapping || {};
    return mapping[columnName] || columnName;
  }

  /**
   * Get required fields for this entity
   */
  getRequiredFields() {
    return this.config.requiredFields || [];
  }

  /**
   * Get optional fields for this entity
   */
  getOptionalFields() {
    return this.config.optionalFields || [];
  }

  /**
   * Validate row data structure
   */
  validateRowStructure(rowData) {
    const required = this.getRequiredFields();
    const missing = required.filter((field) => !rowData[field]);

    if (missing.length > 0) {
      const error = new Error(`Missing required fields: ${missing.join(', ')}`);
      error.code = 'MISSING_REQUIRED_FIELDS';
      error.missingFields = missing;
      throw error;
    }
  }

  /**
   * Get field validation rules
   */
  getFieldValidationRules(field) {
    const rules = this.config.validationRules || {};
    return rules[field] || [];
  }

  /**
   * Apply default values to row
   */
  applyDefaults(rowData) {
    const defaults = this.config.defaults || {};
    return {
      ...defaults,
      ...rowData,
    };
  }

  /**
   * Filter out unmapped columns
   */
  filterUnmappedColumns(rowData) {
    if (!this.config.strictColumnMapping) {
      return rowData;
    }

    const allowedColumns = [
      ...this.getRequiredFields(),
      ...this.getOptionalFields(),
    ];

    return Object.keys(rowData)
      .filter((key) => allowedColumns.includes(key))
      .reduce((obj, key) => {
        obj[key] = rowData[key];
        return obj;
      }, {});
  }

  /**
   * Normalize row data (trim strings, etc.)
   */
  normalizeData(rowData) {
    const normalized = {};

    for (const [key, value] of Object.entries(rowData)) {
      if (typeof value === 'string') {
        normalized[key] = value.trim();
      } else if (value === 'NULL' || value === 'null' || value === '') {
        normalized[key] = null;
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Get adapter summary (for debugging)
   */
  getSummary() {
    return {
      entity: this.entity,
      transformations: this.transformationPipeline.length,
      validators: this.validationPipeline.length,
      preHooks: this.preProcessHooks.length,
      postHooks: this.postProcessHooks.length,
      requiredFields: this.getRequiredFields(),
      optionalFields: this.getOptionalFields(),
    };
  }
}

module.exports = BaseAdapter;
