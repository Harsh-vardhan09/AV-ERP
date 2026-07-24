/**
 * ImportController — Handles all /api/v1/import/* endpoints
 *
 * Key fixes:
 *  - Uses req.schoolId (set by varifyToken) instead of req.user.schoolId
 *  - Registers both StudentAdapter + TeacherAdapter
 *  - No external services dependency — adapters use real models directly
 *  - previewImport returns flat structure matching frontend expectations
 */

const ImportService    = require('../services/importService');
const STUDENT_CONFIG   = require('../configs/studentImportConfig');
const TEACHER_CONFIG   = require('../configs/teacherImportConfig');
const StudentAdapter   = require('../adapters/studentAdapter');
const TeacherAdapter   = require('../adapters/teacherAdapter');
const XLSXParser       = require('../utils/xlsxParser');
const CSVParser        = require('../utils/csvParser');
const ColumnMapper     = require('../utils/columnMapper');
const logger           = require('../../utils/logger');

class ImportController {
  constructor(dependencies = {}) {
    // ImportService — no external services needed (adapters use models directly)
    this.importService = new ImportService(dependencies.config || {}, {
      queue:         dependencies.queue,  // null when Redis not configured → sync fallback
      entityConfigs: {},
      services:      {},                  // empty — adapters are self-contained
    });

    this._registerAdapters();
  }

  /**
   * Register all entity adapters.
   * Each adapter is self-contained and uses real Mongoose models.
   */
  _registerAdapters() {
    // ── Student adapter ────────────────────────────────────────────────────
    const studentAdapter = new StudentAdapter(STUDENT_CONFIG, {});
    this.importService.registerEntityConfig('student', {
      ...STUDENT_CONFIG,
      adapter: async (rowData, schoolId, context) =>
        await studentAdapter.create(rowData, { schoolId, ...context }),
    });

    // ── Teacher adapter ────────────────────────────────────────────────────
    const teacherAdapter = new TeacherAdapter(TEACHER_CONFIG, {});
    this.importService.registerEntityConfig('teacher', {
      ...TEACHER_CONFIG,
      adapter: async (rowData, schoolId, context) =>
        await teacherAdapter.create(rowData, { schoolId, ...context }),
    });
  }

  // ── HELPER: build userContext from request ──────────────────────────────
  _buildContext(req) {
    return {
      userId:   req.user._id,
      schoolId: req.schoolId,    // ← set by varifyToken middleware (JWT)
      user:     req.user,
    };
  }

  // ── HELPER: parse file buffer based on mimetype / extension ────────────
  async _parseBuffer(buffer, mimetype, originalname) {
    const isXlsx =
      mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mimetype === 'application/vnd.ms-excel' ||
      mimetype === 'application/octet-stream' ||
      (originalname && (originalname.toLowerCase().endsWith('.xlsx') ||
                        originalname.toLowerCase().endsWith('.xls')));

    if (isXlsx) {
      return await XLSXParser.parse(buffer, { maxRows: 100000 });
    } else {
      return await CSVParser.parse(buffer, { maxRows: 100000 });
    }
  }

