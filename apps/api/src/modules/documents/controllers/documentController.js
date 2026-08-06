const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const PDFDocument = require('pdfkit');
const SchoolCertificate = require('../models/SchoolCertificate');
// TEMP: StudentProfile/School move to modules/people, templateEngine to modules/academics
const StudentProfile    = require('../../../../src-old/models/StudentProfile');
const School            = require('../../tenancy').School;
const DocumentTemplate  = require('../models/DocumentTemplate');
const { buildStudentData } = require('../../../../src-old/utils/templateEngine');
const { uploadImageToCloud } = require('../../../core/config/storage');
const { renderCertificateHtml, DEFAULT_TC_LAYOUT, DEFAULT_MIGRATION_LAYOUT } = require('../lib/htmlCertificateRenderer');
const { generatePdfFromHtml } = require('../../../core/pdf/puppeteerPdf');
const logger = require('../../../core/logging/logger');

const DOC_TYPES = SchoolCertificate.DOC_TYPES;
// TEMP: still the src-old upload dir. __dirname moved two levels deeper in this
// migration, so the extra hops keep generated PDFs at their original path
const CERT_PDF_DIR = path.join(__dirname, '..', '..', '..', '..', 'src-old', 'uploads', 'certificates');

// SMALL UTILITIES

const dayOrdinal = (d) => {
  if (d > 3 && d < 21) return `${d}th`;
  switch (d % 10) {
    case 1: return `${d}st`;
    case 2: return `${d}nd`;
    case 3: return `${d}rd`;
    default: return `${d}th`;
  }
};

