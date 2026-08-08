/**
 * ImportService - High-level business logic for imports
 * Handles preview, validation, queuing, and monitoring of imports
 * Main service used by controllers and API endpoints
 */

const ImportLog = require('../models/ImportLog');
const ImportError = require('../models/ImportError');
const ImportProfile = require('../models/ImportProfile');
const CSVParser = require('../utils/csvParser');
const XLSXParser = require('../utils/xlsxParser');
const ColumnMapper = require('../utils/columnMapper');
const logger = require('../../../core/logging/logger.js');

class ImportService {
  constructor(config = {}, dependencies = {}) {
    this.config = config;
    this.queue = dependencies.queue; // Bull queue (optional)
    this.entityConfigs = dependencies.entityConfigs || {};
    this.services = dependencies.services || {};
  }

  // Parse file (CSV or XLSX)
  async parseFile(fileBuffer, fileMetadata) {
    const mimeType = (fileMetadata.mimeType || '').toLowerCase();
    const filename = (fileMetadata.filename || '').toLowerCase();
    const isXlsx =
      mimeType.includes('spreadsheet') ||
      mimeType.includes('vnd.ms-excel') ||
      mimeType === 'application/octet-stream' ||
      filename.endsWith('.xlsx') ||
      filename.endsWith('.xls');

    if (isXlsx) {
      return await XLSXParser.parse(fileBuffer, { maxRows: 100000 });
    }
    return await CSVParser.parse(fileBuffer, { maxRows: 100000 });
  }

  // Validate file (basic checks only)
  async validateFile(fileBuffer, fileMetadata, entityType) {
    const result = { valid: true, errors: [] };
    const mimeType = (fileMetadata.mimeType || '').toLowerCase();
    const maxSize = mimeType.includes('csv') ? 50 * 1024 * 1024 : 100 * 1024 * 1024;
    if (fileBuffer.length > maxSize) {
      result.valid = false;
      result.errors.push(`File size exceeds maximum of ${maxSize / (1024 * 1024)}MB`);
    }
    const entity = this.getEntityConfig(entityType);
    if (!entity) {
      result.valid = false;
      result.errors.push(`Unknown entity type: ${entityType}`);
    }
    return result;
  }

