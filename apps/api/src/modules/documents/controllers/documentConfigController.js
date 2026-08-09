const mongoose = require('mongoose');
const DocumentTemplateConfig = require('../models/DocumentTemplateConfig');
const GeneratedDocument = require('../models/GeneratedDocument');
// TEMP: StudentProfile/School move to modules/people
const StudentProfile = require('../../people').StudentProfile;
const School = require('../../tenancy').School;

const DEFAULT_FIELDS = [
  { key: 'studentName', label: 'Student Name', required: true, type: 'text' },
  { key: 'fatherName', label: "Father's Name", required: true, type: 'text' },
  { key: 'motherName', label: "Mother's Name", required: false, type: 'text' },
  { key: 'class', label: 'Class', required: true, type: 'text' },
  { key: 'section', label: 'Section', required: false, type: 'text' },
  { key: 'admissionNo', label: 'Admission No.', required: true, type: 'text' },
  { key: 'dob', label: 'Date of Birth', required: true, type: 'date' },
  { key: 'leavingDate', label: 'Date of Leaving', required: true, type: 'date' },
  { key: 'reason', label: 'Reason for Leaving', required: false, type: 'textarea' },
  { key: 'conduct', label: 'General Conduct', required: false, type: 'text' },
  { key: 'rollNo', label: 'Roll No.', required: false, type: 'number' },
];

const ensureType = (type) => DocumentTemplateConfig.DOC_TYPES.includes(type);
const toKey = (s = '') => String(s).trim();

const validateFields = (fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return 'At least one field is required';
  const seen = new Set();
  for (const field of fields) {
    const key = toKey(field.key);
    const label = String(field.label || '').trim();
    if (!key) return 'Field key is required';
    if (!/^[a-z][A-Za-z0-9]*$/.test(key)) return `Invalid key "${key}". Use camelCase only.`;
    if (!label) return `Field label is required for "${key}"`;
    if (!DocumentTemplateConfig.FIELD_TYPES.includes(field.type || 'text')) {
      return `Invalid field type for "${key}"`;
    }
    if (seen.has(key)) return `Duplicate field key "${key}" is not allowed`;
    seen.add(key);
  }
  return null;
};

const profileToData = (profile) => {
  const className = profile.classId?.name || '';
  const base = {
    studentName: [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ').trim(),
    fatherName: profile.parentDetails?.father?.name || '',
    motherName: profile.parentDetails?.mother?.name || '',
    class: className.replace(/^class\s+/i, '').trim(),
    section: profile.sectionId?.name || '',
    admissionNo: profile.admissionNumber || '',
    dob: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().slice(0, 10) : '',
    leavingDate: '',
    reason: '',
    conduct: '',
    rollNo: profile.rollNo || '',
  };
  return base;
};

exports.getFieldLibrary = async (req, res) => {
  return res.json({ success: true, data: DEFAULT_FIELDS });
};

exports.getTemplateConfig = async (req, res) => {
  try {
    const { type } = req.params;
    if (!ensureType(type)) return res.status(400).json({ success: false, message: 'Invalid document type' });
    const config = await DocumentTemplateConfig.findOne({ schoolId: req.schoolId, type }).lean();
    return res.json({
      success: true,
      data: config || null,
      defaults: DEFAULT_FIELDS,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.saveTemplateConfig = async (req, res) => {
  try {
    const { type } = req.params;
    if (!ensureType(type)) return res.status(400).json({ success: false, message: 'Invalid document type' });
    const { fields = [] } = req.body || {};
    const validationError = validateFields(fields);
    if (validationError) return res.status(422).json({ success: false, message: validationError });

    const payload = fields.map((f) => ({
      key: toKey(f.key),
      label: String(f.label || '').trim(),
      required: !!f.required,
      type: f.type || 'text',
      isCustom: !!f.isCustom,
    }));

    const updated = await DocumentTemplateConfig.findOneAndUpdate(
      { schoolId: req.schoolId, type },
      {
        $set: {
          fields: payload,
          updatedBy: req.user._id,
        },
        $setOnInsert: {
          createdBy: req.user._id,
        },
      },
      { new: true, upsert: true }
    );
    return res.json({ success: true, data: updated, message: `Template saved for ${type}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getNewDocumentContext = async (req, res) => {
  try {
    const { type, studentId } = req.params;
    if (!ensureType(type)) return res.status(400).json({ success: false, message: 'Invalid document type' });
    if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'Invalid student id' });

    const [config, profile, school] = await Promise.all([
      DocumentTemplateConfig.findOne({ schoolId: req.schoolId, type }).lean(),
      StudentProfile.findOne({ _id: studentId, schoolId: req.schoolId })
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .lean(),
      School.findById(req.schoolId).lean(),
    ]);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    const fields = (config?.fields || DEFAULT_FIELDS.filter((f) => f.required)).map((f) => ({ ...f }));
    const initialData = profileToData(profile);
    return res.json({
      success: true,
      data: {
        type,
        studentId,
        fields,
        initialData,
        schoolInfo: {
          name: school?.name || '',
          address: school?.address || school?.schoolAddress || '',
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createGeneratedDocument = async (req, res) => {
  try {
    const { studentId, type, data = {} } = req.body || {};
    if (!ensureType(type)) return res.status(400).json({ success: false, message: 'Invalid document type' });
    if (!mongoose.Types.ObjectId.isValid(studentId)) return res.status(400).json({ success: false, message: 'Invalid student id' });
    const [profile, config] = await Promise.all([
      StudentProfile.findOne({ _id: studentId, schoolId: req.schoolId }).lean(),
      DocumentTemplateConfig.findOne({ schoolId: req.schoolId, type }).lean(),
    ]);
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });
    const fieldsUsed = (config?.fields || DEFAULT_FIELDS.filter((f) => f.required)).map((f) => ({ ...f }));
    if (!fieldsUsed.length) {
      return res.status(422).json({ success: false, message: 'No fields configured for this document type' });
    }
    for (const field of fieldsUsed) {
      if (field.required && !String(data[field.key] ?? '').trim()) {
        return res.status(422).json({ success: false, message: `${field.label} is required` });
      }
    }

    const sanitizedData = {};
    for (const field of fieldsUsed) sanitizedData[field.key] = data[field.key] ?? '';

    const created = await GeneratedDocument.create({
      studentId,
      schoolId: req.schoolId,
      type,
      fieldsUsed,
      data: sanitizedData,
      issuedBy: req.user._id,
    });
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getGeneratedDocument = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid document id' });
    const doc = await GeneratedDocument.findOne({ _id: id, schoolId: req.schoolId }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Generated document not found' });
    const school = await School.findById(req.schoolId).lean();
    return res.json({
      success: true,
      data: {
        ...doc,
        schoolInfo: {
          name: school?.name || '',
          address: school?.address || school?.schoolAddress || '',
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
