/**
 * Report Template Controller
 * 
 * Handles CRUD operations for report templates and field extraction.
 */

const ReportTemplate = require('../models/ReportTemplate');
const TemplateFieldExtractor = require('../services/templateFieldExtractor');
const { resolveTemplate }     = require('../services/templateResolver');
const Class                   = require('../models/ClassModel');
const logger = require('../utils/logger');

/**
 * Create new template
 * POST /api/report-templates
 */
exports.createTemplate = async (req, res) => {
  try {
    const {
      name,
      description,
      htmlContent,
      cssContent,
      templateType,
      applicableExams,
      isDefault,
      config,
      // Class-group targeting
      classGroupName,
      classRangeFrom,
      classRangeTo,
      applicableClassIds,
    } = req.body;

    // Validation
    if (!name || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'name and htmlContent are required',
      });
    }

    const schoolId = req.schoolId;
    const userId = req.user._id;

    // Extract fields from template
    const extraction = TemplateFieldExtractor.extractFields(htmlContent);

    // Create template
    const template = new ReportTemplate({
      name,
      description,
      htmlContent,
      cssContent: cssContent || '',
      extractedFields: extraction.fields,
      templateType: templateType || 'custom',
      applicableExams: applicableExams || [],
      isDefault: isDefault || false,
      config: config || {},
      // Class-group targeting
      classGroupName: classGroupName || '',
      classRangeFrom: classRangeFrom !== undefined ? Number(classRangeFrom) : null,
      classRangeTo:   classRangeTo   !== undefined ? Number(classRangeTo)   : null,
      applicableClassIds: applicableClassIds || [],
      createdBy: userId,
      updatedBy: userId,
      schoolId,
    });

    await template.save();

    return res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: {
        templateId: template._id,
        name: template.name,
        classGroupName: template.classGroupName,
        classRangeFrom: template.classRangeFrom,
        classRangeTo: template.classRangeTo,
        extractedFields: extraction.fields,
        summary: extraction.summary,
        fieldTypes: {
          simple: extraction.simple,
          objects: extraction.objects,
          arrays: extraction.arrays,
        },
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Create error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get all templates
 * GET /api/report-templates
 */
exports.getTemplates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      templateType,
      isActive,
      isDefault,
      search,
    } = req.query;

    const schoolId = req.schoolId;

    // Build query
    const query = {
      schoolId,
      isDeleted: { $ne: true },
    };

    if (templateType) query.templateType = templateType;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isDefault !== undefined) query.isDefault = isDefault === 'true';
    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const skip = (Number(page) - 1) * Number(limit);

    const [templates, total] = await Promise.all([
      ReportTemplate.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ isDefault: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReportTemplate.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Get templates error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get single template
 * GET /api/report-templates/:id
 */
exports.getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const template = await ReportTemplate.findOne({
      _id: id,
      schoolId,
    })
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Re-extract fields (in case template was modified)
    const extraction = TemplateFieldExtractor.extractFields(template.htmlContent);

    return res.status(200).json({
      success: true,
      data: {
        ...template.toObject(),
        extractedFields: extraction.fields,
        summary: extraction.summary,
        fieldTypes: {
          simple: extraction.simple,
          objects: extraction.objects,
          arrays: extraction.arrays,
        },
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Get template error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update template
 * PUT /api/report-templates/:id
 */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      htmlContent,
      cssContent,
      templateType,
      applicableExams,
      isActive,
      isDefault,
      config,
      fieldMappings,
      // Class-group targeting
      classGroupName,
      classRangeFrom,
      classRangeTo,
      applicableClassIds,
    } = req.body;

    const schoolId = req.schoolId;
    const userId = req.user._id;

    // Find template
    const template = await ReportTemplate.findOne({
      _id: id,
      schoolId,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Update fields
    if (name !== undefined)        template.name = name;
    if (description !== undefined) template.description = description;
    if (htmlContent !== undefined) {
      template.htmlContent = htmlContent;
      const extraction = TemplateFieldExtractor.extractFields(htmlContent);
      template.extractedFields = extraction.fields;
    }
    if (cssContent !== undefined)       template.cssContent = cssContent;
    if (templateType !== undefined)     template.templateType = templateType;
    if (applicableExams !== undefined)  template.applicableExams = applicableExams;
    if (isActive !== undefined)         template.isActive = isActive;
    if (isDefault !== undefined)        template.isDefault = isDefault;
    if (config !== undefined)           template.config = { ...template.config, ...config };
    if (fieldMappings !== undefined)    template.fieldMappings = new Map(Object.entries(fieldMappings));
    // Class-group targeting
    if (classGroupName !== undefined)    template.classGroupName = classGroupName;
    if (classRangeFrom !== undefined)    template.classRangeFrom = classRangeFrom !== null ? Number(classRangeFrom) : null;
    if (classRangeTo   !== undefined)    template.classRangeTo   = classRangeTo   !== null ? Number(classRangeTo)   : null;
    if (applicableClassIds !== undefined) template.applicableClassIds = applicableClassIds;

    template.updatedBy = userId;
    await template.save();

    return res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: {
        templateId: template._id,
        name: template.name,
        isActive: template.isActive,
        isDefault: template.isDefault,
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Update error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete template (soft delete)
 * DELETE /api/report-templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const template = await ReportTemplate.findOne({
      _id: id,
      schoolId,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Soft delete
    template.isActive = false;
    await template.save();

    // Hard delete
    await ReportTemplate.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    });

  } catch (error) {
    logger.error('[ReportTemplate] Delete error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Extract fields from template HTML
 * POST /api/report-templates/extract-fields
 */
exports.extractFields = async (req, res) => {
  try {
    const { htmlContent } = req.body;

    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'htmlContent is required',
      });
    }

    const extraction = TemplateFieldExtractor.extractFields(htmlContent);
    const suggestions = TemplateFieldExtractor.suggestMappings(extraction);

    return res.status(200).json({
      success: true,
      data: {
        fields: extraction.fields,
        summary: extraction.summary,
        fieldTypes: {
          simple: extraction.simple,
          objects: extraction.objects,
          arrays: extraction.arrays,
        },
        suggestedMappings: suggestions,
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Extract fields error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Validate template with sample data
 * POST /api/report-templates/validate
 */
exports.validateTemplate = async (req, res) => {
  try {
    const { htmlContent, sampleData } = req.body;

    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'htmlContent is required',
      });
    }

    const TemplateParserService = require('../services/templateParserService');
    
    const validation = TemplateParserService.validate(
      htmlContent,
      sampleData || {}
    );

    // Generate preview HTML
    const preview = sampleData
      ? TemplateParserService.preview(htmlContent, sampleData)
      : null;

    return res.status(200).json({
      success: true,
      data: {
        validation,
        preview,
        isValid: validation.isValid,
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Validate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Preview template with sample data
 * POST /api/report-templates/preview
 */
exports.previewTemplate = async (req, res) => {
  try {
    const { htmlContent, cssContent, sampleData } = req.body;

    if (!htmlContent) {
      return res.status(400).json({
        success: false,
        message: 'htmlContent is required',
      });
    }

    const TemplateParserService = require('../services/templateParserService');

    const previewHtml = TemplateParserService.preview(
      htmlContent,
      sampleData || {},
      { css: cssContent || '' }
    );

    res.setHeader('Content-Type', 'text/html');
    return res.send(previewHtml);

  } catch (error) {
    logger.error('[ReportTemplate] Preview error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Set template as default
 * PUT /api/report-templates/:id/set-default
 */
exports.setDefault = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const template = await ReportTemplate.findOne({
      _id: id,
      schoolId,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // This will trigger the pre-save hook to unset other defaults
    template.isDefault = true;
    await template.save();

    return res.status(200).json({
      success: true,
      message: 'Template set as default',
      data: {
        templateId: template._id,
        name: template.name,
        isDefault: true,
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Set default error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Clone template
 * POST /api/report-templates/:id/clone
 */
exports.cloneTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;
    const schoolId = req.schoolId;
    const userId = req.user._id;

    const sourceTemplate = await ReportTemplate.findOne({
      _id: id,
      schoolId,
    });

    if (!sourceTemplate) {
      return res.status(404).json({
        success: false,
        message: 'Source template not found',
      });
    }

    const newTemplate = new ReportTemplate({
      name: newName || `${sourceTemplate.name} (Copy)`,
      description: sourceTemplate.description,
      htmlContent: sourceTemplate.htmlContent,
      cssContent: sourceTemplate.cssContent,
      extractedFields: sourceTemplate.extractedFields,
      fieldMappings: sourceTemplate.fieldMappings,
      templateType: sourceTemplate.templateType,
      applicableExams: sourceTemplate.applicableExams,
      isActive: true,
      isDefault: false,
      config: sourceTemplate.config,
      // Carry class-group targeting from source
      classGroupName:    sourceTemplate.classGroupName,
      classRangeFrom:    sourceTemplate.classRangeFrom,
      classRangeTo:      sourceTemplate.classRangeTo,
      applicableClassIds: sourceTemplate.applicableClassIds,
      createdBy: userId,
      updatedBy: userId,
      schoolId,
    });

    await newTemplate.save();

    return res.status(201).json({
      success: true,
      message: 'Template cloned successfully',
      data: {
        templateId: newTemplate._id,
        name: newTemplate.name,
        classGroupName: newTemplate.classGroupName,
        classRangeFrom: newTemplate.classRangeFrom,
        classRangeTo:   newTemplate.classRangeTo,
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Clone error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get best-matched template for a given class
 * GET /api/report-templates/for-class?classId=xxx&examType=annual
 */
exports.getTemplateForClass = async (req, res) => {
  try {
    const { classId, examType = 'annual' } = req.query;
    const schoolId = req.schoolId;

    if (!classId) {
      return res.status(400).json({ success: false, message: 'classId is required' });
    }

    // Fetch the class to get numericOrder
    const classDoc = await Class.findOne({ _id: classId, schoolId }).lean();
    const classNumericOrder = classDoc?.numericOrder ?? null;

    const template = await resolveTemplate({
      schoolId,
      classNumericOrder,
      classId: String(classId),
      examType,
      templateId: null,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'No template found for this class',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id:            template._id,
        name:           template.name,
        templateType:   template.templateType,
        classGroupName: template.classGroupName || '',
        classRangeFrom: template.classRangeFrom,
        classRangeTo:   template.classRangeTo,
        isDefault:      template.isDefault,
        matchReason: (
          template.applicableClassIds?.some(id => String(id) === String(classId))
            ? 'exact_class'
            : (template.classRangeFrom !== null ? 'class_range' : 'global_default')
        ),
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] getTemplateForClass error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get template statistics
 * GET /api/report-templates/stats
 */
exports.getStats = async (req, res) => {
  try {
    const schoolId = req.schoolId;

    const stats = await ReportTemplate.aggregate([
      {
        $match: {
          schoolId: schoolId,
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          totalTemplates: { $sum: 1 },
          defaultTemplates: {
            $sum: { $cond: [{ $eq: ['$isDefault', true] }, 1, 0] },
          },
          totalUsage: { $sum: '$usageCount' },
        },
      },
    ]);

    const byType = await ReportTemplate.aggregate([
      {
        $match: {
          schoolId: schoolId,
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$templateType',
          count: { $sum: 1 },
        },
      },
    ]);

    const mostUsed = await ReportTemplate.find({
      schoolId,
      isActive: true,
    })
      .sort({ usageCount: -1 })
      .limit(5)
      .select('name templateType usageCount lastUsedAt');

    return res.status(200).json({
      success: true,
      data: {
        overall: stats[0] || {
          totalTemplates: 0,
          defaultTemplates: 0,
          totalUsage: 0,
        },
        byType,
        mostUsed,
      },
    });

  } catch (error) {
    logger.error('[ReportTemplate] Stats error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
