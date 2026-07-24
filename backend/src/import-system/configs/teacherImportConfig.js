/**
 * teacherImportConfig — Field rules for teacher bulk import
 */

const teacherImportConfig = {
  entity: 'teacher',

  requiredFields: ['firstName', 'lastName', 'email', 'phone'],

  columnAliases: {
    // Name
    firstName:   ['First Name', 'first_name', 'fname', 'Given Name', 'प्रथम नाम'],
    middleName:  ['Middle Name', 'middle_name', 'mname'],
    lastName:    ['Last Name', 'last_name', 'lname', 'Surname', 'उपनाम'],
    fullName:    ['Full Name', 'full_name', 'Name', 'Teacher Name', 'शिक्षक नाम'],

    // IDs
    employeeId: ['Employee ID', 'Emp ID', 'employee_id', 'EmpNo', 'Staff ID'],
    teacherId:  ['Teacher ID', 'teacher_id', 'TCH ID'],

    // Contact
    email:          ['Email', 'Email ID', 'email_id', 'ईमेल'],
    phone:          ['Phone', 'Mobile', 'Contact', 'phone_no', 'मोबाइल'],
    alternatePhone: ['Alt Phone', 'alternate_phone', 'Other Phone'],

    // Personal
    gender:       ['Gender', 'Sex', 'लिंग'],
    dateOfBirth:  ['DOB', 'Date of Birth', 'dob', 'जन्म तिथि'],
    bloodGroup:   ['Blood Group', 'blood_group'],
    category:     ['Category', 'cat', 'SC/ST/OBC'],
    nationality:  ['Nationality'],
    religion:     ['Religion'],
    caste:        ['Caste'],
    maritalStatus:['Marital Status', 'marital_status'],
    aadharCard:   ['Aadhar', 'Aadhaar', 'Aadhar No'],
    panCard:      ['PAN', 'PAN No', 'pan_card'],

    // Address
    address:     ['Address', 'पता'],
    addressLine2:['Address 2', 'address2'],
    city:        ['City', 'शहर'],
    state:       ['State', 'राज्य'],
    pincode:     ['Pincode', 'PIN'],

    // Professional
    qualification:  ['Qualification', 'Education', 'योग्यता'],
    specialization: ['Specialization', 'Subject', 'specialization'],
    experience:     ['Experience', 'Years of Experience', 'Exp', 'Years'],
    department:     ['Department', 'Dept', 'विभाग'],
    designation:    ['Designation', 'Post', 'पद'],
    joiningDate:    ['Joining Date', 'joining_date', 'Date of Joining', 'DOJ'],

    // Family
    fatherName:  ['Father Name', 'father_name'],
    motherName:  ['Mother Name', 'mother_name'],
    spouseName:  ['Spouse Name', 'spouse_name', 'Wife/Husband Name'],

    // Bank
    accountNumber: ['Account No', 'Account Number', 'bank_account'],
    bankName:      ['Bank Name', 'bank_name'],
    ifsc:          ['IFSC', 'IFSC Code', 'ifsc_code'],
    branchName:    ['Branch', 'Branch Name', 'branch_name'],

    // Salary
    salaryBasic:     ['Basic Salary', 'Basic', 'salary_basic'],
    salaryHra:       ['HRA', 'House Rent', 'hra'],
    salaryTransport:  ['Transport Allowance', 'Transport', 'ta'],
    salaryTotal:     ['Total Salary', 'Gross Salary', 'salary'],

    // Statutory
    panNumber:  ['PAN Number', 'pan_number'],
    uanNumber:  ['UAN', 'UAN Number', 'uan_number'],
    esiNumber:  ['ESI', 'ESI Number', 'esi_number'],

    remarks: ['Remarks', 'Notes'],
  },

  fieldRules: {
    firstName:   { type: 'string', maxLength: 100 },
    lastName:    { type: 'string', maxLength: 100 },
    email:       { type: 'email' },
    phone:       { type: 'string', maxLength: 20 },
    dateOfBirth: { type: 'date' },
    joiningDate: { type: 'date' },
    experience:  { type: 'number' },
    gender: {
      type: 'enum',
      values: ['male', 'female', 'other', 'Male', 'Female', 'Other', 'M', 'F'],
    },
    category: {
      type: 'enum',
      values: ['General', 'OBC', 'SC', 'ST', 'EWS', 'GEN', ''],
    },
    maritalStatus: {
      type: 'enum',
      values: ['single', 'married', 'divorced', 'widowed', 'Single', 'Married', ''],
    },
  },

  normalizationRules: {
    trimStrings: true,
    defaults: {
      nationality: 'Indian',
      status:      'active',
    },
    transformations: {
      gender: (v) => {
        const map = { m: 'male', f: 'female', male: 'male', female: 'female', other: 'other' };
        return map[String(v || '').toLowerCase().trim()] || v;
      },
      category: (v) => {
        const map = { gen: 'General', general: 'General', obc: 'OBC', sc: 'SC', st: 'ST', ews: 'EWS' };
        return map[String(v || '').toLowerCase().trim()] || v;
      },
      maritalStatus: (v) => String(v || '').toLowerCase().trim(),
      bloodGroup: (v) => String(v || '').toUpperCase().trim(),
      experience: (v) => isNaN(Number(v)) ? undefined : Number(v),
    },
  },

  duplicateCheck: {
    mode:   'skip',
    fields: ['email'],
  },

  batchSize: 50,

  settings: {
    maxRows: 5000,
  },
};

module.exports = teacherImportConfig;
