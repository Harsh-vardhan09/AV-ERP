/**
 * Dynamic Report Controller
 *
 * Handles report generation, preview, and download using dynamic templates.
 */

const path = require('path');
// Synchronous on purpose. This was an async wrapper around a dynamic import(),
// and every call site used it WITHOUT await — so `reportId` was assigned a
// Promise and Mongoose threw "Cast to string failed ... (type Promise) at path
// reportId", breaking the download for admin, teacher and student alike.
//
// Node's own randomUUID, not the `uuid` package: uuid@13 is ESM-only, so a plain
// require() of it only works on Node >=22.12 and throws ERR_REQUIRE_ESM on Node 20
// — and nothing here pins a Node version (no engines field, no .nvmrc, no
// NODE_VERSION on Render), so that would risk the API failing to boot at all.
// randomUUID is built in since Node 14.17 and emits the same UUIDv4 format.
const { randomUUID: uuidv4 } = require('crypto');

const ReportTemplate = require('../models/ReportTemplate');
const GeneratedReport = require('../models/GeneratedReport');
const StudentProfile = require('../../people').StudentProfile;
const { AcademicSession } = require('../../academics');
const { Exam } = require('../../examination');
const ReportCard = require('../models/ReportCard');

const DataAggregatorService = require('../services/dataAggregatorService');
const TemplateParserService = require('../services/templateParserService');
const PDFService = require('../../../core/pdf/htmlToPdf.js');
const { resolveTemplateForStudent } = require('../services/templateResolver');
const { getExamReadiness } = require('../../examination').marksReadinessService;
const logger = require('../../../core/logging/logger.js');
const { serviceError } = require('../lib/respond');

const OUTPUT_DIR = path.join(__dirname, '../../../../output/reports');

/**
 * Convert a value to a safe Number for Mongoose Number fields.
 * Returns null for "N/A", undefined, or non-numeric strings.
 */
const toSafeNumber = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && isFinite(v)) return v;
  const n = Number(v);
  return isFinite(n) ? n : null;
};

/**
 * Build a dataSnapshot that is safe to save in GeneratedReport.
 * All Number-typed sub-fields are sanitized via toSafeNumber().
 */
const sanitizeSnapshot = (data) => ({
  subjects: (data.subjects || []).map((s) => ({
    name: s.name || '',
    theory: toSafeNumber(s.obt_theory ?? s.theory),
    project: toSafeNumber(s.obt_practical ?? s.project),
    total: toSafeNumber(s.total),
    grade: s.grade || '',
  })),
  grandTotal: toSafeNumber(data.grandTotal),
  totalPercentage: toSafeNumber(data.totalPercentage),
  totalGrade: data.totalGrade || '',
  rank: toSafeNumber(data.rank),
});

/**
 * Generate report for a single student
 * POST /api/dynamic-reports/generate
 */
