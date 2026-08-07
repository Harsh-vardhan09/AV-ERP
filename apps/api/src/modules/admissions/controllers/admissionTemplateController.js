/**
 * Admission Template Controller
 *
 * Manages the full lifecycle of admission form HTML/CSS templates:
 *   - CRUD (create, read, update, delete / soft-delete)
 *   - Field extraction from uploaded HTML
 *   - Live preview (HTML) against sample or real student data
 *   - PDF generation & download for a specific student
 *   - Set-default logic (one default per school)
 *   - Clone
 *
 * Architecture: mirrors reportTemplateController.js but operates on the
 * AdmissionTemplate model and AdmissionDataService — no coupling to report cards.
 */

const path   = require('path');
const uuidv4 = async () => {
  const { v4 } = await import('uuid');
  return v4();
};


const AdmissionTemplate      = require('../models/AdmissionTemplate');
const AdmissionFormSettings  = require('../models/AdmissionFormSettings');
const TemplateFieldExtractor = require('../../reportcards').TemplateFieldExtractor;
const TemplateParserService  = require('../../reportcards').TemplateParserService;
const AdmissionDataService   = require('../services/admissionDataService');
const PDFService             = require('../../../core/pdf/htmlToPdf.js');
const logger                 = require('../../../core/logging/logger.js');
const { serviceError } = require('../lib/respond');

const OUTPUT_DIR = path.join(__dirname, '../../output/admission-forms');

/**
 * POST /api/v1/admission-templates
 * Body: { name, description?, htmlContent, cssContent?, config?, templateStatus? }
 */
exports.createTemplate = async (req, res) => {
  try {
    const {
      name,
      description = '',
      htmlContent,
      cssContent  = '',
      config,
      templateStatus = 'published',
    } = req.body;

    if (!name || !htmlContent) {
      return res.status(400).json({ success: false, message: 'name and htmlContent are required' });
    }

    const schoolId = req.schoolId;
    const userId   = req.user._id;

    // Auto-extract fields
    let extractedFields = [];
    let fieldAnalysis   = {};
    try {
      extractedFields = TemplateFieldExtractor.extractFields(htmlContent) || [];

      // Validate extracted field names against admission registry
      const AdmissionFieldRegistry = require('../services/admissionFieldRegistry');
      const fieldNames = (extractedFields.fields || []).map(f => f.name);
      fieldAnalysis = AdmissionFieldRegistry.validate(fieldNames);
      fieldAnalysis.schemaValidation = TemplateFieldExtractor.validateAgainstSchema(htmlContent);
    } catch (e) {
      logger.warn('[AdmissionTemplate] Field extraction/validation warning:', e.message);
    }

    const template = await AdmissionTemplate.create({
      name,
      description,
      htmlContent,
      cssContent,
      extractedFields,
      config: config || {},
      templateStatus,
      schoolId,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Admission template created successfully',
      data: template,
      fieldAnalysis,
    });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] Create error:', err);
  }
};

/**
 * GET /api/v1/admission-templates
 * Query: page, limit, isActive, isDefault, search, templateStatus
 */
exports.getTemplates = async (req, res) => {
  try {
    const {
      page   = 1,
      limit  = 50,
      isActive,
      isDefault,
      search,
      templateStatus,
    } = req.query;

    const schoolId = req.schoolId;
    const query    = { schoolId, isActive: { $ne: false }, isDeleted: { $ne: true } };

    if (isActive    !== undefined) query.isActive      = isActive === 'true';
    if (isDefault   !== undefined) query.isDefault     = isDefault === 'true';
    if (templateStatus)            query.templateStatus = templateStatus;
    if (search) {
      query.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [templates, total] = await Promise.all([
      AdmissionTemplate.find(query)
        .select('-htmlContent -cssContent')      // omit heavy content for list
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AdmissionTemplate.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        page:  Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] GetAll error:', err);
  }
};

/**
 * GET /api/v1/admission-templates/:id
 */
exports.getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await AdmissionTemplate.findOne({ _id: id, schoolId: req.schoolId }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'Admission template not found' });
    }

    return res.status(200).json({ success: true, data: template });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] GetOne error:', err);
  }
};

