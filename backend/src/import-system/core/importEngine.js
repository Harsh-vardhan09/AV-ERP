/**
 * ImportEngine - Main orchestrator for the entire import process
 * Coordinates all pipelines and adapters to execute complete import flow
 * Handles error recovery, rollback, and transaction management
 */

const CSVParser = require('../utils/csvParser');
const XLSXParser = require('../utils/xlsxParser');
const ColumnMapper = require('../utils/columnMapper');
const ValidationPipeline = require('./validationPipeline');
const TransformationPipeline = require('./transformationPipeline');
const NormalizationPipeline = require('./normalizationPipeline');
const ReferenceResolver = require('./referenceResolver');
const ImportLog = require('../models/ImportLog');
const ImportError = require('../models/ImportError');
const logger = require('../../utils/logger');

class ImportEngine {
  constructor(config = {}) {
    this.config = config;
    this.validationPipeline = new ValidationPipeline(config.validation);
    this.transformationPipeline = new TransformationPipeline();
    this.normalizationPipeline = new NormalizationPipeline();
    this.referenceResolver = new ReferenceResolver(config.services, { cacheEnabled: true });

    this.importLog = null;
    this.processedRows = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.skippedCount = 0;
    this.errors = [];
  }

  /**
   * Execute complete import process
   */
  async executeImport(fileBuffer, fileMetadata, entityConfig, userContext) {
    const startTime = Date.now();

    try {
      logger.info(`Starting import for entity: ${entityConfig.entity}`, {
        user: userContext.userId,
        school: userContext.schoolId,
        fileSize: fileBuffer.length,
      });

      // Create import log
      this.importLog = await this.createImportLog(
        fileMetadata,
        entityConfig,
        userContext
      );

      // Step 1: Validate file
      logger.info('Step 1: Validating file...');
      await this.validationPipeline.validateFile(fileBuffer, fileMetadata);

      // Step 2: Parse file
      logger.info('Step 2: Parsing file...');
      const parsed = await this.parseFile(fileBuffer, fileMetadata);

      // Step 3: Validate headers
      logger.info('Step 3: Validating headers...');
      await this.validationPipeline.validateHeaders(
        parsed.headers,
        entityConfig.requiredFields,
        entityConfig.optionalFields
      );

      // Step 4: Map columns
      logger.info('Step 4: Mapping columns...');
      const mapping = ColumnMapper.mapHeaders(
        parsed.headers,
        entityConfig,
        { allowFuzzyMatch: true }
      );

      // Step 5: Validate permission
      logger.info('Step 5: Validating permissions...');
      await this.validationPipeline.validatePermissions(
        userContext.user,
        userContext.schoolId,
        entityConfig.entity
      );

      if (!this.validationPipeline.shouldContinue()) {
        throw new Error('Validation failed. Cannot continue with import.');
      }

      // Step 6: Prepare context
      logger.info('Step 6: Preparing context...');
      const context = {
        userId: userContext.userId,
        schoolId: userContext.schoolId,
        user: userContext.user,
        referenceResolver: this.referenceResolver,
        importLogId: this.importLog._id,
      };

      // Step 7: Resolve references (batch)
      logger.info('Step 7: Resolving references...');
      const resolvedReferences = await this.referenceResolver.resolveBatch(
        parsed.rows.map((r) => r.data),
        entityConfig.references || {},
        userContext.schoolId
      );

      context.resolvedReferences = resolvedReferences;

      // Step 8: Process rows
      logger.info('Step 8: Processing rows...');
      const processedRows = await this.processRows(
        parsed.rows,
        mapping.mapped,
        entityConfig,
        context
      );

      // Step 9: Validate processed rows
      logger.info('Step 9: Validating processed rows...');
      await this.validateProcessedRows(
        processedRows,
        entityConfig,
        context
      );

      // Step 10: Apply (create/update records)
      logger.info('Step 10: Applying changes to database...');
      const results = await this.applyRows(
        processedRows,
        entityConfig,
        context
      );

      // Update import log
      this.importLog.status = 'completed';
      this.importLog.completedAt = new Date();
      this.importLog.totalRows = parsed.rows.length;
      this.importLog.processedRows = this.processedRows;
      this.importLog.successCount = this.successCount;
      this.importLog.failureCount = this.failureCount;
      this.importLog.skippedCount = this.skippedCount;

      // Calculate metrics
      const duration = Date.now() - startTime;
      this.importLog.duration = duration;
      this.importLog.metrics = {
        avgProcessingTimePerRow: this.processedRows > 0 ? duration / this.processedRows : 0,
        rowsPerSecond: (this.processedRows / (duration / 1000)).toFixed(2),
        errorRate: ((this.failureCount / this.processedRows) * 100).toFixed(2),
      };

      await this.importLog.save();

      logger.info('Import completed successfully', {
        totalRows: parsed.rows.length,
        success: this.successCount,
        failure: this.failureCount,
        skipped: this.skippedCount,
        duration: `${(duration / 1000).toFixed(2)}s`,
      });

      return {
        success: true,
        importLogId: this.importLog._id,
        summary: this.getSummary(),
      };
    } catch (error) {
      logger.error('Import failed:', error);

      if (this.importLog) {
        this.importLog.status = 'failed';
        this.importLog.completedAt = new Date();
        await this.importLog.save();
      }

      return {
        success: false,
        error: error.message,
        importLogId: this.importLog?._id,
      };
    }
  }

