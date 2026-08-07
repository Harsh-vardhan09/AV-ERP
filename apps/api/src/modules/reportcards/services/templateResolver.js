/**
 * templateResolver.js — Single Source of Truth for Report Template Resolution
 *
 * Resolution Priority (most → least specific):
 *
 *   1. Explicit templateId override (user passed a specific template)
 *   2. applicableClassIds exact class match (exact targeting)
 *   3. Smallest numeric range that covers student's numericOrder (most specific wins)
 *   3.5. SchoolSettings.selectedReportTemplateId (admin's school-wide pick)
 *   4. isDefault + matching examType (scoped default)
 *   5. Any isDefault template (global default)
 *   5a. Super Admin Recommended template (templateStatus === 'recommended')
 *   6. First active template (last-resort fallback)
 *
 * KEY RULE: Smaller range wins over larger range.
 * Example: Templates 1–12 and 9–10 both match Class 10 → use 9–10 (smaller).
 *
 * This service is called from:
 *   - dynamicReportController.generateReport
 *   - dynamicReportController.previewReport
 *   - dynamicReportController.generateBulkReports
 *   - reportTemplateController.getTemplateForClass
 *
 * Never duplicate this logic in controllers.
 */

const ReportTemplate = require('../models/ReportTemplate');
const StudentProfile  = require('../../../../src/modules/people/models/StudentProfile');
const SchoolSettings  = require('../../tenancy').SchoolSettings;
const logger          = require('../../../core/logging/logger.js');

/**
 * Resolve the best-matching template for a student's class.
 *
 * @param {object} opts
 * @param {mongoose.Types.ObjectId|string} opts.schoolId
 * @param {number}  opts.classNumericOrder — the student's Class.numericOrder
 * @param {string}  opts.classId           — the student's classId (_id string)
 * @param {string}  opts.examType          — e.g. 'annual', 'half_yearly'
 * @param {string}  [opts.templateId]      — explicit override (Priority 1)
 * @param {string}  [opts.studentId]       — used only for trace logging
 * @returns {Promise<{template: mongoose.Document|null, matchReason: string}>}
 */
