const mongoose = require('mongoose');

// All possible fields that can appear on an admission form
const ALL_FIELDS = [
  'name', 'emailAddress', 'mobileNo', 'whatsappNo', 'alternateNumber', 'admissionNo',
  'registrationNo', 'srnNo', 'generalRegistrationNo', 'enrollmentNo', 'srNo',
  'houseBlock', 'pincode', 'aadharNo', 'religion', 'admissionType',
  'rteApplicationNo', 'schoolTotalFees', 'paidFees', 'balanceFees', 'grossTotalFees',
  'fine', 'discount', 'discountHead',
  'fatherName', 'fatherQualification', 'fatherOccupation', 'fatherPhone', 'fatherEmail',
  'fatherOfficialAddress', 'fatherIncome', 'fatherAadharNo',
  'motherName', 'motherQualification', 'motherOccupation', 'motherPhone', 'motherEmail',
  'motherResidentialAddress', 'motherOfficialAddress',
  'guardianName', 'guardianQualification', 'guardianOccupation', 'guardianPhone', 'guardianEmail',
  'guardianResidentialAddress', 'guardianOfficialAddress', 'guardianIncome', 'guardianMobile',
  'guardianAadharNo',
  'className', 'classesSection', 'stream', 'medium', 'gender', 'address', 'city', 'state',
  'country', 'caste', 'category', 'placeOfBirth', 'dateOfBirth', 'bloodGroup',
  'nationality', 'isRteStudent', 'isBplStudent', 'childWithSpecialNeeds',
  'attendedSchool', 'lastSession', 'rollNo', 'penNo', 'srNo2',
  'transport', 'transportFees', 'schoolAffiliated',
  'schoolTotalFeesField', 'transferCertificateNo', 'transferCertificateDate',
  'admissionDate', 'scholarshipId', 'scholarshipPassword',
  'domicileApplicationNo', 'incomeApplicationNo', 'casteApplicationNo',
  'samagroId', 'govtFamilyId', 'enrolledStudentId',
  'bankAccountNo', 'bankName', 'bankBranch', 'bankIfsc',
  'officialBankName', 'officialBankAccountNo', 'officialBankBranch', 'officialBankIfsc',
  'officialAccountHolder', 'accountHolder', 'officialArt',
  'panNo', 'biometricCode',
  'height', 'weight',
  'enrolledYear', 'enrolledClasses', 'referredBy',
  'dropout', 'dropoutReason', 'dropoutDate',
  'status', 'accountCreationDate', 'lastActive',
];

const admissionFormSettingsSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    unique: true,
    index: true,
  },
  // Array of field keys that ARE visible on the printed form
  // Defaults to all fields enabled
  visibleFields: {
    type: [String],
    default: () => [...ALL_FIELDS],
  },

  // Dynamic Template Selection (NEW — fully backward-compatible)
  // Points to the AdmissionTemplate currently selected as the school's default.
  // If null, the system falls back to the built-in static form (legacy behavior).
  activeTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdmissionTemplate',
    default: null,
  },

  // Optional school branding info passed into PDF generation
  schoolProfile: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Custom Registration Form Layout (school-specific)
  // Ordered list of field descriptors that control what RegisterStudent.jsx shows.
  // Each item: { key, label, type, options?, required?, colSpan?, section? }
  // If this array is empty / absent, the default multi-section layout is used.
  registrationFormConfig: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('AdmissionFormSettings', admissionFormSettingsSchema);
module.exports.ALL_FIELDS = ALL_FIELDS;