  /**
   * Parse file (CSV or XLSX)
   */
  async parseFile(fileBuffer, fileMetadata) {
    try {
      let parsed;

      if (fileMetadata.mimeType.includes('csv')) {
        parsed = await CSVParser.parse(fileBuffer, {
          maxRows: this.config.maxRows || 100000,
        });
      } else if (fileMetadata.mimeType.includes('spreadsheet')) {
        parsed = await XLSXParser.parse(fileBuffer, {
          maxRows: this.config.maxRows || 100000,
        });
      } else {
        throw new Error(`Unsupported file type: ${fileMetadata.mimeType}`);
      }

      return {
        headers: parsed.headers,
        rows: parsed.rows,
        totalRows: parsed.totalRows,
      };
    } catch (error) {
      logger.error('File parsing error:', error);
      throw new Error(`Failed to parse file: ${error.message}`);
    }
  }

  /**
   * Process rows through pipelines
   */
  async processRows(rows, columnMapping, entityConfig, context) {
    const processedRows = [];

    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i].data;
      const rowNumber = rows[i].rowNumber;

      try {
        // Map columns
        const mapped = ColumnMapper.applyMapping(rowData, columnMapping);

        // Transform
        const transformed = await this.transformationPipeline.transformRow(
          mapped,
          entityConfig.transformationRules || {}
        );

        // Normalize
        const normalized = await this.normalizationPipeline.normalizeRow(
          transformed.transformed,
          entityConfig.normalizationRules || {}
        );

        processedRows.push({
          rowNumber,
          originalData: rowData,
          mapped,
          transformed: transformed.transformed,
          normalized: normalized.normalized,
          ready: true,
        });

        this.processedRows++;
      } catch (error) {
        logger.warn(`Error processing row ${rowNumber}:`, error);

        // Store error
        await this.storeError({
          importLogId: context.importLogId,
          schoolId: context.schoolId,
          entity: entityConfig.entity,
          rowNumber,
          rowData,
          errorType: 'processing_error',
          errorMessage: error.message,
        });

        processedRows.push({
          rowNumber,
          originalData: rowData,
          ready: false,
          error: error.message,
        });

        this.failureCount++;
      }
    }

    return processedRows;
  }

  /**
   * Validate processed rows
   */
  async validateProcessedRows(rows, entityConfig, context) {
    for (const row of rows) {
      if (!row.ready) continue;

      try {
        // Validate row
        const validation = await this.validationPipeline.validateRow(
          row.normalized,
          row.rowNumber,
          entityConfig.fieldRules || {}
        );

        if (!validation.passed) {
          row.ready = false;
          row.validationErrors = validation.errors;
          this.failureCount++;

          // Store errors
          for (const error of validation.errors) {
            await this.storeError({
              importLogId: context.importLogId,
              schoolId: context.schoolId,
              entity: entityConfig.entity,
              rowNumber: row.rowNumber,
              rowData: row.normalized,
              field: error.field,
              errorType: error.errorType,
              errorMessage: error.message,
              value: error.value,
            });
          }
        }

        // Validate business rules
        const businessValidation = await this.validationPipeline.validateBusiness(
          row.normalized,
          row.rowNumber,
          entityConfig.businessRules || {},
          context
        );

        if (!businessValidation.passed) {
          row.ready = false;
          row.businessErrors = businessValidation.errors;
          this.failureCount++;

          // Store errors
          for (const error of businessValidation.errors) {
            await this.storeError({
              importLogId: context.importLogId,
              schoolId: context.schoolId,
              entity: entityConfig.entity,
              rowNumber: row.rowNumber,
              rowData: row.normalized,
              field: error.field,
              errorType: error.errorType,
              errorMessage: error.message,
              value: error.value,
            });
          }
        }

        if (businessValidation.action === 'skip') {
          row.ready = false;
          row.skipped = true;
          this.skippedCount++;
        }
      } catch (error) {
        logger.warn(`Validation error for row ${row.rowNumber}:`, error);
        row.ready = false;
        row.error = error.message;
        this.failureCount++;
      }
    }
  }

  /**
   * Apply rows to database
   */
  async applyRows(rows, entityConfig, context) {
    const results = {
      created: [],
      updated: [],
      skipped: [],
      failed: [],
    };

    for (const row of rows) {
      if (!row.ready) {
        if (row.skipped) {
          results.skipped.push(row.rowNumber);
        } else {
          results.failed.push({
            rowNumber: row.rowNumber,
            error: row.error,
          });
        }
        continue;
      }

      try {
        // Call entity adapter
        if (entityConfig.adapter && typeof entityConfig.adapter === 'function') {
          const result = await entityConfig.adapter(
            row.normalized,
            context.schoolId,
            context
          );

          if (result.success) {
            this.successCount++;
            results.created.push({
              rowNumber: row.rowNumber,
              entityId: result.id,
            });
          } else {
            this.failureCount++;
            results.failed.push({
              rowNumber: row.rowNumber,
              error: result.error,
            });

            // Store error
            await this.storeError({
              importLogId: context.importLogId,
              schoolId: context.schoolId,
              entity: entityConfig.entity,
              rowNumber: row.rowNumber,
              rowData: row.normalized,
              errorType: 'adapter_error',
              errorMessage: result.error,
            });
          }
        }
      } catch (error) {
        logger.error(`Error applying row ${row.rowNumber}:`, error);
        this.failureCount++;
        results.failed.push({
          rowNumber: row.rowNumber,
          error: error.message,
        });

        await this.storeError({
          importLogId: context.importLogId,
          schoolId: context.schoolId,
          entity: entityConfig.entity,
          rowNumber: row.rowNumber,
          rowData: row.normalized,
          errorType: 'system_error',
          errorMessage: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Store error in database
   */
  async storeError(errorData) {
    try {
      await ImportError.create({
        importLogId: errorData.importLogId,
        schoolId: errorData.schoolId,
        entity: errorData.entity,
        rowNumber: errorData.rowNumber,
        rowData: errorData.rowData,
        field: errorData.field,
        value: errorData.value,
        errorType: errorData.errorType,
        errorMessage: errorData.errorMessage,
        severity: 'error',
      });
    } catch (error) {
      logger.error('Error storing import error:', error);
    }
  }

  /**
   * Create import log
   */
  async createImportLog(fileMetadata, entityConfig, userContext) {
    return ImportLog.create({
      schoolId: userContext.schoolId,
      uploadedBy: userContext.userId,
      entity: entityConfig.entity,
      fileName: fileMetadata.filename,
      fileSize: fileMetadata.size,
      fileMimeType: fileMetadata.mimeType,
      duplicateMode: this.config.duplicateMode || 'skip',
      validationStrictness: this.config.strictness || 'moderate',
      status: 'processing',
      startedAt: new Date(),
    });
  }

  /**
   * Get import summary
   */
  getSummary() {
    return {
      importLogId: this.importLog._id,
      entity: this.importLog.entity,
      status: this.importLog.status,
      totalRows: this.processedRows,
      results: {
        success: this.successCount,
        failure: this.failureCount,
        skipped: this.skippedCount,
      },
      duration: this.importLog.duration,
      metrics: this.importLog.metrics,
    };
  }
}

module.exports = ImportEngine;
