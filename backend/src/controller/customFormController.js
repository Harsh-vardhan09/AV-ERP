const crypto = require('crypto');
const CustomForm     = require('../models/CustomForm');
const CustomFormLead = require('../models/CustomFormLead');

// ── helpers ──────────────────────────────────────────────────────────────────

const PREDEFINED_FIELDS = [
  { fieldName: 'Name',                       fieldKey: 'name' },
  { fieldName: 'Mobile No.',                 fieldKey: 'mobileNo' },
  { fieldName: 'WhatsApp No.',               fieldKey: 'whatsappNo' },
  { fieldName: 'Alternate Number',           fieldKey: 'alternateNumber' },
  { fieldName: 'Email Address',              fieldKey: 'emailAddress' },
  { fieldName: 'APAAR ID',                   fieldKey: 'apaarId' },
  { fieldName: 'Classes Name',               fieldKey: 'className' },
  { fieldName: 'Stream',                     fieldKey: 'stream' },
  { fieldName: 'Medium',                     fieldKey: 'medium' },
  { fieldName: 'Gender',                     fieldKey: 'gender' },
  { fieldName: 'Address',                    fieldKey: 'address' },
  { fieldName: 'Pincode',                    fieldKey: 'pincode' },
  { fieldName: 'City',                       fieldKey: 'city' },
  { fieldName: 'State',                      fieldKey: 'state' },
  { fieldName: 'Country',                    fieldKey: 'country' },
  { fieldName: 'Aadhar No.',                 fieldKey: 'aadharNo' },
  { fieldName: 'Blood Group',                fieldKey: 'bloodGroup' },
  { fieldName: 'Caste',                      fieldKey: 'caste' },
  { fieldName: 'Category',                   fieldKey: 'category' },
  { fieldName: 'Religion',                   fieldKey: 'religion' },
  { fieldName: 'Nationality',                fieldKey: 'nationality' },
  { fieldName: 'Date Of Birth',              fieldKey: 'dateOfBirth' },
  { fieldName: 'Is RTE Student?',            fieldKey: 'isRteStudent' },
  { fieldName: 'Child With Special Needs',   fieldKey: 'childWithSpecialNeeds' },
  { fieldName: 'Attended School',            fieldKey: 'attendedSchool' },
  { fieldName: 'Attended Classes',           fieldKey: 'attendedClasses' },
  { fieldName: 'School Affiliated',          fieldKey: 'schoolAffiliated' },
  { fieldName: 'Roll No.',                   fieldKey: 'rollNo' },
  { fieldName: "Mother's Name",              fieldKey: 'motherName' },
  { fieldName: "Father's Name",              fieldKey: 'fatherName' },
  { fieldName: "Guardian's Name",            fieldKey: 'guardianName' },
  { fieldName: 'Mother Qualification',       fieldKey: 'motherQualification' },
  { fieldName: 'Father Qualification',       fieldKey: 'fatherQualification' },
  { fieldName: 'Guardian Qualification',     fieldKey: 'guardianQualification' },
  { fieldName: 'Mother Occupation',          fieldKey: 'motherOccupation' },
  { fieldName: 'Father Occupation',          fieldKey: 'fatherOccupation' },
  { fieldName: 'Guardian Occupation',        fieldKey: 'guardianOccupation' },
  { fieldName: 'Mother Residential Address', fieldKey: 'motherResidentialAddress' },
  { fieldName: 'Father Residential Address', fieldKey: 'fatherResidentialAddress' },
  { fieldName: 'Guardian Residential Address', fieldKey: 'guardianResidentialAddress' },
  { fieldName: 'Mother Official Address',    fieldKey: 'motherOfficialAddress' },
  { fieldName: 'Father Official Address',    fieldKey: 'fatherOfficialAddress' },
  { fieldName: 'Guardian Official Address',  fieldKey: 'guardianOfficialAddress' },
  { fieldName: 'Mother Income',              fieldKey: 'motherIncome' },
  { fieldName: 'Father Income',              fieldKey: 'fatherIncome' },
  { fieldName: 'Guardian Income',            fieldKey: 'guardianIncome' },
  { fieldName: 'Mother Email',               fieldKey: 'motherEmail' },
  { fieldName: 'Father Email',               fieldKey: 'fatherEmail' },
  { fieldName: 'Guardian Email',             fieldKey: 'guardianEmail' },
  { fieldName: 'Mother Mobile',              fieldKey: 'motherMobile' },
  { fieldName: 'Father Mobile',              fieldKey: 'fatherMobile' },
  { fieldName: 'Guardian Mobile',            fieldKey: 'guardianMobile' },
  { fieldName: 'Transfer Certificate No.',   fieldKey: 'tcNo' },
  { fieldName: 'Transfer Certificate Date',  fieldKey: 'tcDate' },
  { fieldName: 'Admission Date',             fieldKey: 'admissionDate' },
  { fieldName: 'Samagra ID',                 fieldKey: 'samagraId' },
  { fieldName: 'Subject',                    fieldKey: 'subject' },
  { fieldName: 'Message',                    fieldKey: 'message' },
  { fieldName: 'Upload Photo',               fieldKey: 'uploadPhoto' },
];

