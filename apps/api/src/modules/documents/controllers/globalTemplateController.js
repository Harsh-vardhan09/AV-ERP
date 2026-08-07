// Super Admin only: mounted behind verifySuperAdmin, so req.user and req.schoolId are
// absent. Writes { isGlobal:true, schoolId:null } — one HTML doc, inline CSS, no cssContent

// TEMP: ReportTemplate + template services move to modules/reporting
const ReportTemplate         = require('../../reportcards').ReportTemplate;
const TemplateFieldExtractor = require('../../reportcards').TemplateFieldExtractor;
const TemplateParserService  = require('../../reportcards').TemplateParserService;
const logger                 = require('../../../core/logging/logger');

// Anything else in the body is ignored
const WRITABLE = [
  'name', 'description', 'htmlContent', 'templateType', 'applicableExams',
  'isDefault', 'isActive', 'templateStatus', 'config',
  'classGroupName', 'classRangeFrom', 'classRangeTo', 'applicableClassIds',
];

const pickWritable = (body = {}) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => WRITABLE.includes(k)));

exports.listGlobalTemplates = async (req, res) => {
  try {
    const { templateType, templateStatus, isActive, search, page = 1, limit = 50 } = req.query;

    const query = { isGlobal: true, isDeleted: { $ne: true } };
    if (templateType)        query.templateType   = templateType;
    if (templateStatus)      query.templateStatus = templateStatus;
    if (isActive !== undefined) query.isActive    = isActive === 'true';
    if (search)              query.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [templates, total] = await Promise.all([
      ReportTemplate.find(query)
        // htmlContent omitted — the list view doesn't need the payload
        .select('-htmlContent -cssContent')
        .sort({ isDefault: -1, updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReportTemplate.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: templates,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    logger.error('[GlobalTemplate] list error', { error: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Fetch one global template, including htmlContent, for the editor.
 * GET /api/super-admin/templates/:id
 */
exports.getGlobalTemplate = async (req, res) => {
  try {
    const template = await ReportTemplate.findOne({
      _id: req.params.id, isGlobal: true, isDeleted: { $ne: true },
    }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'Global template not found' });
    }

    const extraction = TemplateFieldExtractor.extractFields(template.htmlContent || '');
    return res.status(200).json({
      success: true,
      data: { ...template, extractedFields: extraction.fields, summary: extraction.summary },
    });
  } catch (error) {
    logger.error('[GlobalTemplate] get error', { error: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGlobalTemplate = async (req, res) => {
  try {
    const body = pickWritable(req.body);
    const { name, htmlContent } = body;

    if (!name || !htmlContent) {
      return res.status(400).json({ success: false, message: 'name and htmlContent are required' });
    }

    const extraction = TemplateFieldExtractor.extractFields(htmlContent);
    const classified = TemplateFieldExtractor.extractAndClassify(htmlContent);

    // Only one global default per templateType.
    if (body.isDefault) {
      await ReportTemplate.updateMany(
        { isGlobal: true, templateType: body.templateType || 'custom', isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const template = await ReportTemplate.create({
      ...body,
      name: String(name).trim(),
      cssContent: '',                       // deprecated — inline CSS lives in htmlContent
      extractedFields: extraction.fields,
      templateSchema: classified,
      templateType:   body.templateType   || 'custom',
      templateStatus: body.templateStatus || 'published',
      isGlobal: true,
      schoolId: null,
      createdBySuperAdmin: req.superAdmin._id,
    });

    logger.info('[GlobalTemplate] created', { id: template._id, by: req.superAdmin._id });
    return res.status(201).json({
      success: true,
      message: 'Global template created',
      data: { templateId: template._id, name: template.name, extractedFields: extraction.fields, summary: extraction.summary },
    });
  } catch (error) {
    logger.error('[GlobalTemplate] create error', { error: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateGlobalTemplate = async (req, res) => {
  try {
    const template = await ReportTemplate.findOne({
      _id: req.params.id, isGlobal: true, isDeleted: { $ne: true },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Global template not found' });
    }

    const body = pickWritable(req.body);
    Object.entries(body).forEach(([k, v]) => { template[k] = v; });

    // Re-extract whenever the markup changes so the teacher-facing field map
    // never drifts from the template.
    if (body.htmlContent !== undefined) {
      template.extractedFields = TemplateFieldExtractor.extractFields(body.htmlContent).fields;
      template.templateSchema  = TemplateFieldExtractor.extractAndClassify(body.htmlContent);
      template.cssContent      = '';
    }

    if (body.isDefault) {
      await ReportTemplate.updateMany(
        { isGlobal: true, templateType: template.templateType, isDefault: true, _id: { $ne: template._id } },
        { $set: { isDefault: false } },
      );
    }

    await template.save();
    logger.info('[GlobalTemplate] updated', { id: template._id, by: req.superAdmin._id });
    return res.status(200).json({ success: true, message: 'Global template updated', data: { templateId: template._id } });
  } catch (error) {
    logger.error('[GlobalTemplate] update error', { error: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Soft-delete a global template.
 * DELETE /api/super-admin/templates/:id
 *
 * Soft, not hard: schools may have it selected, and a hard delete would leave
 * SchoolSettings.selectedReportTemplateId dangling. getSelection() already
 * reports a vanished template as `isStale` so those schools are prompted to
 * re-pick rather than silently falling back.
 */
exports.deleteGlobalTemplate = async (req, res) => {
  try {
    const template = await ReportTemplate.findOne({ _id: req.params.id, isGlobal: true });
    if (!template) {
      return res.status(404).json({ success: false, message: 'Global template not found' });
    }

    template.isDeleted = true;
    template.isActive  = false;
    await template.save();

    // TEMP: moves to modules/schools
    const SchoolSettings = require('../../tenancy').SchoolSettings;
    const affected = await SchoolSettings.countDocuments({ selectedReportTemplateId: template._id });

    logger.warn('[GlobalTemplate] soft-deleted', { id: template._id, by: req.superAdmin._id, affectedSchools: affected });
    return res.status(200).json({
      success: true,
      message: affected
        ? `Template deleted. ${affected} school(s) had it selected and must pick another.`
        : 'Template deleted',
      data: { affectedSchools: affected },
    });
  } catch (error) {
    logger.error('[GlobalTemplate] delete error', { error: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.extractFields = async (req, res) => {
  try {
    const { htmlContent } = req.body;
    if (!htmlContent) {
      return res.status(400).json({ success: false, message: 'htmlContent is required' });
    }
    const extraction = TemplateFieldExtractor.extractFields(htmlContent);
    const classified = TemplateFieldExtractor.extractAndClassify(htmlContent);
    return res.status(200).json({ success: true, data: { ...extraction, templateSchema: classified } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Render a preview from raw HTML + sample data — powers the editor's Preview tab.
 * POST /api/super-admin/templates/preview   body: { htmlContent, sampleData? }
 * Returns HTML (text/html), matching the school-side preview contract.
 */
exports.previewGlobalTemplate = async (req, res) => {
  try {
    const { htmlContent, sampleData } = req.body;
    if (!htmlContent) {
      return res.status(400).json({ success: false, message: 'htmlContent is required' });
    }
    // css intentionally '' — inline styles travel inside htmlContent now.
    const html = TemplateParserService.preview(htmlContent, sampleData || {}, { css: '' });
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (error) {
    logger.error('[GlobalTemplate] preview error', { error: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
};
