/**
 * templateEngine.js
 * ─────────────────
 * Core utilities for the dynamic document template system.
 * All functions are pure (no DB calls) so they can be unit-tested independently.
 */

// ALLOWED PLACEHOLDER REGISTRY
const ALLOWED_PLACEHOLDERS = new Set([
  'studentName',
  'fatherName',
  'motherName',
  'className',
  'sectionName',
  'admissionNo',
  'rollNo',
  'dob',
  'address',
  'district',
  'schoolName',
  'udiseCode',
  'schoolAddress',
  'leavingDate',
  'reasonForTransfer',
  'lastClassPassed',
  'lastClassAttended',
  'certificateNo',
  'issueDate',
  'sessionName',
  'pen',
  'studentCode',
  'nationality',
  'religion',
  'conduct',
  'whetherPassed',
  'dateOfLeaving',
  'remarks',
  // Extra TC date fields
  'certificationStatementDate',
  'issueFooterDate',
  'acknowledgementDate',
]);

/** Human-readable descriptions — used by the frontend placeholder library */
const PLACEHOLDER_LABELS = {
  studentName:                'Student Full Name',
  fatherName:                 "Father's Name",
  motherName:                 "Mother's Name",
  className:                  'Class',
  sectionName:                'Section',
  admissionNo:                'Admission Number',
  rollNo:                     'Roll Number',
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
  certificateNo:              'Certificate Number',
  issueDate:                  'Issue Date',
  sessionName:                'Academic Session',
  pen:                        'PEN Number',
  studentCode:                'Student Code',
  nationality:                'Nationality',
  religion:                   'Religion',
  conduct:                    'Conduct',
  whetherPassed:              'Passed Promotion Exam',
  dateOfLeaving:              'Date of Leaving / Migration',
  remarks:                    'Remarks',
  certificationStatementDate: 'Transfer Statement Date',
  issueFooterDate:            'Issue Footer Date',
  acknowledgementDate:        'Acknowledgement Date',
};

// DETECT ALL {{...}} KEYS IN A TEMPLATE STRING
function detectPlaceholders(html = '') {
  const keys = [];
  const seen = new Set();
  const re = /\{\{(.*?)\}\}/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    const key = match[1].trim();
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

// VALIDATE PLACEHOLDERS — reject if any unknown key found
function validatePlaceholders(html = '') {
  const found = detectPlaceholders(html);
  const invalid = found.filter((k) => !ALLOWED_PLACEHOLDERS.has(k));
  if (invalid.length > 0) {
    return {
      valid: false,
      invalid,
      message: `Unknown placeholder(s): ${invalid.map((k) => `{{${k}}}`).join(', ')}. Only allowed placeholders may be used.`,
    };
  }
  return { valid: true, invalid: [], placeholders: found };
}

// SANITIZE HTML — strip XSS vectors before saving or rendering
function sanitizeHtml(html = '') {
  if (typeof html !== 'string') return '';

  // 1. Remove <script> blocks (with content)
  let safe = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

  // 2. Remove on* event attributes (onclick, onload, onerror, etc.)
  safe = safe.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // 3. Remove javascript: href/src values
  safe = safe.replace(/\s+(href|src|action)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '');

  // 4. Remove <iframe> (not needed in templates; iframes are only in preview UI)
  safe = safe.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');

  // 5. Remove <object>, <embed>, <form>
  safe = safe.replace(/<(object|embed|form)[\s\S]*?>[\s\S]*?<\/\1>/gi, '');

  return safe;
}

// REPLACE PLACEHOLDERS — core engine
/**
 * @param {string} template  Raw HTML string with {{key}} placeholders
 * @param {object} data      Map of key → value
 * @returns {string}         HTML with all known placeholders filled in
 */
function replacePlaceholders(template = '', data = {}) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey) => {
    const key = rawKey.trim();
    const val = data[key];
    if (val === undefined || val === null || val === '') return '—';
    return String(val);
  });
}

// BUILD STUDENT DATA MAP
/**
 * Builds the data object used to fill template placeholders.
 * @param {object} studentProfile Mongoose document (populated classId, sectionId, session)
 * @param {object} schoolSnapshot Plain object with school header fields
 * @param {object} docData        The SchoolCertificate.data field (extra editable fields)
 * @param {string} certNo         The certificate number
 */