  // ── ENDPOINT: Preview import ─────────────────────────────────────────────
  async previewImport(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const entity = req.query.entity || req.body.entity;
      if (!entity) {
        return res.status(400).json({ success: false, message: 'entity is required (student|teacher)' });
      }

      // ── Parse the uploaded file ────────────────────────────────────────
      let parsed;
      try {
        parsed = await this._parseBuffer(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
      } catch (parseError) {
        logger.error('[ImportController] File parse error:', parseError);
        return res.status(400).json({
          success: false,
          message: `Could not parse file: ${parseError.message}`,
        });
      }

      // ── Get entity config for column mapping ───────────────────────────
      const entityConfig = this.importService.getEntityConfig(entity);
      if (!entityConfig) {
        return res.status(400).json({
          success: false,
          message: `Unknown entity type: ${entity}. Use 'student' or 'teacher'.`,
        });
      }

      // ── Map Excel columns → internal field names ───────────────────────
      const mapping = ColumnMapper.mapHeaders(parsed.headers, entityConfig, {
        allowFuzzyMatch: true,
      });

      // ── Build sample rows (up to 5) using mapped field names ───────────
      const sampleRows = parsed.rows.slice(0, 5).map((r) => {
        const raw = r.data || r;
        return ColumnMapper.applyMapping(raw, mapping.mapped);
      });

      // ── Count valid vs invalid rows ────────────────────────────────────
      // A row is "valid" if all required fields are present after mapping.
      // Special case: if fullName is mapped, treat it as satisfying firstName + lastName.
      const requiredFields = entityConfig.requiredFields || [];

      // Build effective required set — if fullName present, relax firstName/lastName
      const mappedInternalFields = new Set(Object.values(mapping.mapped));
      const hasFullName = mappedInternalFields.has('fullName');
      const effectiveRequired = requiredFields.filter((f) => {
        if (hasFullName && (f === 'firstName' || f === 'lastName')) return false;
        return true;
      });

      let validRows   = 0;
      let invalidRows = 0;

      for (const r of parsed.rows) {
        const raw    = r.data || r;
        const mapped = ColumnMapper.applyMapping(raw, mapping.mapped);

        // If fullName is present in this row, it covers firstName + lastName
        const rowEffectiveRequired = mapped.fullName
          ? effectiveRequired
          : requiredFields;

        const hasAllRequired = rowEffectiveRequired.every(
          (f) => mapped[f] !== undefined && mapped[f] !== null && String(mapped[f]).trim() !== ''
        );
        if (hasAllRequired) {
          validRows++;
        } else {
          invalidRows++;
        }
      }

      // ── Return flat structure matching frontend StatCards ──────────────
      return res.json({
        success:         true,
        totalRows:       parsed.totalRows,
        validRows,
        invalidRows,
        columnsFound:    parsed.headers.length,
        columnMapping:   mapping.mapped,      // {excelCol: internalField}
        unmappedColumns: mapping.unmapped,
        warnings:        mapping.warnings,
        sampleRows,                           // first 5 mapped rows
        headers:         parsed.headers,      // raw headers from file
      });
    } catch (error) {
      logger.error('[ImportController] previewImport error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── ENDPOINT: Start import ───────────────────────────────────────────────
  async startImport(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const entity = req.body.entity;
      if (!entity) {
        return res.status(400).json({ success: false, message: 'entity is required (student|teacher)' });
      }

      const options = {
        duplicateMode:  req.body.duplicateMode  || 'skip',
        strictness:     req.body.strictness     || 'moderate',
        autoAssignFees: req.body.autoAssignFees !== 'false',
        sessionId:      req.body.sessionId      || undefined,
        priority:       Number(req.body.priority) || 3,
      };

      const result = await this.importService.startImport(
        req.file.buffer,
        { filename: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype },
        entity,
        options,
        this._buildContext(req)
      );

      return res.json(result);
    } catch (error) {
      logger.error('[ImportController] startImport error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── ENDPOINT: Get import status ──────────────────────────────────────────
  async getImportStatus(req, res) {
    try {
      const result = await this.importService.getImportStatus(req.params.importLogId);
      return result.success
        ? res.json(result)
        : res.status(404).json(result);
    } catch (error) {
      logger.error('[ImportController] getImportStatus error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── ENDPOINT: Get paginated errors ───────────────────────────────────────
  async getImportErrors(req, res) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await this.importService.getImportErrors(
        req.params.importLogId, page, limit
      );
      return result.success
        ? res.json(result)
        : res.status(404).json(result);
    } catch (error) {
      logger.error('[ImportController] getImportErrors error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── ENDPOINT: Download error report ─────────────────────────────────────
  async downloadErrorReport(req, res) {
    try {
      const format = req.query.format || 'csv';
      const result = await this.importService.downloadErrorReport(
        req.params.importLogId, format
      );
      if (!result.success) return res.status(404).json(result);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.data);
    } catch (error) {
      logger.error('[ImportController] downloadErrorReport error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── ENDPOINT: Import history ─────────────────────────────────────────────
  async getImportHistory(req, res) {
    try {
      const { entity } = req.params;
      const days = parseInt(req.query.days) || 30;
      const result = await this.importService.getImportHistory(req.schoolId, entity, days);
      return res.json(result);
    } catch (error) {
      logger.error('[ImportController] getImportHistory error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── ENDPOINT: Get saved import profiles ─────────────────────────────────
  async getImportProfiles(req, res) {
    try {
      const result = await this.importService.getImportProfiles(req.schoolId, req.params.entity);
      return res.json(result);
    } catch (error) {
      logger.error('[ImportController] getImportProfiles error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── ENDPOINT: Save import profile ───────────────────────────────────────
  async saveImportProfile(req, res) {
    try {
      const result = await this.importService.saveImportProfile(req.schoolId, {
        ...req.body,
        createdBy: req.user._id,
      });
      return res.json(result);
    } catch (error) {
      logger.error('[ImportController] saveImportProfile error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = ImportController;