// ── GET /api/v1/custom-forms/predefined-fields ───────────────────────────────
exports.getPredefinedFields = (req, res) => {
  res.json({ success: true, data: PREDEFINED_FIELDS });
};

// ── GET /api/v1/custom-forms ─────────────────────────────────────────────────
exports.getAllForms = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const { page = 1, limit = 20, search = '' } = req.query;

    const filter = { schoolId, isDeleted: { $ne: true } };
    if (search) {
      filter.title = new RegExp(search.trim(), 'i');
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await CustomForm.countDocuments(filter);

    const forms = await CustomForm.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Attach lead count for each form
    const formIds = forms.map(f => f._id);
    const leadCounts = await CustomFormLead.aggregate([
      { $match: { formId: { $in: formIds } } },
      { $group: { _id: '$formId', count: { $sum: 1 } } },
    ]);
    const leadMap = {};
    leadCounts.forEach(l => { leadMap[String(l._id)] = l.count; });

    const enriched = forms.map(f => ({
      ...f,
      totalLeads: leadMap[String(f._id)] || 0,
    }));

    res.json({
      success: true,
      data: {
        forms: enriched,
        pagination: {
          total,
          page:       Number(page),
          limit:      Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    console.error('[CustomForm] getAllForms:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/custom-forms/deleted ─────────────────────────────────────────
exports.getDeletedForms = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const { page = 1, limit = 20 } = req.query;

    const filter = { schoolId, isDeleted: true };
    const skip   = (Number(page) - 1) * Number(limit);
    const total  = await CustomForm.countDocuments(filter);

    const forms = await CustomForm.find(filter)
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: {
        forms,
        pagination: {
          total,
          page:       Number(page),
          limit:      Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    console.error('[CustomForm] getDeletedForms:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/custom-forms/:id ─────────────────────────────────────────────
exports.getFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const form = await CustomForm.findOne({ _id: id, schoolId }).lean();
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });

    res.json({ success: true, data: form });
  } catch (err) {
    console.error('[CustomForm] getFormById:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/v1/custom-forms ────────────────────────────────────────────────
exports.createForm = async (req, res) => {
  try {
    const schoolId = req.schoolId;
    const {
      title, content, contentPosition,
      fieldMode, predefinedFields, customFields,
      status, linkToLead, registrationForm, session,
      receiverEmail, emailSubject, emailSignature,
      autoReply, replyEmailSubject, replyEmailBody, replyToEmail,
      enablePayment,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Form title is required' });
    }

    // Generate a unique share token
    const shareToken = crypto.randomBytes(16).toString('hex');

    const form = await CustomForm.create({
      schoolId,
      title: title.trim(),
      content:          content || '',
      contentPosition:  contentPosition || 'before',
      fieldMode:        fieldMode || 'predefined',
      predefinedFields: predefinedFields || [],
      customFields:     customFields || [],
      status:           status !== undefined ? status : true,
      linkToLead:       linkToLead !== undefined ? linkToLead : true,
      registrationForm: registrationForm || false,
      session:          session || '',
      receiverEmail:    receiverEmail || '',
      emailSubject:     emailSubject || '',
      emailSignature:   emailSignature || '',
      autoReply:        autoReply || false,
      replyEmailSubject: replyEmailSubject || '',
      replyEmailBody:   replyEmailBody || '',
      replyToEmail:     replyToEmail || '',
      enablePayment:    enablePayment || false,
      createdBy:        req.userId,
      shareToken,
    });

    res.status(201).json({ success: true, data: form, message: 'Form created successfully' });
  } catch (err) {
    console.error('[CustomForm] createForm:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PUT /api/v1/custom-forms/:id ─────────────────────────────────────────────
exports.updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const form = await CustomForm.findOne({ _id: id, schoolId });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });

    const allowed = [
      'title','content','contentPosition','fieldMode',
      'predefinedFields','customFields',
      'status','linkToLead','registrationForm','session',
      'receiverEmail','emailSubject','emailSignature',
      'autoReply','replyEmailSubject','replyEmailBody','replyToEmail',
      'enablePayment',
    ];

    allowed.forEach(key => {
      if (req.body[key] !== undefined) form[key] = req.body[key];
    });

    await form.save();
    res.json({ success: true, data: form, message: 'Form updated successfully' });
  } catch (err) {
    console.error('[CustomForm] updateForm:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/v1/custom-forms/:id/toggle-status ─────────────────────────────
exports.toggleFormStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const schoolId = req.schoolId;

    const form = await CustomForm.findOneAndUpdate(
      { _id: id, schoolId },
      { status },
      { new: true }
    );
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });

    res.json({ success: true, data: form, message: `Form ${status ? 'activated' : 'deactivated'}` });
  } catch (err) {
    console.error('[CustomForm] toggleFormStatus:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE /api/v1/custom-forms/:id (soft delete) ────────────────────────────
exports.deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const form = await CustomForm.findOne({ _id: id, schoolId });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });

    form.isDeleted  = true;
    form.deletedAt  = new Date();
    form.deletedBy  = req.userId;
    await form.save();

    res.json({ success: true, message: 'Form deleted successfully' });
  } catch (err) {
    console.error('[CustomForm] deleteForm:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── PATCH /api/v1/custom-forms/:id/restore ───────────────────────────────────
exports.restoreForm = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const form = await CustomForm.findOne({ _id: id, schoolId });
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });

    form.isDeleted = false;
    form.deletedAt = undefined;
    form.deletedBy = undefined;
    await form.save();

    res.json({ success: true, message: 'Form restored successfully' });
  } catch (err) {
    console.error('[CustomForm] restoreForm:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/v1/custom-forms/:id/leads ───────────────────────────────────────
exports.getFormLeads = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;
    const { page = 1, limit = 20, status = '' } = req.query;

    // Verify form belongs to this school
    const form = await CustomForm.findOne({ _id: id, schoolId }).lean();
    if (!form) return res.status(404).json({ success: false, message: 'Form not found' });

    const filter = { formId: id };
    if (status) filter.status = status;

    const skip   = (Number(page) - 1) * Number(limit);
    const total  = await CustomFormLead.countDocuments(filter);
    const leads  = await CustomFormLead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: {
        form,
        leads,
        pagination: {
          total,
          page:       Number(page),
          limit:      Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    console.error('[CustomForm] getFormLeads:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/v1/custom-forms/:token/submit (public) ─────────────────────────
exports.submitForm = async (req, res) => {
  try {
    const { token } = req.params;
    const form = await CustomForm.findOne({ shareToken: token, status: true, isDeleted: false }).lean();
    if (!form) return res.status(404).json({ success: false, message: 'Form not found or inactive' });

    const lead = await CustomFormLead.create({
      schoolId: form.schoolId,
      formId:   form._id,
      fields:   req.body.fields || {},
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json({ success: true, data: lead, message: 'Form submitted successfully' });
  } catch (err) {
    console.error('[CustomForm] submitForm:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
