/**
 * studentImportConfig — Field rules for student bulk import
 *
 * Maps common Excel column headers (Hindi schools use many variations)
 * to internal field names. Includes required field list, validation rules,
 * and default values aligned with the real StudentProfile schema.
 */

const studentImportConfig = {
  entity: 'student',

  // ── Required fields — these MUST be present in every row ─────────────────
  requiredFields: [
    'firstName',
    'lastName',
    'dateOfBirth',
    'fatherName',
    'fatherPhone',
    'className',
    'sectionName',
    'sessionName',
    'address',
  ],

  // ── Column aliases — maps Excel header variations → internal field name ──
  // Schools write headers in many different ways — all are handled here
  columnAliases: {
    // ── Name ──────────────────────────────────────────────────────────────
    firstName:   ['First Name', 'first_name', 'fname', 'प्रथम नाम', 'First', 'Given Name'],
    middleName:  ['Middle Name', 'middle_name', 'mname', 'मध्य नाम'],
    lastName:    ['Last Name', 'last_name', 'lname', 'surname', 'Surname', 'Family Name', 'उपनाम'],

    // ── Full name split helper (engine splits on space if only fullName present)
    fullName:    ['Full Name', 'full_name', 'Name', 'Student Name', 'विद्यार्थी नाम', 'Student', 'Nama'],

    // ── Academic ──────────────────────────────────────────────────────────
    className:   ['Class', 'Grade', 'Standard', 'class_name', 'Class Name', 'Std', 'कक्षा', 'Class/Sec'],
    sectionName: ['Section', 'Sec', 'Division', 'Div', 'section_name', 'वर्ग', 'Group'],
    sessionName: ['Session', 'Academic Year', 'Year', 'session_name', 'Academic Session', 'सत्र', 'AcademicYear'],

    // ── IDs ───────────────────────────────────────────────────────────────
    admissionNumber: ['Admission No', 'Admission Number', 'Adm No', 'Adm. No.', 'admission_no', 'AdmNo', 'प्रवेश संख्या'],
    rollNo:          ['Roll No', 'Roll Number', 'roll_no', 'Roll', 'Cr No', 'क्रमांक'],
    studentId:       ['Student ID', 'student_id', 'Stu ID', 'ID'],
    scholarNo:       ['Scholar No', 'scholar_no', 'Scholar Number', 'शाला प्रवेश क्रमांक'],
    pen:             ['PEN', 'Permanent Education Number', 'pen_no'],

    // ── Personal ──────────────────────────────────────────────────────────
    dateOfBirth:  ['DOB', 'Date of Birth', 'dob', 'date_of_birth', 'Birth Date', 'BirthDate', 'जन्म तिथि', 'D.O.B'],
    gender:       ['Gender', 'Sex', 'लिंग', 'gender'],
    category:     ['Category', 'Caste Category', 'cat', 'SC/ST/OBC', 'वर्ग'],
    religion:     ['Religion', 'धर्म'],
    caste:        ['Caste', 'जाति'],
    bloodGroup:   ['Blood Group', 'blood_group', 'Blood', 'रक्त समूह'],
    nationality:  ['Nationality', 'राष्ट्रीयता'],
    motherTongue: ['Mother Tongue', 'mother_tongue', 'मातृभाषा'],
    aadharCard:   ['Aadhar', 'Aadhaar', 'Aadhar No', 'Aadhaar Number', 'aadhar_no', 'आधार'],
    ssmId:        ['SSM ID', 'ssm_id', 'Samagra ID', 'समग्र आईडी'],
    familyId:     ['Family ID', 'family_id', 'समग्र परिवार आईडी'],
    rte:          ['RTE', 'Is RTE', 'rte_student', 'आरटीई'],

    // ── Contact ──────────────────────────────────────────────────────────
    phone:        ['Phone', 'Mobile', 'Contact', 'phone_no', 'मोबाइल', 'Phone No'],
    email:        ['Email', 'Email ID', 'email_id', 'ईमेल'],
    address:      ['Address', 'Full Address', 'पता', 'Addr', 'address1'],
    addressLine2: ['Address 2', 'Address Line 2', 'address2', 'address_line2'],
    city:         ['City', 'Town', 'शहर'],
    state:        ['State', 'राज्य'],
    pincode:      ['Pincode', 'PIN', 'Zip', 'zip_code', 'पिन'],

    // ── Parent ───────────────────────────────────────────────────────────
    fatherName:        ['Father Name', "Father's Name", 'father_name', 'पिता का नाम', 'Dad Name', 'Papa Name'],
    fatherPhone:       ['Father Phone', "Father's Phone", 'father_phone', 'father_mobile', 'पिता का मोबाइल'],
    fatherEmail:       ['Father Email', "Father's Email", 'father_email'],
    fatherOccupation:  ['Father Occupation', 'father_occupation', "Father's Job"],
    fatherIncome:      ['Father Income', 'Annual Income', 'father_income'],
    motherName:        ['Mother Name', "Mother's Name", 'mother_name', 'माता का नाम'],
    motherPhone:       ['Mother Phone', "Mother's Phone", 'mother_phone', 'mother_mobile'],
    guardianName:      ['Guardian Name', 'guardian_name', 'अभिभावक'],
    guardianPhone:     ['Guardian Phone', 'guardian_phone'],
    guardianRelation:  ['Guardian Relation', 'guardian_relation'],

    // ── Transport / Hostel ────────────────────────────────────────────────
    transportRequired: ['Transport', 'Bus Required', 'transport_required', 'School Bus'],
    pickupPoint:       ['Pickup Point', 'Bus Stop', 'pickup_point'],
    routeNo:           ['Route No', 'Bus Route', 'route_no'],
    hostelRequired:    ['Hostel', 'hostel_required', 'Day Scholar'],

    // ── Health ────────────────────────────────────────────────────────────
    healthIssues:   ['Health Issues', 'Medical Issues', 'health_issues'],
    allergies:      ['Allergies', 'allergies'],
    disabilityType: ['Disability', 'disability_type'],

    // ── Previous School ───────────────────────────────────────────────────
    previousSchool: ['Previous School', 'Last School', 'prev_school', 'पूर्व विद्यालय'],
    previousClass:  ['Previous Class', 'Last Class', 'prev_class'],

    // ── Stream (11th/12th only) ───────────────────────────────────────────
    stream: ['Stream', 'Faculty', 'stream'],

    // ── Remarks ───────────────────────────────────────────────────────────
    remarks: ['Remarks', 'Notes', 'Comment', 'टिप्पणी'],
  },

  // ── Field validation rules ─────────────────────────────────────────────────
  fieldRules: {
    firstName:   { type: 'string', maxLength: 100 },
    lastName:    { type: 'string', maxLength: 100 },
    dateOfBirth: { type: 'date' },
    gender: {
      type: 'enum',
      values: ['male', 'female', 'other', 'm', 'f', 'M', 'F', 'Male', 'Female', 'Other', 'MALE', 'FEMALE'],
    },
    category: {
      type: 'enum',
      values: ['General', 'OBC', 'SC', 'ST', 'EWS', 'GEN', 'Gen', 'general', 'obc', 'sc', 'st', 'ews'],
    },
    bloodGroup: {
      type: 'enum',
      values: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''],
    },
    stream: {
      type: 'enum',
      values: ['Science', 'Commerce', 'Arts', 'science', 'commerce', 'arts', ''],
    },
    email:    { type: 'email' },
    phone:    { type: 'string', maxLength: 20 },
    pincode:  { type: 'string', maxLength: 10 },
    address:  { type: 'string', maxLength: 500 },
    rollNo:   { type: 'string', maxLength: 50 },
  },

  // ── Normalization rules — applied before validation ───────────────────────
  normalizationRules: {
    // Auto-trim all string fields
    trimStrings: true,

    // Default values for fields not provided in Excel
    defaults: {
      nationality:  'Indian',
      status:       'active',
      rte:          false,
    },

    // Field-specific normalizations
    transformations: {
      // Gender: normalize to lowercase
      gender: (v) => {
        const map = { m: 'male', f: 'female', male: 'male', female: 'female', other: 'other' };
        return map[String(v || '').toLowerCase().trim()] || v;
      },
      // Category: normalize common variations
      category: (v) => {
        const map = { gen: 'General', general: 'General', obc: 'OBC', sc: 'SC', st: 'ST', ews: 'EWS' };
        return map[String(v || '').toLowerCase().trim()] || v;
      },
      // Stream: normalize
      stream: (v) => {
        const map = { science: 'Science', commerce: 'Commerce', arts: 'Arts' };
        return map[String(v || '').toLowerCase().trim()] || v || null;
      },
      // Blood group: uppercase
      bloodGroup: (v) => String(v || '').toUpperCase().trim(),
      // RTE: boolean
      rte: (v) => v === true || String(v).toLowerCase() === 'true' || String(v) === '1',
      // Transport/Hostel: boolean
      transportRequired: (v) => v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'yes',
      hostelRequired:    (v) => v === true || String(v).toLowerCase() === 'true' || String(v).toLowerCase() === 'yes',
    },
  },

  // ── Reference fields — resolved from name to ObjectId ─────────────────────
  references: {
    sessionId: { sourceField: 'sessionName', model: 'AcademicSession' },
    classId:   { sourceField: 'className',   model: 'ClassModel' },
    sectionId: { sourceField: 'sectionName', model: 'SectionModel' },
  },

  // ── Duplicate detection config ─────────────────────────────────────────────
  duplicateCheck: {
    mode:   'skip',  // skip duplicates — school gets a clear list of what was skipped
    fields: ['admissionNumber', 'email'],
  },

  // ── Batch processing ──────────────────────────────────────────────────────
  batchSize: 50,  // process 50 students per batch

  // ── Import settings ──────────────────────────────────────────────────────
  settings: {
    autoAssignFees:  true,   // fire-and-forget fee assignment
    sendWelcomeEmail: false, // no email during bulk import
    maxRows:         10000,
  },
};

module.exports = studentImportConfig;