/**
 * PUT /api/v1/admission-templates/:id
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      htmlContent,
      cssContent,
      config,
      templateStatus,
      isActive,
    } = req.body;

    const template = await AdmissionTemplate.findOne({ _id: id, schoolId: req.schoolId });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Admission template not found' });
    }

    if (name          !== undefined) template.name          = name;
    if (description   !== undefined) template.description   = description;
    if (cssContent    !== undefined) template.cssContent    = cssContent;
    if (config        !== undefined) template.config        = { ...template.config, ...config };
    if (templateStatus !== undefined) template.templateStatus = templateStatus;
    if (isActive      !== undefined) template.isActive      = isActive;

    // Re-extract fields whenever HTML changes
    if (htmlContent !== undefined) {
      template.htmlContent = htmlContent;
      try {
        template.extractedFields = TemplateFieldExtractor.extractFields(htmlContent) || [];
      } catch (e) {
        logger.warn('[AdmissionTemplate] Re-extraction warning:', e.message);
      }
    }

    template.updatedBy = req.user._id;
    await template.save();

    // Re-run field analysis if HTML changed
    let fieldAnalysis = {};
    if (htmlContent !== undefined) {
      try {
        const AdmissionFieldRegistry = require('../services/admissionFieldRegistry');
        const fieldNames = (template.extractedFields?.fields || []).map(f => f.name);
        fieldAnalysis = AdmissionFieldRegistry.validate(fieldNames);
        fieldAnalysis.schemaValidation = TemplateFieldExtractor.validateAgainstSchema(htmlContent);
      } catch (e) {
        logger.warn('[AdmissionTemplate] Field analysis warning on update:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Admission template updated successfully',
      data: template,
      fieldAnalysis,
    });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] Update error:', err);
  }
};

// DELETE (soft)
/**
 * DELETE /api/v1/admission-templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await AdmissionTemplate.findOne({ _id: id, schoolId: req.schoolId });

    if (!template) {
      return res.status(404).json({ success: false, message: 'Admission template not found' });
    }

    // Soft delete: mark inactive, clear default flag
    template.isActive  = false;
    template.isDefault = false;
    template.updatedBy = req.user._id;
    await template.save();

    return res.status(200).json({ success: true, message: 'Admission template deleted successfully' });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] Delete error:', err);
  }
};

/**
 * POST /api/v1/admission-templates/extract-fields
 * Body: { htmlContent }
 */
exports.extractFields = async (req, res) => {
  try {
    const { htmlContent } = req.body;
    if (!htmlContent) {
      return res.status(400).json({ success: false, message: 'htmlContent is required' });
    }

    const fields = TemplateFieldExtractor.extractFields(htmlContent);
    return res.status(200).json({
      success: true,
      data: { fields, count: fields?.length || 0 },
    });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] ExtractFields error:', err);
  }
};

// PREVIEW (HTML — sample data or real student)
/**
 * POST /api/v1/admission-templates/preview
 * Body: { htmlContent, cssContent?, sampleData?, studentId?, templateId? }
 */
exports.previewTemplate = async (req, res) => {
  try {
    const { htmlContent, cssContent = '', sampleData, studentId, templateId } = req.body;
    const schoolId = req.schoolId;

    // Get template HTML (from request body OR stored template)
    let tplHtml = htmlContent;
    let tplCss  = cssContent;

    if (!tplHtml && templateId) {
      const tpl = await AdmissionTemplate.findOne({ _id: templateId, schoolId }).lean();
      if (!tpl) return res.status(404).json({ success: false, message: 'Template not found' });
      tplHtml = tpl.htmlContent;
      tplCss  = tpl.cssContent || '';
    }

    if (!tplHtml) {
      return res.status(400).json({ success: false, message: 'htmlContent or templateId is required' });
    }

    // Build data: real student > custom sampleData > built-in sample
    let data = sampleData || AdmissionDataService.getSampleData();
    if (studentId) {
      try {
        // Optionally load school settings for branding
        const AdmissionFormSettings = require('../models/AdmissionFormSettings');
        const settings = await AdmissionFormSettings.findOne({ schoolId }).lean();
        data = await AdmissionDataService.getStudentSnapshot(studentId, schoolId, settings?.schoolProfile || {});
      } catch (e) {
        logger.warn('[AdmissionTemplate] Preview: real student load failed, using sample:', e.message);
      }
    }

    const html = TemplateParserService.preview(tplHtml, data, { css: tplCss });
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] Preview error:', err);
  }
};