exports.generateReport = async (req, res) => {
  const startTime = Date.now();

  try {
    const { studentId, templateId, academicYear, examType = 'annual' } = req.body;

    if (!studentId || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'studentId and academicYear are required',
      });
    }

    const schoolId = req.schoolId;
    const userId = req.user._id;

    const session = await AcademicSession.findOne({
      $or: [{ year: academicYear }, { name: academicYear }],
      schoolId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Academic session not found: ${academicYear}`,
      });
    }

    // Template Resolution (single source of truth via templateResolver)
    // Priority: explicit templateId → exact class → smallest range → default → any
    const template = await resolveTemplateForStudent({
      studentId,
      schoolId,
      examType,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message:
          "No template found for this student's class. Please create a template for the class group.",
      });
    }

    const student = await StudentProfile.findOne({
      _id: studentId,
      schoolId,
    }).select('firstName lastName scholarNo rollNo');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Aggregate ALL exams — rank is computed inside the aggregator now
    const data = await DataAggregatorService.getStudentSnapshot({
      studentId,
      schoolId,
      sessionId: session._id,
      examType,
    });

    const fileName = `${student.firstName}_${student.lastName}_${academicYear}_${examType}.pdf`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');

    // TemplateParserService.render() runs ONCE inside this call — rendering again
    // here double-wraps the document and breaks @page
    const pdfResult = await PDFService.generateFromTemplate({
      template: template.htmlContent,
      data,
      css: template.cssContent,
      fileName,
      outputDir: OUTPUT_DIR,
      options: {
        format: template.config?.pageSize || 'A4',
        margin: {
          top: `${template.config?.marginTop || 10}mm`,
          right: `${template.config?.marginRight || 10}mm`,
          bottom: `${template.config?.marginBottom || 10}mm`,
          left: `${template.config?.marginLeft || 10}mm`,
        },
      },
    });

    if (!pdfResult.success) {
      return res.status(500).json({
        success: false,
        message: 'PDF generation failed',
        error: pdfResult.error,
      });
    }

    // Upsert the report record — regeneration must NEVER crash with E11000.
    // The unique index is on: schoolId+studentId+academicYear+examType+templateId+isDeleted.
    // We use findOneAndUpdate with upsert:true so re-generating a report simply
    // overwrites the previous record with the fresh PDF path and data snapshot.
    const reportId = uuidv4(); // unique ID for this report record (used in download URL on first insert)
    const upsertFilter = {
      schoolId,
      studentId,
      academicYear,
      examType,
      templateId: template._id,
      isDeleted: false,
    };

    const upsertDoc = {
      $set: {
        studentName: `${student.firstName} ${student.lastName}`.trim(),
        scholarNo: student.scholarNo,
        rollNo: student.rollNo,
        className: data.className || data.class,
        sectionName: data.sectionName || data.section,
        templateName: template.name,
        sessionId: session._id,
        fileName: pdfResult.fileName,
        filePath: pdfResult.filePath,
        fileSize: pdfResult.size,
        generationTime: Date.now() - startTime,
        generatedBy: userId,
        generatedByName: req.user.name || req.user.email,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        dataSnapshot: sanitizeSnapshot(data),
        missingFields: pdfResult.missingFields || [],
        status: 'completed',
        // Always refresh reportId + fileUrl so the download URL stays valid
        // even when re-generating an existing report (was $setOnInsert before)
        reportId,
        fileUrl: `/api/v1/dynamic-reports/download/${reportId}`,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

    const savedReport = await GeneratedReport.findOneAndUpdate(upsertFilter, upsertDoc, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    // Use the persisted reportId (may differ from generated one if record already existed)
    const persistedReportId = savedReport.reportId || reportId;

    // Update template usage stats (use direct update — resolver may return a lean object)
    await ReportTemplate.findByIdAndUpdate(template._id, {
      $inc: { usageCount: 1 },
      $set: { lastUsedAt: new Date() },
    });

    const totalDuration = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'Report generated successfully',
      data: {
        reportId: persistedReportId,
        fileName: pdfResult.fileName,
        downloadUrl: `/api/v1/dynamic-reports/download/${persistedReportId}`,
        previewUrl: `/api/v1/dynamic-reports/preview/${studentId}`,
        generationTime: totalDuration,
        renderTime: pdfResult.renderTime,
        pdfGenerationTime: pdfResult.generationTime,
        missingFields: pdfResult.missingFields || [],
        fileSize: pdfResult.size,
      },
    });
  } catch (error) {
    return serviceError(res, '[DynamicReport] Generate error:', error);
  }
};

/**
 * Generate reports for multiple students (bulk)
 * POST /api/dynamic-reports/generate-bulk
 */
exports.generateBulkReports = async (req, res) => {
  try {
    const { studentIds, templateId, academicYear, examType = 'annual' } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'studentIds array is required',
      });
    }

    // Limit batch size
    if (studentIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 students allowed per batch',
      });
    }

    const schoolId = req.schoolId;
    const userId = req.user._id;

    const session = await AcademicSession.findOne({
      $or: [{ year: academicYear }, { name: academicYear }],
      schoolId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Academic session not found: ${academicYear}`,
      });
    }

    // Per-student template resolution
    // NOTE: In bulk mode, each student can get a DIFFERENT template based on their
    // class group. This is intentional — a Class 5 student gets the Primary template
    // while a Class 10 student gets the Secondary template in the same bulk job.
    const results = [];
    const errors = [];

    for (const studentId of studentIds) {
      try {
        const template = await resolveTemplateForStudent({
          studentId,
          schoolId,
          examType,
        });

        if (!template) {
          errors.push({
            studentId,
            status: 'error',
            error: "No template matched for this student's class",
          });
          continue;
        }
        // Aggregate ALL exams — rank computed inside aggregator
        const data = await DataAggregatorService.getStudentSnapshot({
          studentId,
          schoolId,
          sessionId: session._id,
          examType,
        });

        // Render + Generate PDF (single render pass)
        const pdfResult = await PDFService.generateFromTemplate({
          template: template.htmlContent,
          data,
          css: template.cssContent,
          outputDir: OUTPUT_DIR,
          options: {
            format: template.config?.pageSize || 'A4',
            margin: {
              top: `${template.config?.marginTop || 10}mm`,
              right: `${template.config?.marginRight || 10}mm`,
              bottom: `${template.config?.marginBottom || 10}mm`,
              left: `${template.config?.marginLeft || 10}mm`,
            },
          },
        });

        if (pdfResult.success) {
          const reportId = uuidv4();
          // Upsert — re-generating bulk reports must never crash with E11000
          const bulkUpsertFilter = {
            schoolId,
            studentId,
            academicYear,
            examType,
            templateId: template._id,
            isDeleted: false,
          };
          const bulkSaved = await GeneratedReport.findOneAndUpdate(
            bulkUpsertFilter,
            {
              $set: {
                studentName: data.name || 'Unknown',
                scholarNo: data.scholarNo,
                rollNo: data.rollNo,
                className: data.className,
                sectionName: data.sectionName,
                templateName: template.name,
                sessionId: session._id,
                fileName: pdfResult.fileName,
                filePath: pdfResult.filePath,
                fileSize: pdfResult.size,
                generationTime: pdfResult.generationTime || 0,
                generatedBy: userId,
                dataSnapshot: sanitizeSnapshot(data),
                missingFields: pdfResult.missingFields || [],
                status: 'completed',
                // Always refresh so download URL is valid on re-generation
                reportId,
                fileUrl: `/api/v1/dynamic-reports/download/${reportId}`,
                updatedAt: new Date(),
              },
              $setOnInsert: {
                createdAt: new Date(),
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          const persistedReportId = bulkSaved.reportId || reportId;

          results.push({
            studentId,
            reportId: persistedReportId,
            fileName: pdfResult.fileName,
            status: 'success',
          });
        } else {
          errors.push({
            studentId,
            status: 'error',
            error: pdfResult.error,
          });
        }
      } catch (error) {
        errors.push({
          studentId,
          status: 'error',
          error: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Generated ${results.length} reports, ${errors.length} failed`,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    return serviceError(res, '[DynamicReport] Bulk generate error:', error);
  }
};

/**
 * Preview report for a student (returns HTML)
 * GET /api/dynamic-reports/preview/:studentId
 */
exports.previewReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { templateId, academicYear, examType = 'annual' } = req.query;

    const schoolId = req.schoolId;

    // A student may only preview their OWN card. Without this, any logged-in
    // student could read a classmate's report card by swapping the URL id.
    if (req.user.role === 'student') {
      const own = await StudentProfile.findOne({ userId: req.user._id, schoolId })
        .select('_id')
        .lean();
      if (!own || String(own._id) !== String(studentId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    const session = await AcademicSession.findOne({
      $or: [{ year: academicYear }, { name: academicYear }],
      schoolId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Academic session not found: ${academicYear}`,
      });
    }
    // templateId is read-only (const from req.query destructure). Use a local alias.
    const resolvedTemplateId = templateId || null;

    // Template Resolution (single source of truth via templateResolver)
    const template = await resolveTemplateForStudent({
      studentId,
      schoolId,
      examType,
      templateId: resolvedTemplateId || null,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "No template found for this student's class.",
      });
    }

    // Aggregate ALL exams — rank now computed inside aggregator
    const data = await DataAggregatorService.getStudentSnapshot({
      studentId,
      schoolId,
      sessionId: session._id,
      examType,
    });

    // Render: single shared pipeline (Preview ≡ PDF)
    const previewHtml = TemplateParserService.preview(template.htmlContent, data, {
      css: template.cssContent || '',
    });

    res.setHeader('Content-Type', 'text/html');
    return res.send(previewHtml);
  } catch (error) {
    return serviceError(res, '[DynamicReport] Preview error:', error);
  }
};

/**
 * Download generated report
 * GET /api/dynamic-reports/download/:reportId
 */
exports.downloadReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const schoolId = req.schoolId;
    const userId = req.user._id;

    // Find report
    const report = await GeneratedReport.findOne({
      reportId,
      schoolId,
      isDeleted: false,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Update download stats
    report.downloadCount += 1;
    report.lastDownloadedAt = new Date();
    report.lastDownloadedBy = userId;
    await report.save();

    // Send file
    return res.download(report.filePath, report.fileName, (err) => {
      if (err) {
        logger.error('[DynamicReport] Download error:', err);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'Error downloading file',
          });
        }
      }
    });
  } catch (error) {
    return serviceError(res, '[DynamicReport] Download error:', error);
  }
};