async function resolveTemplate({ schoolId, classNumericOrder, classId, examType, templateId, studentId }) {

  // A school can use its own legacy templates OR any global (Super Admin
  // authored) one. Both are in scope everywhere below.
  const visibleTo = (sid) => ({ $or: [{ isGlobal: true }, { schoolId: sid }] });

  // Priority 1: Explicit templateId override
  if (templateId) {
    const explicit = await ReportTemplate.findOne({
      _id: templateId,
      isActive: true,
      ...visibleTo(schoolId),
    }).lean();
    if (explicit) {
      _trace('explicit_override', explicit, { schoolId, classId, studentId });
      return _attach(explicit, 'explicit_override');
    }
    // If explicit not found, fall through to auto-resolution
  }

  // Fetch ALL active templates for this school (one round-trip, sorted for stable ordering)
  const allTemplates = await ReportTemplate.find({
    isActive: true,
    ...visibleTo(schoolId),
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!allTemplates.length) {
    logger.warn('[TemplateResolver] No active templates found', { schoolId, classId, studentId });
    return _attach(null, 'no_templates');
  }

  // Filter by examType first (include 'custom' as wildcard)
  const typeTemplates = allTemplates.filter(
    t => !t.templateType || t.templateType === examType || t.templateType === 'custom'
  );
  // Fall back to all templates if none match the examType
  const candidates = typeTemplates.length > 0 ? typeTemplates : allTemplates;

  // Priority 2: applicableClassIds exact match
  if (classId) {
    const classIdStr = String(classId);
    const exactMatch = candidates.find(
      t => t.applicableClassIds?.length > 0 &&
           t.applicableClassIds.some(id => String(id) === classIdStr)
    );
    if (exactMatch) {
      _trace('exact_class', exactMatch, { schoolId, classId, studentId });
      return _attach(exactMatch, 'exact_class');
    }
  }

  // Priority 3: Smallest numeric range covering the student's class
  if (classNumericOrder !== null && classNumericOrder !== undefined) {
    const rangeMatches = candidates.filter(
      t => t.classRangeFrom !== null &&
           t.classRangeTo   !== null &&
           classNumericOrder >= t.classRangeFrom &&
           classNumericOrder <= t.classRangeTo
    );

    if (rangeMatches.length > 0) {
      // Most specific = smallest range (classRangeTo - classRangeFrom)
      rangeMatches.sort(
        (a, b) => (a.classRangeTo - a.classRangeFrom) - (b.classRangeTo - b.classRangeFrom)
      );
      _trace('class_range', rangeMatches[0], { schoolId, classId, studentId });
      return _attach(rangeMatches[0], 'class_range');
    }
  }

  // Priority 3.5: School-wide admin selection
  // Sits BELOW class targeting on purpose: an admin picking one template for
  // the school must not override templates aimed at a specific class group.
  const settings = await SchoolSettings.findOne({ schoolId })
    .select('selectedReportTemplateId')
    .lean();
  if (settings?.selectedReportTemplateId) {
    const selectedId = String(settings.selectedReportTemplateId);
    const selected = allTemplates.find(t => String(t._id) === selectedId);
    if (selected) {
      _trace('school_selection', selected, { schoolId, classId, studentId });
      return _attach(selected, 'school_selection');
    }
  }

  // Priority 4: isDefault + matching examType
  const scopedDefault = candidates.find(
    t => t.isDefault &&
         !t.applicableClassIds?.length &&
         t.classRangeFrom === null &&
         t.templateType === examType
  );
  if (scopedDefault) {
    _trace('scoped_default', scopedDefault, { schoolId, classId, studentId });
    return _attach(scopedDefault, 'scoped_default');
  }

  // Priority 5: Any isDefault (global default)
  const globalDefault = allTemplates.find(
    t => t.isDefault && !t.applicableClassIds?.length && t.classRangeFrom === null
  );
  if (globalDefault) {
    _trace('global_default', globalDefault, { schoolId, classId, studentId });
    return _attach(globalDefault, 'global_default');
  }

  const anyDefault = allTemplates.find(t => t.isDefault);
  if (anyDefault) {
    _trace('any_default', anyDefault, { schoolId, classId, studentId });
    return _attach(anyDefault, 'any_default');
  }

  // Priority 5a: Super Admin Recommended
  // Super Admin can mark templates as 'recommended' so schools that haven't
  // set their own defaults still get a sensible template.
  const recommended = allTemplates.find(t => t.templateStatus === 'recommended');
  if (recommended) {
    _trace('super_admin_recommended', recommended, { schoolId, classId, studentId });
    return _attach(recommended, 'super_admin_recommended');
  }

  // Priority 6: First active template (last resort)
  _trace('first_active', allTemplates[0], { schoolId, classId, studentId });
  return _attach(allTemplates[0] || null, 'first_active');
}

/**
 * Convenience wrapper: resolve template using a studentId.
 * Fetches the student's classId and numericOrder internally.
 *
 * @param {object} opts
 * @param {string} opts.studentId
 * @param {string} opts.schoolId
 * @param {string} opts.examType
 * @param {string} [opts.templateId]
 * @returns {Promise<{template: mongoose.Document|null, matchReason: string}>}
 */
async function resolveTemplateForStudent({ studentId, schoolId, examType, templateId }) {
  // Explicit override — skip the student lookup entirely (fast path)
  if (templateId) {
    const explicit = await ReportTemplate.findOne({
      _id: templateId,
      isActive: true,
      $or: [{ isGlobal: true }, { schoolId }],
    }).lean();
    if (explicit) return _attach(explicit, 'explicit_override');
  }

  const student = await StudentProfile.findOne({ _id: studentId, schoolId })
    .populate('classId', 'numericOrder')
    .lean();

  const classNumericOrder = student?.classId?.numericOrder ?? null;
  const classId           = student?.classId?._id ? String(student.classId._id) : null;

  return resolveTemplate({ schoolId, classNumericOrder, classId, examType, templateId, studentId });
}


/**
 * Attach matchReason to template object (non-destructive).
 * Callers that used to receive a raw doc now also get matchReason.
 * Old callers expecting just a doc still work (they ignore the extra field).
 */
function _attach(template, reason) {
  if (!template) return null;
  return { ...template, matchReason: reason };
}

/** Structured trace log for debugging resolution decisions. */
function _trace(reason, template, { schoolId, classId, studentId } = {}) {
  logger.info('[TemplateResolver] Template resolved', {
    matchReason:  reason,
    templateId:   template?._id,
    templateName: template?.name,
    classGroupName: template?.classGroupName || null,
    classRangeFrom: template?.classRangeFrom ?? null,
    classRangeTo:   template?.classRangeTo   ?? null,
    schoolId,
    classId:   classId  || null,
    studentId: studentId || null,
  });
}

module.exports = { resolveTemplate, resolveTemplateForStudent };