// GET PREVIEW HTML for a saved template (GET convenience endpoint)
/**
 * GET /api/v1/admission-templates/:id/preview?studentId=...
 */
exports.previewSavedTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.query;
    const schoolId = req.schoolId;

    // Guard: must belong to this school and not be soft-deleted
    // Step 1: Strict school-scoped lookup
    let tpl = await AdmissionTemplate.findOne({
      _id: id,
      schoolId,
      isDeleted: { $ne: true },
    }).lean();

    // Step 2: Fallback — lookup by _id only (handles ObjectId/string mismatch or
    // templates uploaded by SuperAdmin under a slightly different schoolId reference)
    if (!tpl) {
      const looseTpl = await AdmissionTemplate.findOne({
        _id: id,
        isDeleted: { $ne: true },
      }).lean();

      if (!looseTpl) {
        return res.status(404).json({
          success: false,
          message: 'Template not found. It may have been deleted.',
        });
      }

      // Verify school ownership by string comparison (handles ObjectId ↔ string coercion)
      if (String(looseTpl.schoolId) !== String(schoolId)) {
        logger.warn('[AdmissionTemplate] previewSavedTemplate: schoolId mismatch', {
          requestSchoolId: String(schoolId),
          templateSchoolId: String(looseTpl.schoolId),
          templateId: id,
        });
        return res.status(403).json({
          success: false,
          message: 'Access denied: template belongs to a different school.',
        });
      }
      tpl = looseTpl;
    }


    // Load school settings for branding (schoolName, logo)
    let schoolProfile = {};
    try {
      const settings = await AdmissionFormSettings.findOne({ schoolId }).lean();
      schoolProfile = settings?.schoolProfile || {};
    } catch (_) {}

    // Build data: real student snapshot or sample
    let data = AdmissionDataService.getSampleData(schoolProfile);
    if (studentId) {
      try {
        data = await AdmissionDataService.getStudentSnapshot(studentId, schoolId, schoolProfile);
      } catch (e) {
        logger.warn('[AdmissionTemplate] previewSavedTemplate: student load failed, using sample:', e.message);
      }
    }

    const renderResult = TemplateParserService.render(tpl.htmlContent, data, { css: tpl.cssContent || '' });
    const { html: renderedHtml, missingFields = [] } = renderResult;

    // Build diagnostic banner for missing fields
    let diagnosticBanner = '';
    if (missingFields.length > 0) {
      const diagnostics = AdmissionDataService.diagnoseMissing(missingFields, data);
      const rows = diagnostics.map(d =>
        `<tr><td style="padding:2px 8px;color:#b94a48;font-family:monospace">${d.field}</td>` +
        `<td style="padding:2px 8px;color:#333">${d.reason}</td>` +
        `<td style="padding:2px 8px;color:#888;font-size:10px">${d.description}</td></tr>`
      ).join('');
      diagnosticBanner = `
        <div style="background:#fff3cd;border:1px solid #ffc107;padding:10px 14px;margin-bottom:12px;font-size:11px;border-radius:4px">
          <strong>⚠ Missing Fields (${missingFields.length}) — template data not found for these placeholders:</strong>
          <table style="margin-top:6px;border-collapse:collapse;width:100%">
            <thead><tr>
              <th style="text-align:left;padding:2px 8px;color:#555">Placeholder</th>
              <th style="text-align:left;padding:2px 8px;color:#555">Reason</th>
              <th style="text-align:left;padding:2px 8px;color:#555">Description</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }

    const wrappedHtml = TemplateParserService._wrapInDocument(
      diagnosticBanner + renderedHtml,
      tpl.cssContent || ''
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    // Expose missing field count for frontend to consume if needed
    if (missingFields.length > 0) {
      res.setHeader('X-Missing-Fields', missingFields.length.toString());
    }
    return res.send(wrappedHtml);
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] previewSavedTemplate error:', err);
  }
};

/**
 * POST /api/v1/admission-templates/generate
 * Body: { studentId, templateId? }
 *
 * Generates a PDF admission form for a student.
 * If templateId is not provided, the school's default template is used.
 * Returns a download URL.
 */
exports.generatePDF = async (req, res) => {
  const startTime = Date.now();
  try {
    const { studentId, templateId } = req.body;
    const schoolId = req.schoolId;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId is required' });
    }

    // Resolve template — mirrors getActiveTemplate fallback strategy
    let tpl;

    // Attempt 0: explicit templateId provided by caller
    if (templateId) {
      tpl = await AdmissionTemplate.findOne({ _id: templateId, schoolId }).lean();
    }

    // Attempt 1: explicit activeTemplateId in AdmissionFormSettings
    if (!tpl) {
      const settings = await AdmissionFormSettings.findOne({ schoolId }).lean();
      if (settings?.activeTemplateId) {
        tpl = await AdmissionTemplate.findOne({ _id: settings.activeTemplateId, schoolId }).lean();
      }
    }

    // Attempt 2: isDefault flag (ignore isActive)
    if (!tpl) {
      tpl = await AdmissionTemplate.findOne({ schoolId, isDefault: true }).lean();
    }

    // Attempt 3: latest published template
    if (!tpl) {
      tpl = await AdmissionTemplate.findOne({ schoolId, templateStatus: 'published' })
        .sort({ createdAt: -1 }).lean();
    }

    // Attempt 4: any non-deleted template for the school
    if (!tpl) {
      tpl = await AdmissionTemplate.findOne({ schoolId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 }).lean();
    }

    if (!tpl) {
      return res.status(404).json({
        success: false,
        message: 'No admission template found. Please upload a template via the Super Admin panel.',
      });
    }

    // Load school settings for branding
    let schoolProfile = {};
    try {
      const settings = await AdmissionFormSettings.findOne({ schoolId }).lean();
      schoolProfile = settings?.schoolProfile || {};
    } catch (_) {}

    // Build data snapshot
    const data = await AdmissionDataService.getStudentSnapshot(studentId, schoolId, schoolProfile);

    // Build file name
    const safeName = (data.name || 'student').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
    const fileName = `AdmissionForm_${safeName}_${Date.now()}.pdf`;

    // Generate PDF
    const pdfResult = await PDFService.generateFromTemplate({
      template: tpl.htmlContent,
      data,
      css: tpl.cssContent || '',
      fileName,
      outputDir: OUTPUT_DIR,
      options: {
        format: tpl.config?.pageSize || 'A4',
        margin: {
          top:    `${tpl.config?.marginTop    || 10}mm`,
          right:  `${tpl.config?.marginRight  || 10}mm`,
          bottom: `${tpl.config?.marginBottom || 10}mm`,
          left:   `${tpl.config?.marginLeft   || 10}mm`,
        },
      },
    });

    if (!pdfResult.success) {
      return res.status(500).json({ success: false, message: 'PDF generation failed', error: pdfResult.error });
    }

    // Update usage stats
    await AdmissionTemplate.findByIdAndUpdate(tpl._id, {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() },
    });

    const reportId = uuidv4();

    return res.status(200).json({
      success: true,
      message: 'Admission form PDF generated successfully',
      data: {
        reportId,
        fileName: pdfResult.fileName,
        filePath: pdfResult.filePath,
        downloadUrl: `/api/v1/admission-templates/download/${encodeURIComponent(pdfResult.fileName)}`,
        generationTime: Date.now() - startTime,
        missingFields: pdfResult.missingFields || [],
        templateName: tpl.name,
      },
    });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] GeneratePDF error:', err);
  }
};

/**
 * GET /api/v1/admission-templates/download/:fileName
 */
exports.downloadPDF = async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(OUTPUT_DIR, decodeURIComponent(fileName));

    if (!filePath.startsWith(OUTPUT_DIR)) {
      // Prevent path traversal
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    return res.download(filePath, decodeURIComponent(fileName), (err) => {
      if (err && !res.headersSent) {
        logger.error('[AdmissionTemplate] Download error:', err);
        res.status(404).json({ success: false, message: 'File not found or expired' });
      }
    });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] Download error:', err);
  }
};

/**
 * PUT /api/v1/admission-templates/:id/set-default
 */
exports.setDefault = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const template = await AdmissionTemplate.findOne({ _id: id, schoolId, isActive: true });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Admission template not found' });
    }

    // Clear all other defaults first
    await AdmissionTemplate.updateMany({ schoolId, _id: { $ne: id } }, { isDefault: false });

    template.isDefault = true;
    template.updatedBy = req.user._id;
    await template.save();

    // Also persist to AdmissionFormSettings.activeTemplateId
    await AdmissionFormSettings.findOneAndUpdate(
      { schoolId },
      { $set: { activeTemplateId: id } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `"${template.name}" is now the default admission form template`,
    });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] SetDefault error:', err);
  }
};

/**
 * POST /api/v1/admission-templates/:id/clone
 * Body: { newName? }
 */
exports.cloneTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;
    const schoolId = req.schoolId;

    const src = await AdmissionTemplate.findOne({ _id: id, schoolId }).lean();
    if (!src) return res.status(404).json({ success: false, message: 'Admission template not found' });

    const { _id, createdAt, updatedAt, usageCount, lastUsedAt, isDefault, ...rest } = src;

    const cloned = await AdmissionTemplate.create({
      ...rest,
      name:      newName || `${src.name} (Copy)`,
      isDefault: false,
      usageCount: 0,
      lastUsedAt: null,
      schoolId,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: 'Template cloned successfully',
      data: cloned,
    });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] Clone error:', err);
  }
};

// GET ACTIVE TEMPLATE (for AdmissionFormSettings page)
/**
 * GET /api/v1/admission-templates/active
 * Returns the currently active/default template for the school (without HTML).
 *
 * Resolution order (most-specific → least-specific):
 *   1. AdmissionFormSettings.activeTemplateId  (explicit admin pick)
 *   2. isDefault: true  (any isActive state — super-admin may forget to set isActive)
 *   3. templateStatus: 'published'  (latest published template)
 *   4. Any template for the school  (most recently created — last resort)
 */
exports.getActiveTemplate = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const SELECT   = '-htmlContent -cssContent';   // skip heavy fields
    let tpl = null;

    // Attempt 1: explicit activeTemplateId stored in AdmissionFormSettings
    const settings = await AdmissionFormSettings.findOne({ schoolId }).lean();
    if (settings?.activeTemplateId) {
      tpl = await AdmissionTemplate
        .findOne({ _id: settings.activeTemplateId, schoolId, isDeleted: { $ne: true } })
        .select(SELECT).lean();
      // If the saved ID points to a deleted template, clear it so the fallback
      // picks a live template and re-syncs the pointer.
      if (!tpl && settings.activeTemplateId) {
        AdmissionFormSettings.findOneAndUpdate(
          { schoolId },
          { $unset: { activeTemplateId: '' } },
          { upsert: false }
        ).catch(() => {});
      }
    }

    // Attempt 2: isDefault flag (ignore isActive — super admin may have
    //              uploaded without explicitly activating it)
    if (!tpl) {
      tpl = await AdmissionTemplate
        .findOne({ schoolId, isDefault: true })
        .select(SELECT).lean();
    }

    // Attempt 3: latest published template
    if (!tpl) {
      tpl = await AdmissionTemplate
        .findOne({ schoolId, templateStatus: 'published' })
        .sort({ createdAt: -1 })
        .select(SELECT).lean();
    }

    // Attempt 4: any template for this school (last resort)
    if (!tpl) {
      tpl = await AdmissionTemplate
        .findOne({ schoolId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .select(SELECT).lean();
    }

    // If we found a template via fallback but settings didn't point to it,
    // silently sync activeTemplateId so future calls are faster.
    if (tpl && !settings?.activeTemplateId) {
      AdmissionFormSettings.findOneAndUpdate(
        { schoolId },
        { $set: { activeTemplateId: tpl._id } },
        { upsert: true }
      ).catch(() => {});  // fire-and-forget, non-critical
    }

    return res.status(200).json({ success: true, data: tpl || null });
  } catch (err) {
    return serviceError(res, '[AdmissionTemplate] GetActive error:', err);
  }
};

/**
 * GET /api/v1/admission-templates/stats
 */
exports.getStats = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const [total, active, withDefault] = await Promise.all([
      AdmissionTemplate.countDocuments({ schoolId }),
      AdmissionTemplate.countDocuments({ schoolId, isActive: true }),
      AdmissionTemplate.countDocuments({ schoolId, isDefault: true }),
    ]);

    return res.status(200).json({
      success: true,
      data: { total, active, hasDefault: withDefault > 0 },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