function buildStudentData(studentProfile, schoolSnapshot = {}, docData = {}, certNo = '') {
  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const p = studentProfile;

  // Name — support middleName if present
  const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').trim();

  // Father / Mother — handle both flat fields and nested parentDetails
  const fatherName =
    p.parentDetails?.father?.name || p.fatherName || docData.fatherName || '';
  const motherName =
    p.parentDetails?.mother?.name || p.motherName || docData.motherName || '';

  // Address — build from parts or use flat field
  const addressParts = [
    p.address, p.addressLine2,
    p.city    && `P.O.- ${p.city}`,
    p.state   && `P.S.- ${p.state}`,
    p.pincode && `PIN- ${p.pincode}`,
  ].filter(Boolean);
  const address = addressParts.length
    ? addressParts.join(', ').replace(/\s+/g, ' ').trim()
    : docData.address || '';

  const district = p.city || p.state || p.district || docData.district || '';

  // Class label (strip leading "class" word to avoid "CLASS Class X")
  const rawClass    = p.classId?.name || '';
  const classLabel  = rawClass.replace(/^class\s+/i, '').trim();
  const sessionName = p.session?.name || docData.sessionName || '';

  const lastClassAttended = docData.lastClassAttended ||
    (classLabel ? `CLASS ${classLabel}${sessionName ? ` (Academic Session: ${sessionName})` : ''}`.toUpperCase() : '');
  const lastClassPassed   = docData.lastClassPassed ||
    (p.previousClass ? String(p.previousClass).toUpperCase() : '');

  return {
    studentName:                fullName,
    fatherName,
    motherName,
    className:                  classLabel            || docData.className         || '',
    sectionName:                p.sectionId?.name     || docData.sectionName       || '',
    admissionNo:                p.admissionNumber     || docData.admissionNo       || '',
    rollNo:                     p.rollNo              || docData.rollNo             || '',
    dob:                        formatDate(p.dateOfBirth) || docData.dob           || '',
    address,
    district,
    pen:                        p.pen                 || docData.pen               || '',
    studentCode:                p.studentId           || p.admissionNumber         || docData.studentCode || '',
    schoolName:                 schoolSnapshot.schoolName        || '',
    udiseCode:                  schoolSnapshot.udiseCode         || '',
    schoolAddress:              schoolSnapshot.schoolLocationLine || schoolSnapshot.schoolAddress || '',
    leavingDate:                docData.leavingDate              || '',
    reasonForTransfer:          docData.reasonForTransfer        || '',
    lastClassPassed,
    lastClassAttended,
    certificateNo:              certNo                           || '',
    issueDate:                  docData.issueDate || formatDate(new Date()),
    sessionName,
    // Migration fields
    nationality:                p.nationality || docData.nationality || 'Indian',
    religion:                   p.religion    || docData.religion    || '',
    conduct:                    docData.conduct       || 'Good',
    whetherPassed:              docData.whetherPassed || 'Yes',
    dateOfLeaving:              docData.dateOfLeaving || '',
    remarks:                    docData.remarks       || '',
    // TC date fields
    certificationStatementDate: docData.certificationStatementDate || '',
    issueFooterDate:            docData.issueFooterDate            || '',
    acknowledgementDate:        docData.acknowledgementDate        || '',
  };
}


// DUMMY DATA — used for live preview in Template Manager
const DUMMY_DATA = {
  studentName:       'RAHUL KUMAR SHARMA',
  fatherName:        'RAJESH KUMAR SHARMA',
  motherName:        'SUNITA SHARMA',
  className:         'Class X (A)',
  sectionName:       'A',
  admissionNo:       'ADM-2024-001',
  rollNo:            '101',
  dob:               '15/08/2008',
  address:           '12, MG Road, Bhopal',
  district:          'Bhopal',
  pen:               'MP1234567890',
  studentCode:       'STU-001',
  schoolName:        'DEMO PUBLIC SCHOOL',
  udiseCode:         '23456789001',
  schoolAddress:     'Block A, Bhopal, M.P.',
  leavingDate:       '31/03/2024',
  reasonForTransfer: 'Parent Transfer',
  lastClassPassed:   'CLASS IX',
  lastClassAttended: 'CLASS X',
  certificateNo:     'TC-2024-001',
  issueDate:         new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  sessionName:       '2023-24',
  nationality:       'Indian',
  religion:          'Hindu',
  conduct:           'Good',
  whetherPassed:     'Yes',
  dateOfLeaving:     '31/03/2024',
  remarks:           '',
  certificationStatementDate: '',
  issueFooterDate:   '',
  acknowledgementDate: '',
};

module.exports = {
  ALLOWED_PLACEHOLDERS,
  PLACEHOLDER_LABELS,
  DUMMY_DATA,
  detectPlaceholders,
  validatePlaceholders,
  sanitizeHtml,
  replacePlaceholders,
  buildStudentData,
};
