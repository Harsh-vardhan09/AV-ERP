// Writes the ordered registration-form field config for school HMHSS00022.
// Field order and labels mirror that school's physical form

require('dotenv').config();
const mongoose = require('mongoose');

// Models
const School = require('../src-old/models/School');
const AdmissionFormSettings = require('../src-old/models/AdmissionFormSettings');

// Field config — exact order from screenshot
// type values: 'text' | 'date' | 'radio' | 'checkbox' | 'select' | 'class'
// colSpan: 1 (half-width), 2 (full-width)
const HMHSS_FIELDS = [
  // Row 1: Date + Scholar No
  { key: 'admissionDate',       label: 'Date',                          type: 'date',     colSpan: 1 },
  { key: 'scholarNo',           label: 'Scholar No.',                   type: 'text',     colSpan: 1 },

  // Row 2: Student Name (full-width combined first+middle+last)
  { key: 'studentName',         label: "Student's Name",                type: 'name',     colSpan: 2 },

  // Row 3-5: Parents
  { key: 'fatherName',          label: "Father's Name",                 type: 'text',     colSpan: 2, required: true },
  { key: 'motherName',          label: "Mother's Name",                 type: 'text',     colSpan: 2 },

  // Row 6-7: DOB + Gender
  { key: 'dateOfBirth',         label: 'Date of Birth',                 type: 'date',     colSpan: 1, required: true },
  { key: 'gender',              label: 'Gender',                        type: 'radio',    colSpan: 1, options: ['M', 'F'] },

  // Row 8-9: Class + RTE
  { key: 'classId',             label: 'Admission Class',               type: 'class',    colSpan: 1, required: true },
  { key: 'rte',                 label: 'RTE Admission',                 type: 'radio',    colSpan: 1, options: ['Yes', 'No'] },

  // Row 10: Mobile 1 & 2
  { key: 'phone',               label: 'Mobile Number 1.',              type: 'text',     colSpan: 1 },
  { key: 'alternateNumber',     label: 'Mobile Number 2.',              type: 'text',     colSpan: 1 },

  // Row 11-12: Samagra + Family ID
  { key: 'ssmId',               label: 'Samagra ID',                    type: 'text',     colSpan: 2 },
  { key: 'familyId',            label: 'Family ID',                     type: 'text',     colSpan: 2 },

  // Row 13-14: Caste + Category
  { key: 'caste',               label: 'Caste',                         type: 'text',     colSpan: 1 },
  { key: 'category',            label: 'Category',                      type: 'radio',    colSpan: 1, options: ['Gen', 'OBC', 'ST', 'SC'] },

  // Row 15-16: Caste Certificate
  { key: 'casteApplicationNo',  label: 'Caste Certificate No.',         type: 'text',     colSpan: 2 },
  { key: 'casteApplicationDate',label: 'Caste Certificate Issue Date',  type: 'date',     colSpan: 1 },
  { key: 'religion',            label: 'Religion',                      type: 'radio',    colSpan: 1, options: ['Hindu', 'Muslim'] },

  // Row 17: BPL
  { key: 'bplStudent',          label: 'BPL Card',                      type: 'radio',    colSpan: 1, options: ['Yes', 'No'] },
  { key: 'bplCardNo',           label: 'BPL Card No.',                  type: 'text',     colSpan: 1 },

  // Row 18-21: Aadhar cards
  { key: 'aadharCard',          label: "Student's Aadhar Card No.",     type: 'text',     colSpan: 2 },
  { key: 'fatherAadharCard',    label: "Father's Aadhar Card No.",      type: 'text',     colSpan: 2 },
  { key: 'motherAadharCard',    label: "Mother's Aadhar Card No.",      type: 'text',     colSpan: 2 },

  // Row 22-23: APAAR + PEN
  { key: 'apaarId',             label: 'Apaar ID No.',                  type: 'text',     colSpan: 2 },
  { key: 'penNo',               label: 'PEN (Permanent Education Number)', type: 'text',  colSpan: 2 },

  // Row 24-25: Board + Ladli
  { key: 'boardEnrollNo',       label: 'Board Enrollment No.',          type: 'text',     colSpan: 2 },
  { key: 'ladliLaxmiNo',        label: 'Ladli Laxmi Card No.',          type: 'text',     colSpan: 2 },

  // Row 26-28: Bank
  { key: 'bankName',            label: 'Bank Name',                     type: 'text',     colSpan: 1 },
  { key: 'ifsc',                label: 'IFSC Code',                     type: 'text',     colSpan: 1 },
  { key: 'accountNumber',       label: 'Account Number',                type: 'text',     colSpan: 2 },

  // Row 29: Occupation + Income
  { key: 'fatherOccupation',    label: 'Occupation',                    type: 'text',     colSpan: 1 },
  { key: 'fatherIncome',        label: 'Income',                        type: 'text',     colSpan: 1 },

  // Row 30-33: Previous School info
  { key: 'previousSchool',      label: 'Previous School',               type: 'text',     colSpan: 2 },
  { key: 'diseCode',            label: 'Dise Code',                     type: 'text',     colSpan: 1 },
  { key: 'previousClass',       label: 'Class',                         type: 'text',     colSpan: 1 },
  { key: 'previousResult',      label: 'Result',                        type: 'radio',    colSpan: 2, options: ['Pass', 'Fail'] },

  // Row 34: Address (full-width)
  { key: 'address',             label: 'Address',                       type: 'text',     colSpan: 2, required: true },
];

// Main
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB');

  const school = await School.findByCode('HMHSS00022');
  if (!school) {
    console.error('✗ School HMHSS00022 not found. Make sure it exists in the DB.');
    process.exit(1);
  }
  console.log(`✓ Found school: ${school.name} (${school._id})`);

  const result = await AdmissionFormSettings.findOneAndUpdate(
    { schoolId: school._id },
    { $set: { registrationFormConfig: HMHSS_FIELDS } },
    { new: true, upsert: true }
  );

  console.log(`✓ Saved registrationFormConfig with ${result.registrationFormConfig.length} fields`);
  console.log('Fields:', result.registrationFormConfig.map((f, i) => `  ${i + 1}. ${f.label} [${f.key}]`).join('\n'));

  await mongoose.disconnect();
  console.log('\n✓ Done! HMHSS00022 registration form config is set.');
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