  /**
   * Preview import before processing.
   * Shows sample data, column mapping, validation results.
   */
  async previewImport(fileBuffer, fileMetadata, entityType, userContext) {
    try {
      logger.info(`Previewing ${entityType} import...`);
      const parsed = await this.parseFile(fileBuffer, fileMetadata);
      const entityConfig = this.getEntityConfig(entityType);
      const mapping = ColumnMapper.mapHeaders(parsed.headers, entityConfig, {
        allowFuzzyMatch: true,
      });

      const sampleData = [];
      for (let i = 0; i < Math.min(5, parsed.rows.length); i++) {
        const row = parsed.rows[i].data;
        const mapped = ColumnMapper.applyMapping(row, mapping.mapped);
        sampleData.push({ rowNumber: parsed.rows[i].rowNumber, original: row, mapped });
      }

      return {
        success: true,
        preview: {
          totalRows: parsed.totalRows,
          headers: parsed.headers,
          columnMapping: mapping,
          sampleData,
          warnings: mapping.warnings,
        },
      };
    } catch (error) {
      logger.error('Preview error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start import.
   * - If a Bull queue is available → enqueue job, return importLogId for polling.
   * - Otherwise → process synchronously, update ImportLog, return full results.
   */
  async startImport(fileBuffer, fileMetadata, entityType, options = {}, userContext) {
    try {
      logger.info(`Starting ${entityType} import for school ${userContext.schoolId}`);

      // Basic validation
      const fileValidation = await this.validateFile(fileBuffer, fileMetadata, entityType);
      if (!fileValidation.valid) {
        return { success: false, errors: fileValidation.errors };
      }

      // Create a single ImportLog
      const importLog = await ImportLog.create({
        schoolId: userContext.schoolId,
        uploadedBy: userContext.userId,
        entity: entityType,
        fileName: fileMetadata.filename,
        fileSize: fileBuffer.length,
        fileMimeType: fileMetadata.mimeType,
        duplicateMode: options.duplicateMode || 'skip',
        validationStrictness: options.strictness || 'moderate',
        status: 'pending',
        startedAt: new Date(),
      });

      // Async via queue
      if (this.queue) {
        const job = await this.queue.add(
          'import_data',
          {
            importLogId: importLog._id.toString(),
            schoolId: userContext.schoolId.toString(),
            userId: userContext.userId.toString(),
            entity: entityType,
            fileBuffer: fileBuffer.toString('base64'),
            fileMetadata,
            options,
          },
          {
            jobId: importLog._id.toString(),
            priority: options.priority || 3,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            timeout: 600000,
          }
        );
        logger.info(`Import job queued: ${job.id}`);
        return {
          success: true,
          importLogId: importLog._id,
          jobId: job.id,
          message: 'Import queued for processing',
          async: true,
        };
      }

      // Synchronous fallback
      logger.warn('No queue available — processing import synchronously');
      const startTime = Date.now();

      // Mark as processing
      importLog.status = 'processing';
      importLog.jobId = 'sync_' + Date.now();
      await importLog.save();

      // Parse file
      let parsed;
      try {
        parsed = await this.parseFile(fileBuffer, fileMetadata);
      } catch (parseErr) {
        importLog.status = 'failed';
        importLog.completedAt = new Date();
        await importLog.save();
        return { success: false, importLogId: importLog._id, error: parseErr.message };
      }

      // Get entity config (already validated above)
      const entityConfig = this.getEntityConfig(entityType);

      // Map columns
      const mapping = ColumnMapper.mapHeaders(parsed.headers, entityConfig, {
        allowFuzzyMatch: true,
      });

      // Build context (referenceResolver not available in sync path — adapters do their own lookups)
      const context = {
        userId: userContext.userId,
        schoolId: userContext.schoolId,
        user: userContext.user,
        importLogId: importLog._id,
        // Provide a minimal ReferenceResolver stub so StudentAdapter.create() still works
        referenceResolver: this._buildInlineReferenceResolver(),
      };

      // Pre-fetch session name if user selected a sessionId from the UI
      // (StudentAdapter resolves by name, not by ID)
      let injectedSessionName = null;
      if (options.sessionId && entityType === 'student') {
        try {
          const { AcademicSession } = require('../../academics');
          const sessionDoc = await AcademicSession.findById(options.sessionId).lean();
          injectedSessionName = sessionDoc?.name || null;
        } catch (_) {}
      }

      // Process each row
      let successCount = 0;
      let failureCount = 0;
      let skippedCount = 0;
      let processedRows = 0;

      for (const rowObj of parsed.rows) {
        const rawData = rowObj.data || rowObj;
        const rowNumber = rowObj.rowNumber || processedRows + 1;
        let mapped;

        try {
          // Apply column mapping
          mapped = ColumnMapper.applyMapping(rawData, mapping.mapped);

          // Inject session name from UI selection if not already in file
          if (injectedSessionName && !mapped.sessionName && !mapped.session) {
            mapped.session = injectedSessionName;
          }
          // Also inject raw sessionId for reference
          if (options.sessionId && !mapped.sessionId) {
            mapped.sessionId = options.sessionId;
          }

          // Call entity adapter
          let result;
          if (entityConfig.adapter && typeof entityConfig.adapter === 'function') {
            result = await entityConfig.adapter(mapped, userContext.schoolId, context);
          } else {
            result = { success: false, errors: ['No adapter registered for entity'] };
          }

          if (result.success) {
            successCount++;
          } else if (result.skipped) {
            skippedCount++;
            await this._storeError(
              importLog._id,
              userContext.schoolId,
              entityType,
              rowNumber,
              rawData,
              'skipped',
              result.errors?.[0] || 'Skipped'
            );
          } else {
            failureCount++;
            await this._storeError(
              importLog._id,
              userContext.schoolId,
              entityType,
              rowNumber,
              rawData,
              'adapter_error',
              result.errors?.[0] || 'Failed'
            );
          }
        } catch (rowErr) {
          failureCount++;
          logger.warn(`[ImportService] Row ${rowNumber} error:`, rowErr.message);
          await this._storeError(
            importLog._id,
            userContext.schoolId,
            entityType,
            rowNumber,
            rawData || {},
            'system_error',
            rowErr.message
          );
        }

        processedRows++;
      }

      // Determine final status
      const finalStatus =
        failureCount === 0 && skippedCount === 0
          ? 'completed'
          : failureCount === 0
            ? 'completed'
            : successCount > 0
              ? 'partial'
              : 'failed';

      const duration = Date.now() - startTime;

      // Update ImportLog with final results
      importLog.status = finalStatus;
      importLog.completedAt = new Date();
      importLog.totalRows = parsed.rows.length;
      importLog.processedRows = processedRows;
      importLog.successCount = successCount;
      importLog.failureCount = failureCount;
      importLog.skippedCount = skippedCount;
      importLog.duration = duration;
      importLog.metrics = {
        avgProcessingTimePerRow: processedRows > 0 ? duration / processedRows : 0,
        rowsPerSecond: (processedRows / (duration / 1000)).toFixed(2),
        errorRate: processedRows > 0 ? ((failureCount / processedRows) * 100).toFixed(2) : '0.00',
      };
      await importLog.save();

      logger.info('[ImportService] Sync import complete', {
        entity: entityType,
        successCount,
        failureCount,
        skippedCount,
        duration,
      });

      // Return complete result so the frontend can jump straight to DONE
      return {
        success: true,
        importLogId: importLog._id,
        async: false,
        status: finalStatus,
        totalRows: parsed.rows.length,
        successCount,
        failureCount,
        skippedCount,
        duration,
      };
    } catch (error) {
      logger.error('startImport error:', error);
      return { success: false, error: error.message };
    }
  }

  // Store a single row error
  // Maps our internal type strings to valid ImportError.errorType enum values
  async _storeError(importLogId, schoolId, entity, rowNumber, rowData, errorType, errorMessage) {
    // Map to valid schema enum values
    const validTypeMap = {
      skipped: 'duplicate_detected', // skipped = duplicate or skip policy
      adapter_error: 'business_rule_violation',
      system_error: 'system_error',
      validation: 'validation_error',
      reference: 'reference_not_found',
    };
    const safeType = validTypeMap[errorType] || 'system_error';
    try {
      await ImportError.create({
        importLogId,
        schoolId,
        entity,
        rowNumber,
        rowData: String(JSON.stringify(rowData)).slice(0, 2000),
        errorType: safeType,
        errorMessage: String(errorMessage || 'Unknown error').slice(0, 500),
        severity: errorType === 'skipped' ? 'warning' : 'error',
      });
    } catch (_) {
      /* best-effort — never block the import */
    }
  }

  // Inline ReferenceResolver for StudentAdapter calls
  _buildInlineReferenceResolver() {
    const { AcademicSession } = require('../../academics');
    const { ClassModel } = require('../../academics');
    const { SectionModel } = require('../../academics');
    const cache = {};

    return {
      resolveSessionByName: async (name, schoolId) => {
        const key = `s:${schoolId}:${name}`;
        if (cache[key] !== undefined) return cache[key];
        const doc = await AcademicSession.findOne({ name: name?.trim(), schoolId }).lean();
        cache[key] = doc;
        return doc;
      },
      resolveClassByName: async (name, sessionId, schoolId) => {
        const key = `c:${schoolId}:${sessionId}:${name}`;
        if (cache[key] !== undefined) return cache[key];
        const doc = await ClassModel.findOne({
          name: name?.trim(),
          session: sessionId,
          schoolId,
        }).lean();
        cache[key] = doc;
        return doc;
      },
      resolveSectionByName: async (name, classId, sessionId, schoolId) => {
        const key = `sec:${schoolId}:${sessionId}:${classId}:${name}`;
        if (cache[key] !== undefined) return cache[key];
        const doc = await SectionModel.findOne({
          name: name?.trim(),
          classId,
          session: sessionId,
          schoolId,
        }).lean();
        cache[key] = doc;
        return doc;
      },
    };
  }

  /**
   * Execute import (called by queue worker when queue IS available)
   */
  async executeImport(importLogId, fileBuffer, fileMetadata, entityType, options, userContext) {
    try {
      if (typeof fileBuffer === 'string') fileBuffer = Buffer.from(fileBuffer, 'base64');
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) throw new Error(`Import log not found: ${importLogId}`);

      // Reuse startImport sync logic but skip log creation — just process
      // (queue worker path; importLog already exists and is 'processing')
      const startTime = Date.now();
      const entityConfig = this.getEntityConfig(entityType);
      const parsed = await this.parseFile(fileBuffer, fileMetadata);
      const mapping = ColumnMapper.mapHeaders(parsed.headers, entityConfig, {
        allowFuzzyMatch: true,
      });
      const context = {
        userId: userContext.userId,
        schoolId: userContext.schoolId,
        user: userContext.user,
        importLogId: importLog._id,
        referenceResolver: this._buildInlineReferenceResolver(),
      };

      let successCount = 0,
        failureCount = 0,
        skippedCount = 0,
        processedRows = 0;

      for (const rowObj of parsed.rows) {
        const rawData = rowObj.data || rowObj;
        const rowNumber = rowObj.rowNumber || processedRows + 1;
        try {
          const mapped = ColumnMapper.applyMapping(rawData, mapping.mapped);
          if (options.sessionId && !mapped.sessionId && !mapped.session)
            mapped.sessionId = options.sessionId;

          const result = entityConfig.adapter
            ? await entityConfig.adapter(mapped, userContext.schoolId, context)
            : { success: false, errors: ['No adapter'] };

          if (result.success) {
            successCount++;
          } else if (result.skipped) {
            skippedCount++;
            await this._storeError(
              importLog._id,
              userContext.schoolId,
              entityType,
              rowNumber,
              rawData,
              'skipped',
              result.errors?.[0] || 'Skipped'
            );
          } else {
            failureCount++;
            await this._storeError(
              importLog._id,
              userContext.schoolId,
              entityType,
              rowNumber,
              rawData,
              'adapter_error',
              result.errors?.[0] || 'Failed'
            );
          }
        } catch (e) {
          failureCount++;
          await this._storeError(
            importLog._id,
            userContext.schoolId,
            entityType,
            rowNumber,
            rawData,
            'system_error',
            e.message
          );
        }
        processedRows++;
      }

      const finalStatus =
        failureCount === 0 ? 'completed' : successCount > 0 ? 'partial' : 'failed';
      const duration = Date.now() - startTime;
      importLog.status = finalStatus;
      importLog.completedAt = new Date();
      importLog.totalRows = parsed.rows.length;
      importLog.processedRows = processedRows;
      importLog.successCount = successCount;
      importLog.failureCount = failureCount;
      importLog.skippedCount = skippedCount;
      importLog.duration = duration;
      await importLog.save();

      return {
        success: true,
        importLogId: importLog._id,
        summary: { successCount, failureCount, skippedCount },
      };
    } catch (error) {
      logger.error(`Import execution error for ${importLogId}:`, error);
      throw error;
    }
  }

  /**
   * Get import status
   */
  async getImportStatus(importLogId) {
    try {
      const importLog = await ImportLog.findById(importLogId);
      if (!importLog) return { success: false, error: 'Import not found' };

      const errorCount = await ImportError.countDocuments({ importLogId });

      return {
        success: true,
        status: importLog.status,
        entity: importLog.entity,
        totalRows: importLog.totalRows || 0,
        processedRows: importLog.processedRows || 0,
        successCount: importLog.successCount || 0,
        failureCount: importLog.failureCount || 0,
        skippedCount: importLog.skippedCount || 0,
        errorCount,
        duration: importLog.duration,
        metrics: importLog.metrics,
        createdAt: importLog.createdAt,
        completedAt: importLog.completedAt,
      };
    } catch (error) {
      logger.error('getImportStatus error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get import errors
   */
  async getImportErrors(importLogId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const [errors, total] = await Promise.all([
        ImportError.find({ importLogId }, null, { skip, limit, sort: { rowNumber: 1 } }),
        ImportError.countDocuments({ importLogId }),
      ]);
      return {
        success: true,
        errors,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('getImportErrors error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download error report
   */
  async downloadErrorReport(importLogId, format = 'csv') {
    try {
      const errors = await ImportError.find({ importLogId });
      if (format === 'xlsx') {
        const xlsxBuffer = XLSXParser.generateErrorXLSX(errors);
        return {
          success: true,
          data: xlsxBuffer,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `import_errors_${importLogId}.xlsx`,
        };
      }
      // Default: CSV
      const rows = errors.map(
        (e) =>
          `${e.rowNumber || ''},${e.errorType || ''},${JSON.stringify(e.errorMessage || '')},"${JSON.stringify(e.rowData || '').replace(/"/g, '""')}"`
      );
      const csv = ['Row,Type,Message,Data', ...rows].join('\n');
      return {
        success: true,
        data: csv,
        mimeType: 'text/csv',
        filename: `import_errors_${importLogId}.csv`,
      };
    } catch (error) {
      logger.error('downloadErrorReport error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save import profile (template)
   */
  async saveImportProfile(schoolId, profileData) {
    try {
      const profile = await ImportProfile.create({
        schoolId,
        createdBy: profileData.createdBy,
        name: profileData.name,
        description: profileData.description,
        entity: profileData.entity,
        columnMapping: profileData.columnMapping,
        transformations: profileData.transformations,
        settings: profileData.settings,
        validationRules: profileData.validationRules,
      });
      return { success: true, profileId: profile._id, profile };
    } catch (error) {
      logger.error('saveImportProfile error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get import profiles
   */
  async getImportProfiles(schoolId, entity) {
    try {
      const profiles = await ImportProfile.getActiveProfiles(schoolId, entity);
      return { success: true, profiles };
    } catch (error) {
      logger.error('getImportProfiles error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get import history
   */
  async getImportHistory(schoolId, entity, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const imports = await ImportLog.find(
        { schoolId, entity, createdAt: { $gte: startDate }, isDeleted: false },
        null,
        { sort: { createdAt: -1 }, limit: 100 }
      );
      const stats = await ImportLog.getImportStats(schoolId, days);
      return {
        success: true,
        imports: imports.map((imp) => imp.getFormattedResults?.() || imp),
        stats,
      };
    } catch (error) {
      logger.error('getImportHistory error:', error);
      return { success: false, error: error.message };
    }
  }

  /** Get entity configuration */
  getEntityConfig(entityType) {
    return this.entityConfigs[entityType];
  }

  /** Register entity config */
  registerEntityConfig(entityType, config) {
    this.entityConfigs[entityType] = config;
    logger.info(`Registered entity config for: ${entityType}`);
  }
}

module.exports = ImportService;