/**
 * Get generated reports list
 * GET /api/dynamic-reports
 */
exports.getReports = async (req, res) => {
  try {
    const { page = 1, limit = 20, studentId, academicYear, examType } = req.query;

    const schoolId = req.schoolId;

    // Build query
    const query = {
      schoolId,
      isDeleted: false,
    };

    if (studentId) query.studentId = studentId;
    if (academicYear) query.academicYear = academicYear;
    if (examType) query.examType = examType;

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      GeneratedReport.find(query)
        .populate('studentId', 'firstName lastName scholarNo rollNo')
        .populate('templateId', 'name')
        .populate('generatedBy', 'firstName lastName email')
        .sort({ generatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      GeneratedReport.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    return serviceError(res, '[DynamicReport] Get reports error:', error);
  }
};

/**
 * Delete generated report (soft delete)
 * DELETE /api/dynamic-reports/:reportId
 */
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const schoolId = req.schoolId;
    const userId = req.user._id;

    const report = await GeneratedReport.findOne({
      reportId,
      schoolId,
      isDeleted: false,
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    report.isDeleted = true;
    report.deletedAt = new Date();
    report.deletedBy = userId;
    await report.save();

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    return serviceError(res, '[DynamicReport] Delete error:', error);
  }
};

/**
 * Get report statistics
 * GET /api/dynamic-reports/stats
 */
exports.getStats = async (req, res) => {
  try {
    const schoolId = req.schoolId;

    const stats = await GeneratedReport.aggregate([
      {
        $match: {
          schoolId: schoolId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          totalDownloads: { $sum: '$downloadCount' },
          avgGenerationTime: { $avg: '$generationTime' },
          lastGenerated: { $max: '$generatedAt' },
        },
      },
    ]);

    const byExamType = await GeneratedReport.aggregate([
      {
        $match: {
          schoolId: schoolId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$examType',
          count: { $sum: 1 },
        },
      },
    ]);

    const byAcademicYear = await GeneratedReport.aggregate([
      {
        $match: {
          schoolId: schoolId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$academicYear',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        overall: stats[0] || {
          totalReports: 0,
          totalDownloads: 0,
          avgGenerationTime: 0,
          lastGenerated: null,
        },
        byExamType,
        byAcademicYear,
      },
    });
  } catch (error) {
    return serviceError(res, '[DynamicReport] Stats error:', error);
  }
};

/**
 * Validate a template against real student data — dry render, no PDF generated.
 * POST /api/dynamic-reports/validate
 *
 * Body: { studentId, templateId, academicYear, examType? }
 *
 * Returns:
 *   missingFields   — template placeholders with no data value
 *   availableFields — placeholders that resolved successfully
 *   debug           — dataKeyCount, templateFieldCount, subjectCount
 *   coveragePct     — % of template fields that resolved
 */
exports.validateTemplate = async (req, res) => {
  try {
    const { studentId, templateId, academicYear, examType = 'annual' } = req.body;
    const schoolId = req.schoolId;

    if (!studentId || !academicYear) {
      return res
        .status(400)
        .json({ success: false, message: 'studentId and academicYear are required' });
    }

    const session = await AcademicSession.findOne({
      $or: [{ year: academicYear }, { name: academicYear }],
      schoolId,
    });
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: `Session not found: ${academicYear}` });

    // Resolve template
    let template;
    if (templateId) {
      template = await ReportTemplate.findOne({ _id: templateId, schoolId, isActive: true });
    } else {
      template = await ReportTemplate.findOne({ schoolId, isActive: true, isDefault: true });
    }
    if (!template)
      return res.status(404).json({ success: false, message: 'No active template found' });

    // Aggregate data
    const data = await DataAggregatorService.getStudentSnapshot({
      studentId,
      schoolId,
      sessionId: session._id,
      examType,
    });

    // Dry render — use render() not preview() so we get JSON back (not HTML)
    const TemplateFieldExtractor = require('../services/templateFieldExtractor');
    const renderResult = TemplateParserService.render(template.htmlContent, data);

    // Extract all template fields for comparison
    const extracted = TemplateFieldExtractor.extractFields(template.htmlContent);
    const allTemplateFields = extracted.fields.map((f) => f.name);

    const missingSet = new Set(renderResult.missingFields);
    const availableFields = allTemplateFields.filter((f) => !missingSet.has(f));

    const totalFields = allTemplateFields.length;
    const resolvedCount = availableFields.length;
    const coveragePct = totalFields > 0 ? Math.round((resolvedCount / totalFields) * 100) : 100;

    // Subject-level field audit
    const subjectAudit = (data.subjects || []).map((s) => ({
      name: s.name,
      idSlug: s.idSlug || '',
      components: s._components || [],
      total: s.total,
      grandMax: s.grandMax,
    }));

    logger.debug(
      `[Validate] Template "${template.name}" | Fields: ${totalFields} | Resolved: ${resolvedCount} | Missing: ${renderResult.missingFields.length}`
    );

    return res.status(200).json({
      success: true,
      data: {
        templateName: template.name,
        missingFields: renderResult.missingFields,
        availableFields,
        coveragePct,
        debug: {
          ...renderResult.debug,
          subjectCount: (data.subjects || []).length,
          templateFields: totalFields,
          resolvedCount,
        },
        subjectAudit,
      },
    });
  } catch (error) {
    logger.error('[DynamicReport] Validate error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// STUDENT SELF-SERVICE REPORT CARD
//
// SECURITY: the student is resolved from req.user._id (set by varifyToken from
// the signed JWT) and nothing else. No studentId is read from params, query or
// body on these routes, so there is no path by which a client-supplied id can
// select another student's data. Every query is additionally scoped to
// req.schoolId.

/** Filesystem-safe filename segment. */
const _slug = (s) =>
  String(s || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');

/**
 * Resolve, gate and render the logged-in student's own report card.
 *
 * Shared by the JSON and PDF endpoints so both serve byte-identical markup —
 * what the student sees on screen is exactly what they download.
 *
 * @returns {Promise<{status:number, published:boolean, ...}>}
 */
async function _buildOwnReportCard(req) {
  const schoolId = req.schoolId;

  // 1. Student identity — from the auth token ONLY
  const student = await StudentProfile.findOne({ userId: req.user._id, schoolId })
    .populate('userId', 'firstName lastName email')
    .populate('classId', 'name numericOrder')
    .populate('sectionId', 'name')
    .populate('session', 'name isActive')
    .lean();

  if (!student) {
    return {
      status: 404,
      published: false,
      reason: 'No student profile is linked to your account.',
    };
  }

  // 2. Session — client may choose, but only within their own school
  let session = null;
  if (req.query.session) {
    session = await AcademicSession.findOne({ _id: req.query.session, schoolId }).lean();
    if (!session) {
      return { status: 404, published: false, reason: 'Academic session not found.' };
    }
  } else {
    session =
      (await AcademicSession.findOne({
        _id: student.session?._id || student.session,
        schoolId,
      }).lean()) || (await AcademicSession.findOne({ isActive: true, schoolId }).lean());
  }
  if (!session) {
    return { status: 400, published: false, reason: 'No active academic session.' };
  }

  const classId = student.classId?._id || student.classId;
  if (!classId) {
    return { status: 400, published: false, reason: 'You are not assigned to a class yet.' };
  }

  // 3. Which exams does this card cover?
  const examFilter = { classIds: classId, session: session._id, schoolId };
  if (req.query.examId) examFilter._id = req.query.examId;

  const exams = await Exam.find(examFilter)
    .select('name type startDate')
    .sort({ startDate: 1, createdAt: 1 })
    .lean();

  if (!exams.length) {
    return {
      status: 200,
      published: false,
      reason: req.query.examId
        ? 'That exam is not available for your class.'
        : 'No exams have been scheduled for your class yet.',
      student,
      session,
    };
  }

  // 4. Readiness gate (Part 2)
  // A finalized report card is an explicit admin sign-off, which outranks the
  // computed readiness check.
  const reportCard = await ReportCard.findOne({
    studentId: student._id,
    session: session._id,
    schoolId,
  })
    .select('isFinalized')
    .lean();

  if (!reportCard?.isFinalized) {
    const readiness = await Promise.all(
      exams.map(async (exam) => ({
        examName: exam.name,
        // Student scope, not class scope: this gates ONE student's card. The
        // class-level answer ("someone uploaded for this subject") let a student
        // with no marks of their own through to a blank report.
        ...(await getExamReadiness({
          examId: exam._id,
          classId,
          sectionId: student.sectionId?._id || student.sectionId || null,
          schoolId,
          sessionId: session._id,
          // From the profile already resolved for this caller, never from the
          // request — studentReportCardAccess.check.js enforces that, since a
          // request-supplied studentId here would be a horizontal-privilege hole.
          studentId: student.userId,
          studentProfileId: student._id,
        })),
      }))
    );

    // Exams with no configured subjects can't be assessed — ignore them rather
    // than letting an unconfigured exam block the student forever.
    const pending = readiness.filter((r) => r.totalSubjects > 0 && !r.ready);

    if (pending.length) {
      const totalSubjects = readiness.reduce((n, r) => n + r.totalSubjects, 0);
      const submittedCount = readiness.reduce((n, r) => n + r.submittedCount, 0);
      return {
        status: 200,
        published: false,
        reason: 'Your report card has not been published yet. Marks entry is still in progress.',
        student,
        session,
        progress: {
          totalSubjects,
          submittedCount,
          percentComplete: totalSubjects ? Math.round((submittedCount / totalSubjects) * 100) : 0,
          // Exam names only — never the specific subjects or teachers still
          // outstanding, which is staff-facing information.
          pendingExams: pending.map((r) => r.examName),
        },
      };
    }
  }

  // 5. Resolve the template (honours the school's selected template)
  const examType = exams.length === 1 ? exams[0].type || 'annual' : 'annual';
  const template = await resolveTemplateForStudent({
    studentId: student._id,
    schoolId,
    examType,
  });

  if (!template) {
    return {
      status: 404,
      published: false,
      student,
      session,
      reason: 'Your school has not set up a report card template yet.',
    };
  }

  // 6. Aggregate + render (school logo arrives via the aggregator)
  const data = await DataAggregatorService.getStudentSnapshot({
    studentId: student._id,
    schoolId,
    sessionId: session._id,
    examType,
  });

  const rendered = TemplateParserService.renderFinalHTML(
    template.htmlContent,
    data,
    template.cssContent || ''
  );

  if (!rendered.success) {
    return { status: 500, published: false, reason: 'Report card could not be rendered.' };
  }

  const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ');
  const examLabel = req.query.examId ? exams[0].name : session.name || 'Report_Card';

  return {
    status: 200,
    published: true,
    html: rendered.html,
    css: template.cssContent || '',
    template,
    student,
    session,
    exams,
    studentName,
    examLabel,
    fileName: `${_slug(studentName)}_${_slug(examLabel)}_ReportCard.pdf`,
  };
}

/**
 * The logged-in student's own report card, rendered.
 * GET /api/v1/dynamic-reports/my-report-card?examId=&session=
 *
 * Returns 200 with `published: false` for the not-yet-published state — that
 * is a valid answer, not an error.
 */
exports.getMyReportCard = async (req, res) => {
  try {
    const result = await _buildOwnReportCard(req);

    const studentSummary = result.student
      ? {
          name: [result.student.firstName, result.student.lastName].filter(Boolean).join(' '),
          rollNo: result.student.rollNo,
          className: result.student.classId?.name || '',
          section: result.student.sectionId?.name || '',
        }
      : null;

    if (!result.published) {
      return res.status(result.status).json({
        success: result.status === 200,
        message: result.reason,
        data: {
          published: false,
          reason: result.reason,
          progress: result.progress || null,
          student: studentSummary,
          session: result.session ? { _id: result.session._id, name: result.session.name } : null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        published: true,
        html: result.html,
        css: result.css,
        template: { _id: result.template._id, name: result.template.name },
        student: studentSummary,
        session: { _id: result.session._id, name: result.session.name },
        exams: result.exams.map((e) => ({ _id: e._id, name: e.name, type: e.type })),
        examLabel: result.examLabel,
        fileName: result.fileName,
      },
    });
  } catch (error) {
    logger.error('[DynamicReport] getMyReportCard error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Download the same rendered report card as a PDF.
 * GET /api/v1/dynamic-reports/my-report-card/download?examId=&session=
 *
 * Streams the buffer rather than writing to disk — the admin generate path
 * persists to OUTPUT_DIR, which is not writable on serverless deploys.
 */
exports.downloadMyReportCard = async (req, res) => {
  try {
    const result = await _buildOwnReportCard(req);

    if (!result.published) {
      // 403 when the card exists but isn't published yet; pass through real
      // 404/400s unchanged.
      return res.status(result.status === 200 ? 403 : result.status).json({
        success: false,
        message: result.reason,
      });
    }

    const cfg = result.template.config || {};
    const pdf = await PDFService.generatePDF({
      html: result.html, // identical markup to the on-screen version
      css: result.css,
      options: {
        format: cfg.pageSize || 'A4',
        margin: {
          top: `${cfg.marginTop ?? 10}mm`,
          right: `${cfg.marginRight ?? 10}mm`,
          bottom: `${cfg.marginBottom ?? 10}mm`,
          left: `${cfg.marginLeft ?? 10}mm`,
        },
      },
    });

    if (!pdf.success) {
      logger.error('[DynamicReport] Student PDF failed:', pdf.error);
      // A missing browser is an operational fault, not a bad report card. It used
      // to collapse into the same opaque 500 as a template error, which is why a
      // broken download gave no clue what was wrong.
      if (pdf.code === 'PDF_RENDERER_UNAVAILABLE') {
        return res.status(503).json({
          success: false,
          code: pdf.code,
          message: 'PDF rendering is temporarily unavailable. Please contact your administrator.',
        });
      }
      return res.status(500).json({ success: false, message: 'Could not generate the PDF.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    res.setHeader('Content-Length', pdf.buffer.length);
    return res.send(pdf.buffer);
  } catch (error) {
    logger.error('[DynamicReport] downloadMyReportCard error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