const formatDobLong = (dob) => {
  if (!dob) return '';
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return '';
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${dayOrdinal(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const buildAddressLine = (profile) => {
  const parts = [
    profile.address,
    profile.addressLine2,
    profile.city    && `P.O.- ${profile.city}`,
    profile.state   && `P.S.- ${profile.state}`,
    profile.pincode && `PIN- ${profile.pincode}`,
  ].filter(Boolean);
  return parts.join(', ').replace(/\s+/g, ' ').trim();
};

/** Extract raw photo URL from student documents field (handles string / {url} / {secure_url}). */
const extractPhotoRawFromDocuments = (documents) => {
  if (!documents) return '';
  if (typeof documents.photo === 'string' && documents.photo.trim()) return documents.photo.trim();
  if (documents.photo && typeof documents.photo === 'object') {
    if (typeof documents.photo.url === 'string'        && documents.photo.url.trim())        return documents.photo.url.trim();
    if (typeof documents.photo.secure_url === 'string' && documents.photo.secure_url.trim()) return documents.photo.secure_url.trim();
  }
  if (typeof documents.photoUrl === 'string' && documents.photoUrl.trim()) return documents.photoUrl.trim();
  return '';
};

const publicRequestOrigin = (req) => {
  const envBase = process.env.PUBLIC_SERVER_URL || process.env.API_PUBLIC_URL;
  if (envBase && /^https?:\/\//i.test(String(envBase).trim())) {
    return String(envBase).trim().replace(/\/$/, '');
  }
  const forwarded = req.get('x-forwarded-host');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
  if (forwarded) return `${proto}://${forwarded}`.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`.replace(/\/$/, '');
};

const toAbsoluteAssetUrl = (maybeRelative, req) => {
  if (!maybeRelative || typeof maybeRelative !== 'string') return '';
  const u = maybeRelative.trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  const base = publicRequestOrigin(req);
  const path = u.startsWith('/') ? u : `/${u}`;
  return `${base}${path}`;
};

// CERTIFICATE DATA BUILDERS

const buildSharedStudentCertificateFields = (profile, req) => {
  const rawPhoto = extractPhotoRawFromDocuments(profile.documents);
  const photoUrl = toAbsoluteAssetUrl(rawPhoto, req);
  return {
    studentName: [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ').trim(),
    studentCode: profile.studentId || profile.admissionNumber || profile.rollNo || '',
    pen:         profile.pen || '',
    fatherName:  profile.parentDetails?.father?.name || '',
    motherName:  profile.parentDetails?.mother?.name || '',
    address:     buildAddressLine(profile),
    district:    profile.city || profile.state || '',
    dateOfBirthFormatted: formatDobLong(profile.dateOfBirth),
    nationality: profile.nationality || 'Indian',
    religion:    profile.religion || '',
    photoUrl,
    photo: photoUrl,
  };
};

const buildSchoolSnapshotFromDb = (school, req) => {
  if (!school) return {};
  const s = school.toObject ? school.toObject() : school;
  const locParts = [];
  if (s.certBlockMunicipality) locParts.push(`BLOCK/ MUNC./ CORP. : ${s.certBlockMunicipality}`);
  if (s.certCircle)            locParts.push(`CIRCLE : ${s.certCircle}`);
  if (s.certDistrict)          locParts.push(`DIST. : ${s.certDistrict}`);
  if (s.certPin)               locParts.push(`PIN : ${s.certPin}`);
  const logoRaw = s.logoUrl || '';
  return {
    schoolName:        s.name || '',
    udiseCode:         s.udiseCode || '',
    schoolLocationLine: locParts.join(', '),
    logoUrl:           req ? toAbsoluteAssetUrl(logoRaw, req) : logoRaw,
  };
};

const buildTcDefaults = (profile, req) => {
  const shared = buildSharedStudentCertificateFields(profile, req);
  const rawClassName = profile.classId?.name || '';
  const classLabel   = rawClassName.replace(/^class\s+/i, '').trim();
  const sessionName  = profile.session?.name || '';
  const lastClassAttended = classLabel
    ? `CLASS ${classLabel}${sessionName ? ` (Academic Session: ${sessionName})` : ''}`
    : '';
  return {
    ...shared,
    lastClassPassed:         profile.previousClass ? profile.previousClass.toUpperCase() : '',
    lastClassAttended:       lastClassAttended.toUpperCase(),
    reasonForTransfer:       '',
    certificationStatementDate: '',
    issueFooterDate:         '',
    acknowledgementDate:     '',
  };
};

const buildMigrationDefaults = (profile, req) => {
  const shared = buildSharedStudentCertificateFields(profile, req);
  const rawClassName = profile.classId?.name || '';
  const classLabel   = rawClassName.replace(/^class\s+/i, '').trim();
  const sessionName  = profile.session?.name || '';
  return {
    ...shared,
    lastClassAttended: classLabel
      ? `CLASS ${classLabel}${sessionName ? ` (Session: ${sessionName})` : ''}`.toUpperCase()
      : '',
    conduct:       'Good',
    whetherPassed: 'Yes',
    dateOfLeaving: '',
    remarks:       '',
    issueDate:     '',
  };
};

const mergeFlat = (defaults, saved) => {
  const out = { ...defaults };
  if (!saved || typeof saved !== 'object') return out;
  for (const key of Object.keys(saved)) {
    if (saved[key] !== undefined) out[key] = saved[key];
  }
  return out;
};

const mergeSchoolSnapshot = (live, saved, req) => {
  const liveSnap = buildSchoolSnapshotFromDb(live, req);
  if (saved && typeof saved === 'object' && Object.keys(saved).length) {
    return { ...liveSnap, ...saved };
  }
  return liveSnap;
};

const assertType = (type) => DOC_TYPES.includes(type);
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const pushAuditLog = (doc, action, actor, changes = {}) => {
  const logs = Array.isArray(doc.auditLogs) ? doc.auditLogs : [];
  logs.push({ action, actor, at: new Date(), changes });
  doc.auditLogs = logs.slice(-50);
};

const sanitizeFieldForRender = (f = {}) => ({
  key: String(f.key || ''),
  xPercent: Math.min(100, Math.max(0, Number(f.xPercent) || 0)),
  yPercent: Math.min(100, Math.max(0, Number(f.yPercent) || 0)),
  fontSize: Math.min(72, Math.max(6, Number(f.fontSize) || 14)),
  fontWeight: f.fontWeight || 'normal',
  color: f.color || '#000000',
  fontFamily: f.fontFamily || 'Arial',
  width: Math.min(1200, Math.max(60, Number(f.width) || 200)),
  alignment: ['left', 'center', 'right'].includes(f.alignment) ? f.alignment : 'left',
  maxLines: Math.min(8, Math.max(1, Number(f.maxLines) || 2)),
});

const fetchBufferFromUrl = (url) => new Promise((resolve, reject) => {
  const lib = String(url).startsWith('https') ? https : http;
  lib.get(url, (resp) => {
    if (resp.statusCode !== 200) {
      return reject(new Error(`Failed to fetch template asset: HTTP ${resp.statusCode}`));
    }
    const chunks = [];
    resp.on('data', (chunk) => chunks.push(chunk));
    resp.on('end', () => resolve(Buffer.concat(chunks)));
  }).on('error', reject);
});

/**
 * Render a certificate PDF and write it to disk (overlay / legacy path).
 * Uses PDFKit: image background + properly positioned text.
 */
const renderCertificatePdfToFile = async ({ snapshot, outputPath }) => {
  ensureDir(path.dirname(outputPath));
  const templateSnapshot = snapshot?.templateSnapshot || {};
  const data             = snapshot?.studentData     || {};
  const w = Number(templateSnapshot.imageWidth)  || 794;
  const h = Number(templateSnapshot.imageHeight) || 1123;
  const fields = Array.isArray(templateSnapshot.fields) ? templateSnapshot.fields : [];

  const doc    = new PDFDocument({ size: [w, h], margin: 0 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  if (templateSnapshot.templateImageUrl) {
    try {
      const img = await fetchBufferFromUrl(templateSnapshot.templateImageUrl);
      doc.image(img, 0, 0, { width: w, height: h });
    } catch (e) {
      logger.warn('renderCertificatePdfToFile: could not fetch template image', e.message);
    }
  }

  const FONT_MAP = {
    'Times New Roman': 'Times-Roman',
    'Courier New':     'Courier',
    'Georgia':         'Times-Roman',
    'Verdana':         'Helvetica',
  };

  for (const rawField of fields) {
    const field = sanitizeFieldForRender(rawField);
    const text  = (data[field.key] === undefined || data[field.key] === null) ? '' : String(data[field.key]);
    const x     = (field.xPercent / 100) * w;
    const y     = (field.yPercent / 100) * h;          // top of text box — no bogus offset
    const font  = FONT_MAP[field.fontFamily] || 'Helvetica';
    const bold  = ['bold', '700', '800', '600'].includes(String(field.fontWeight))
      ? (font === 'Helvetica' ? 'Helvetica-Bold' : `${font}-Bold`)
      : font;
    const safeBold = bold.includes('-Bold') && [
      'Helvetica-Bold','Times-Bold','Courier-Bold',
    ].includes(bold) ? bold : font;

    doc
      .font(safeBold)
      .fontSize(field.fontSize)
      .fillColor(field.color || '#000000')
      .text(text, x, Math.max(0, y), {
        width:     field.width,
        align:     field.alignment,
        lineBreak: field.maxLines > 1,
        height:    field.maxLines * (field.fontSize + 3),
        ellipsis:  false,
      });
  }

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error',  reject);
  });
};

/**
 * Generate a PDF Buffer using Puppeteer (structured layout mode).
 * No disk write — returns raw bytes for streaming.
 */
const renderStructuredPdfBuffer = async ({ layout, sections, data, schoolSnapshot, certNumber, type }) => {
  const html = renderCertificateHtml({ layout, sections, data, schoolSnapshot, certNumber, type });
  return generatePdfFromHtml(html);
};

// DOCUMENT CRUD ENDPOINTS

exports.getDocument = async (req, res) => {
  try {
    const { type, studentId } = req.params;
    if (!assertType(type)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const profile = await StudentProfile.findOne({ _id: studentId, schoolId: req.schoolId })
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const school = await School.findById(req.schoolId);
    const doc    = await SchoolCertificate.findOne({ schoolId: req.schoolId, studentId, type }).lean();

    const defaults       = type === 'TC' ? buildTcDefaults(profile, req) : buildMigrationDefaults(profile, req);
    const schoolSnapshot = mergeSchoolSnapshot(school, doc?.schoolSnapshot, req);
    const mergedData     = mergeFlat(defaults, doc?.editedData || doc?.data);

    // Photo: unlocked → live photo; locked → frozen snapshot
    if (doc?.isLocked && doc?.data?.photoUrl) {
      mergedData.photoUrl = doc.data.photoUrl;
    } else {
      mergedData.photoUrl = defaults.photoUrl;
    }
    mergedData.photo = mergedData.photoUrl || '';

    const dataEnvelope = {
      ...mergedData,
      photo:      mergedData.photoUrl || '',
      dob:        mergedData.dateOfBirthFormatted || '',
      class:      mergedData.lastClassAttended || '',
      schoolName: schoolSnapshot.schoolName || '',
      udiseCode:  schoolSnapshot.udiseCode  || '',
    };

    return res.json({
      success:        true,
      document:       doc,        // includes doc.data.generatedSnapshot when present
      defaults,
      mergedData,
      schoolSnapshot,
      data:           dataEnvelope,
      student: {
        _id:       profile._id,
        firstName: profile.firstName,
        lastName:  profile.lastName,
        classId:   profile.classId,
        session:   profile.session,
      },
    });
  } catch (err) {
    logger.error('getDocument', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createDocument = async (req, res) => {
  try {
    const { studentId, type, data, certificateNumber, schoolSnapshot: snapBody } = req.body || {};
    if (!studentId || !type) {
      return res.status(400).json({ success: false, message: 'studentId and type are required' });
    }
    if (!assertType(type)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const existing = await SchoolCertificate.findOne({ schoolId: req.schoolId, studentId, type });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Document already exists for this student and type' });
    }

    const profile = await StudentProfile.findOne({ _id: studentId, schoolId: req.schoolId })
      .populate('classId', 'name')
      .populate('session', 'name');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const school  = await School.findById(req.schoolId);
    const defaults     = type === 'TC' ? buildTcDefaults(profile, req) : buildMigrationDefaults(profile, req);
    const baseSnap     = buildSchoolSnapshotFromDb(school, req);
    const schoolSnapshot = snapBody && typeof snapBody === 'object' ? { ...baseSnap, ...snapBody } : baseSnap;
    const mergedData   = mergeFlat(defaults, data);
    mergedData.photo   = mergedData.photoUrl || mergedData.photo || '';

    let certNo = certificateNumber;
    if (!certNo) {
      const count = await SchoolCertificate.countDocuments({ schoolId: req.schoolId, type });
      const y = new Date().getFullYear();
      certNo = `${type}-${y}-${String(count + 1).padStart(5, '0')}`;
    }

    const doc = await SchoolCertificate.create({
      schoolId: req.schoolId,
      studentId,
      type,
      certificateNumber: certNo,
      data:              mergedData,
      originalData:      { ...mergedData },
      editedData:        { ...mergedData },
      schoolSnapshot,
      isLocked:          false,
      createdBy:         req.user._id,
      updatedBy:         req.user._id,
      auditLogs: [{
        action: 'CREATE',
        actor: req.user._id,
        at: new Date(),
        changes: { certificateNumber: certNo },
      }],
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Document already exists for this student and type' });
    }
    logger.error('createDocument', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await SchoolCertificate.findOne({ _id: id, schoolId: req.schoolId });
    if (!doc)        return res.status(404).json({ success: false, message: 'Document not found' });
    if (doc.isLocked) return res.status(403).json({ message: 'Document is locked' });

    const { data, schoolSnapshot, certificateNumber } = req.body || {};
    if (data !== undefined) {
      // Preserve generatedSnapshot if it already exists
      const existing = doc.data || {};
      doc.data = { ...existing, ...data };
      doc.editedData = { ...(doc.editedData || existing), ...data };
      if (existing.generatedSnapshot) doc.data.generatedSnapshot = existing.generatedSnapshot;
      doc.markModified('data');
      doc.markModified('editedData');
      pushAuditLog(doc, 'UPDATE', req.user._id, { updatedKeys: Object.keys(data || {}) });
    }
    if (schoolSnapshot !== undefined && typeof schoolSnapshot === 'object') {
      doc.schoolSnapshot = { ...doc.schoolSnapshot, ...schoolSnapshot };
    }
    if (certificateNumber !== undefined) doc.certificateNumber = String(certificateNumber).trim();
    doc.updatedBy = req.user._id;
    await doc.save();

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('updateDocument', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.lockDocument = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await SchoolCertificate.findOne({ _id: id, schoolId: req.schoolId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Freeze live student photo at lock time
    const profile = await StudentProfile.findOne({ _id: doc.studentId, schoolId: req.schoolId });
    if (profile) {
      const raw = extractPhotoRawFromDocuments(profile.documents);
      const livePhotoUrl = toAbsoluteAssetUrl(raw, req);
      if (livePhotoUrl) {
        doc.data = { ...(doc.data || {}), photoUrl: livePhotoUrl, photo: livePhotoUrl };
        doc.markModified('data');
      }
    }

    doc.isLocked  = true;
    doc.lockedAt  = new Date();
    doc.lockedBy  = req.user._id;
    doc.updatedBy = req.user._id;
    doc.finalizedSnapshot = {
      data: { ...(doc.editedData || doc.data || {}) },
      schoolSnapshot: { ...(doc.schoolSnapshot || {}) },
      certificateNumber: doc.certificateNumber,
      templateId: doc.templateId || null,
      templateVersion: doc.templateVersion || null,
      finalizedAt: new Date(),
    };
    pushAuditLog(doc, 'LOCK', req.user._id, { message: 'Finalized and locked' });
    doc.markModified('finalizedSnapshot');
    await doc.save();

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('lockDocument', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.unlockDocument = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }

    const doc = await SchoolCertificate.findOne({ _id: id, schoolId: req.schoolId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    doc.isLocked  = false;
    doc.lockedAt  = undefined;
    doc.lockedBy  = undefined;
    doc.updatedBy = req.user._id;
    pushAuditLog(doc, 'UNLOCK', req.user._id, { message: 'Unlocked by admin' });
    await doc.save();

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error('unlockDocument', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// FIELD KEY → LABEL MAP
const FIELD_LABELS = {
  studentName:                'Student Name',
  fatherName:                 "Father's Name",
  motherName:                 "Mother's Name",
  className:                  'Class',
  sectionName:                'Section',
  admissionNo:                'Admission No.',
  rollNo:                     'Roll No.',
  dob:                        'Date of Birth',
  address:                    'Address',
  district:                   'District',
  schoolName:                 'School Name',
  udiseCode:                  'UDISE Code',
  schoolAddress:              'School Address',
  leavingDate:                'Date of Leaving',
  reasonForTransfer:          'Reason for Transfer',
  lastClassPassed:            'Last Class Passed',
  lastClassAttended:          'Last Class Attended',
  certificateNo:              'Certificate No.',
  issueDate:                  'Issue Date',
  sessionName:                'Session',
  pen:                        'PEN Number',
  studentCode:                'Student Code',
  // Migration-specific
  nationality:                'Nationality',
  religion:                   'Religion',
  conduct:                    'Conduct',
  whetherPassed:              'Passed Promotion Exam',
  dateOfLeaving:              'Date of Leaving / Migration',
  remarks:                    'Remarks',
  // Extra TC fields
  certificationStatementDate: 'Transfer Statement Date',
  issueFooterDate:            'Issue Footer Date',
  acknowledgementDate:        'Acknowledgement Date',
};

// IMAGE-BASED TEMPLATE ENDPOINTS

/** GET /documents/templates/:type */
exports.getTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    if (!DocumentTemplate.ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid template type' });
    }
    const template = await DocumentTemplate.findOne({ schoolId: req.schoolId, type }).lean();
    return res.json({
      success:      true,
      data:         template || null,
      fieldLibrary: Object.entries(FIELD_LABELS).map(([key, label]) => ({ key, label })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /documents/templates/upload-image
 * multipart/form-data: templateFile (PNG/JPG/PDF) + type + name
 * Uses the project's uploadImageToCloud() which supports Buffer (memory storage).
 */
exports.uploadTemplateImage = async (req, res) => {
  try {
    const { type, name, imageWidth, imageHeight } = req.body;

    if (!type || !DocumentTemplate.ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Valid type (TC|MIGRATION) is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Template file is required' });
    }
    const isPdf = req.file.mimetype === 'application/pdf';

    // Upload buffer to Cloudinary via project helper (already configured)
    const uploaded = await uploadImageToCloud(req.file.buffer, {
      folder:    'erp/templates',
      overwrite: true,
      resource_type: isPdf ? 'raw' : 'image',
    });
    const fileUrl = uploaded.secure_url || uploaded.url;

    // Upsert template record
    const existing = await DocumentTemplate.findOne({ schoolId: req.schoolId, type });
    if (existing) {
      existing.templateImageUrl = isPdf ? '' : fileUrl;
      existing.templatePdfUrl   = isPdf ? fileUrl : '';
      existing.templateMimeType = req.file.mimetype;
      existing.name             = name || existing.name || `${type} Template`;
      if (imageWidth)  existing.imageWidth  = Number(imageWidth);
      if (imageHeight) existing.imageHeight = Number(imageHeight);
      existing.uploadedAt = new Date();
      existing.version  += 1;
      existing.updatedBy = req.user._id;
      existing.fields    = []; // positions become invalid when image changes
      await existing.save();
      return res.json({
        success: true,
        data:    existing,
        message: 'Template image updated. Please reposition fields.',
      });
    }

    const template = await DocumentTemplate.create({
      schoolId:         req.schoolId,
      type,
      name:             name || `${type} Template`,
      templateImageUrl: isPdf ? '' : fileUrl,
      templatePdfUrl:   isPdf ? fileUrl : '',
      templateMimeType: req.file.mimetype,
      imageWidth:       imageWidth  ? Number(imageWidth)  : 794,
      imageHeight:      imageHeight ? Number(imageHeight) : 1123,
      uploadedAt:       new Date(),
      fields:           [],
      version:          1,
      createdBy:        req.user._id,
      updatedBy:        req.user._id,
    });
    return res.status(201).json({ success: true, data: template });
  } catch (err) {
    logger.error('uploadTemplateImage', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /documents/templates/:id/fields
 * Save field positions + styles (does NOT change the image).
 */
exports.saveTemplateFields = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template id' });
    }

    const template = await DocumentTemplate.findOne({ _id: id, schoolId: req.schoolId });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const { fields, name } = req.body;
    if (!Array.isArray(fields)) {
      return res.status(400).json({ success: false, message: 'fields must be an array' });
    }

    const invalidKeys = fields.filter(f => !DocumentTemplate.ALLOWED_FIELD_KEYS.includes(f.key));
    if (invalidKeys.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Invalid field keys: ${invalidKeys.map(f => f.key).join(', ')}`,
      });
    }

    const sanitized = fields.map((f) => sanitizeFieldForRender({
      ...f,
      label: FIELD_LABELS[f.key] || f.key,
    }));
    const overflowField = sanitized.find((f) => {
      const widthPct = ((f.width / Math.max(1, Number(template.imageWidth) || 794)) * 100);
      return f.xPercent + widthPct > 100.5 || f.yPercent > 99.5;
    });
    if (overflowField) {
      return res.status(422).json({
        success: false,
        message: `Field "${overflowField.key}" exceeds template bounds. Reduce width or adjust x/y position.`,
      });
    }
    template.fields = sanitized.map((f) => ({
      key: f.key,
      label: FIELD_LABELS[f.key] || f.key,
      xPercent: f.xPercent,
      yPercent: f.yPercent,
      fontSize: f.fontSize,
      fontWeight: f.fontWeight,
      color: f.color,
      fontFamily: f.fontFamily,
      width: f.width,
      alignment: f.alignment,
      maxLines: f.maxLines,
    }));
    if (name) template.name = String(name).trim();
    template.version  += 1;
    template.updatedBy = req.user._id;
    await template.save();

    return res.json({
      success: true,
      data:    template,
      message: `Fields saved — template now at version ${template.version}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** DELETE /documents/templates/:id */
exports.deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template id' });
    }
    const template = await DocumentTemplate.findOneAndDelete({ _id: id, schoolId: req.schoolId });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    return res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /documents/generate/:studentId/:type
 *
 * Saves an IMMUTABLE snapshot (image URL + field positions + student data)
 * into SchoolCertificate.data.generatedSnapshot.
 * Future template edits DO NOT affect already-generated documents.
 */
exports.generateFromTemplate = async (req, res) => {
  try {
    const { studentId, type } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }
    if (!DocumentTemplate.ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }

    // 1. Fetch & validate template
    const template = await DocumentTemplate.findOne({ schoolId: req.schoolId, type });
    if (!template) {
      return res.status(404).json({
        success: false,
        message: `No ${type} template found. Design a template first.`,
      });
    }
    if (!template.templateImageUrl) {
      return res.status(422).json({
        success: false,
        message: 'Template has no image. Upload a certificate image first.',
      });
    }
    if (!template.fields || template.fields.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Template has no fields placed. Add at least one field in the designer.',
      });
    }

    // 2. Fetch student
    const profile = await StudentProfile.findOne({ _id: studentId, schoolId: req.schoolId })
      .populate('classId',   'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session',   'name');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // 3. Check lock
    let doc = await SchoolCertificate.findOne({ schoolId: req.schoolId, studentId, type });
    if (doc && doc.isLocked) {
      return res.status(403).json({
        success: false,
        message: 'Document is locked. Unlock it first before regenerating.',
        code:    'DOCUMENT_LOCKED',
      });
    }

    // 4. School snapshot + cert number
    const school         = await School.findById(req.schoolId);
    const schoolSnapshot = buildSchoolSnapshotFromDb(school, req);

    let certNo = doc?.certificateNumber;
    if (!certNo) {
      const count = await SchoolCertificate.countDocuments({ schoolId: req.schoolId, type });
      const y = new Date().getFullYear();
      certNo = `${type}-${y}-${String(count + 1).padStart(5, '0')}`;
    }

    // 5. Build student data map that covers all FIELD_LABELS keys
    const savedData   = doc?.data || {};
    const studentData = buildStudentData(profile, schoolSnapshot, savedData, certNo);

    // 6. Freeze template snapshot
    const templateSnapshot = {
      templateImageUrl: template.templateImageUrl || '',
      templatePdfUrl:   template.templatePdfUrl || '',
      templateMimeType: template.templateMimeType || 'image/png',
      imageWidth:       template.imageWidth,
      imageHeight:      template.imageHeight,
      fields:           template.fields.map((f) => sanitizeFieldForRender(f.toObject ? f.toObject() : { ...f })),
      version:          template.version,
      templateId:       template._id.toString(),
    };

    const generatedSnapshot = { studentData, templateSnapshot, generatedAt: new Date() };

    // 7. Upsert document
    if (!doc) {
      doc = await SchoolCertificate.create({
        schoolId:          req.schoolId,
        studentId,
        type,
        certificateNumber: certNo,
        data:              { ...studentData, generatedSnapshot },
        originalData:      { ...studentData },
        editedData:        { ...studentData },
        schoolSnapshot,
        templateId:        template._id,
        templateVersion:   template.version,
        isLocked:          false,
        createdBy:         req.user._id,
        updatedBy:         req.user._id,
        auditLogs: [{
          action: 'GENERATE',
          actor: req.user._id,
          at: new Date(),
          changes: { templateVersion: template.version },
        }],
      });
    } else {
      doc.data = { ...(doc.data || {}), ...studentData, generatedSnapshot };
      doc.originalData = { ...studentData };
      doc.editedData = { ...(doc.editedData || {}), ...studentData };
      doc.markModified('data');
      doc.markModified('originalData');
      doc.markModified('editedData');
      doc.schoolSnapshot  = schoolSnapshot;
      doc.templateId      = template._id;
      doc.templateVersion = template.version;
      doc.updatedBy       = req.user._id;
      pushAuditLog(doc, 'GENERATE', req.user._id, { templateVersion: template.version });
      await doc.save();
    }

    // PDF generation
    const pdfName = `${doc.type}-${doc.studentId}-${doc._id}.pdf`;
    const pdfPath = path.join(CERT_PDF_DIR, pdfName);

    if (template.layoutMode === 'structured') {
      // Structured mode: Puppeteer HTML → PDF
      try {
        const pdfBuffer = await renderStructuredPdfBuffer({
          layout:         template.layout,
          sections:       template.sections || {},
          data:           studentData,
          schoolSnapshot,
          certNumber:     certNo,
          type,
        });
        ensureDir(path.dirname(pdfPath));
        fs.writeFileSync(pdfPath, pdfBuffer);
      } catch (pdfErr) {
        logger.error('generateFromTemplate:puppeteer', pdfErr.message);
        // Non-fatal — document is saved; download will re-render on demand
      }
    } else {
      // Overlay mode: PDFKit image + text
      try {
        await renderCertificatePdfToFile({ snapshot: generatedSnapshot, outputPath: pdfPath });
      } catch (pdfErr) {
        logger.error('generateFromTemplate:pdfkit', pdfErr.message);
      }
    }

    doc.generatedPdfPath     = pdfPath;
    doc.generatedPdfMimeType = 'application/pdf';
    // Store layoutMode so download knows which renderer to use
    doc.data = { ...(doc.data || {}), layoutMode: template.layoutMode || 'overlay' };
    doc.markModified('data');
    await doc.save();

    return res.json({
      success:           true,
      message:           'Certificate generated successfully',
      data:              doc,
      generatedSnapshot,
      layoutMode:        template.layoutMode || 'overlay',
    });
  } catch (err) {
    logger.error('generateFromTemplate', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.generateBulkFromTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    const { studentIds = [] } = req.body || {};
    if (!DocumentTemplate.ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid document type' });
    }
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds[] is required' });
    }
    const validIds = studentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const template = await DocumentTemplate.findOne({ schoolId: req.schoolId, type });
    if (!template || !template.fields?.length) {
      return res.status(422).json({ success: false, message: `Template for ${type} is missing or has no mapped fields` });
    }
    const school = await School.findById(req.schoolId);
    const schoolSnapshot = buildSchoolSnapshotFromDb(school, req);
    const results = [];
    for (const studentId of validIds) {
      try {
        const profile = await StudentProfile.findOne({ _id: studentId, schoolId: req.schoolId })
          .populate('classId', 'name numericOrder')
          .populate('sectionId', 'name')
          .populate('session', 'name');
        if (!profile) {
          results.push({ studentId, success: false, message: 'Student not found' });
          continue;
        }
        let doc = await SchoolCertificate.findOne({ schoolId: req.schoolId, studentId, type });
        if (doc?.isLocked) {
          results.push({ studentId, success: false, message: 'Document is locked' });
          continue;
        }
        let certNo = doc?.certificateNumber;
        if (!certNo) {
          const count = await SchoolCertificate.countDocuments({ schoolId: req.schoolId, type });
          certNo = `${type}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
        }
        const studentData = buildStudentData(profile, schoolSnapshot, doc?.data || {}, certNo);
        const templateSnapshot = {
          templateImageUrl: template.templateImageUrl || '',
          templatePdfUrl: template.templatePdfUrl || '',
          templateMimeType: template.templateMimeType || 'image/png',
          imageWidth: template.imageWidth,
          imageHeight: template.imageHeight,
          fields: template.fields.map((f) => sanitizeFieldForRender(f.toObject ? f.toObject() : { ...f })),
          version: template.version,
          templateId: template._id.toString(),
        };
        const generatedSnapshot = { studentData, templateSnapshot, generatedAt: new Date() };
        if (!doc) {
          doc = await SchoolCertificate.create({
            schoolId: req.schoolId,
            studentId,
            type,
            certificateNumber: certNo,
            data: { ...studentData, generatedSnapshot },
            originalData: { ...studentData },
            editedData: { ...studentData },
            schoolSnapshot,
            templateId: template._id,
            templateVersion: template.version,
            isLocked: false,
            createdBy: req.user._id,
            updatedBy: req.user._id,
            auditLogs: [{ action: 'GENERATE', actor: req.user._id, changes: { bulk: true, templateVersion: template.version } }],
          });
        } else {
          doc.data = { ...(doc.data || {}), ...studentData, generatedSnapshot };
          doc.originalData = { ...studentData };
          doc.editedData = { ...(doc.editedData || {}), ...studentData };
          doc.schoolSnapshot = schoolSnapshot;
          doc.templateId = template._id;
          doc.templateVersion = template.version;
          pushAuditLog(doc, 'GENERATE', req.user._id, { bulk: true, templateVersion: template.version });
          await doc.save();
        }
        const pdfName = `${doc.type}-${doc.studentId}-${doc._id}.pdf`;
        const pdfPath = path.join(CERT_PDF_DIR, pdfName);
        await renderCertificatePdfToFile({ snapshot: generatedSnapshot, outputPath: pdfPath });
        doc.generatedPdfPath = pdfPath;
        doc.generatedPdfMimeType = 'application/pdf';
        await doc.save();
        results.push({ studentId, success: true, documentId: doc._id });
      } catch (e) {
        results.push({ studentId, success: false, message: e.message });
      }
    }
    return res.json({ success: true, count: results.length, results });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadCertificatePdf = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid document id' });
    }
    const doc = await SchoolCertificate.findOne({ _id: id, schoolId: req.schoolId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const filename = `${doc.type}-${doc.certificateNumber || doc._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // FAST PATH: file already on disk
    if (doc.generatedPdfPath && fs.existsSync(doc.generatedPdfPath)) {
      pushAuditLog(doc, 'DOWNLOAD', req.user?._id || null, { path: doc.generatedPdfPath });
      await doc.save();
      return fs.createReadStream(doc.generatedPdfPath).pipe(res);
    }

    // ON-DEMAND REGENERATION: file missing (server restart / new env)
    logger.warn(`downloadCertificatePdf: file missing for doc ${doc._id} — regenerating on demand`);

    const layoutMode = doc.data?.layoutMode || 'overlay';
    const snapshot   = doc.data?.generatedSnapshot || null;

    let pdfBuffer;

    if (layoutMode === 'structured') {
      // Re-fetch template for layout definition
      const template = doc.templateId
        ? await DocumentTemplate.findById(doc.templateId)
        : await DocumentTemplate.findOne({ schoolId: req.schoolId, type: doc.type });

      if (!template) {
        return res.status(422).json({
          success: false,
          message: 'Template not found. Please regenerate the certificate.',
        });
      }

      const school        = await School.findById(req.schoolId);
      const schoolSnapshot = buildSchoolSnapshotFromDb(school, req);
      const data           = doc.editedData || doc.data || {};

      pdfBuffer = await renderStructuredPdfBuffer({
        layout:      template.layout,
        sections:    template.sections || {},
        data,
        schoolSnapshot,
        certNumber:  doc.certificateNumber || '',
        type:        doc.type,
      });
    } else if (snapshot) {
      // Overlay mode — regenerate via PDFKit from frozen snapshot
      const pdfPath = path.join(CERT_PDF_DIR, `${doc.type}-${doc.studentId}-${doc._id}.pdf`);
      await renderCertificatePdfToFile({ snapshot, outputPath: pdfPath });
      doc.generatedPdfPath = pdfPath;
      pdfBuffer = fs.readFileSync(pdfPath);
    } else {
      return res.status(422).json({
        success: false,
        message: 'No generation snapshot found. Please regenerate the certificate first.',
      });
    }

    pushAuditLog(doc, 'DOWNLOAD', req.user?._id || null, { regenerated: true });
    await doc.save();

    return res.end(pdfBuffer);
  } catch (err) {
    logger.error('downloadCertificatePdf', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// SAVE STRUCTURED LAYOUT

/**
 * PUT /documents/templates/:id/layout
 * Saves a structured layout definition (replaces overlay field coords).
 * Sets layoutMode → 'structured'.
 */
exports.saveTemplateLayout = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid template id' });
    }
    const template = await DocumentTemplate.findOne({ _id: id, schoolId: req.schoolId });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    const { layout, sections, name } = req.body;

    if (!Array.isArray(layout) || layout.length === 0) {
      return res.status(400).json({ success: false, message: 'layout[] must be a non-empty array' });
    }

    // Validate all row keys are in allowed set
    const allKeys = [];
    layout.forEach((row) => {
      if (row.key) allKeys.push(row.key);
      if (Array.isArray(row.fields)) row.fields.forEach((f) => { if (f.key) allKeys.push(f.key); });
    });
    const invalidKeys = allKeys.filter((k) => !DocumentTemplate.ALLOWED_FIELD_KEYS.includes(k));
    if (invalidKeys.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Invalid field keys: ${invalidKeys.join(', ')}`,
      });
    }

    template.layout     = layout;
    template.sections   = sections && typeof sections === 'object' ? sections : {};
    template.layoutMode = 'structured';
    template.version   += 1;
    template.updatedBy  = req.user._id;
    if (name) template.name = String(name).trim();
    template.markModified('layout');
    template.markModified('sections');
    await template.save();

    return res.json({
      success: true,
      data:    template,
      message: `Structured layout saved — template v${template.version}`,
    });
  } catch (err) {
    logger.error('saveTemplateLayout', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
