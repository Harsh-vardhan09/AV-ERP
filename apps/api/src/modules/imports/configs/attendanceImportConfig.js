/**
 * Attendance Import Configuration
 *
 * The Attendance model is NOT one document per student. It is one document per
 * class+section+date+attendanceType carrying an embedded records[] array. One CSV
 * row therefore describes one entry inside that array, and AttendanceAdapter is
 * responsible for grouping rows onto the right parent document.
 *
 * Class/section/session are optional in the file: when omitted they are taken from
 * the student's own profile, which is where the school already maintains them.
 * When supplied they are resolved by name and cross-checked against the student,
 * so a row that would file attendance against the wrong class fails loudly.
 */

const { DATA_TYPES, VALIDATION_STRICTNESS } = require('../constants/importConstants');

// The model's enum is the authority — attendance/models/attendance.js records.status.
// 'half-day' is NOT a valid status there; it used to be listed here and every row
// using it was written to fail at the model.
const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'leave'];

// What schools actually type. Keys are compared lowercased and trimmed.
const STATUS_SYNONYMS = {
  p: 'present',
  pr: 'present',
  present: 'present',
  a: 'absent',
  ab: 'absent',
  absent: 'absent',
  l: 'late',
  late: 'late',
  lv: 'leave',
  leave: 'leave',
  'on leave': 'leave',
  h: 'leave',
  holiday: 'leave',
};

/** Map any accepted spelling of a status onto the model's enum. null = unusable. */
const normalizeStatus = (raw) => {
  if (raw === null || raw === undefined) return null;
  const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (!key) return null;
  return STATUS_SYNONYMS[key] || (ATTENDANCE_STATUSES.includes(key) ? key : null);
};

const ATTENDANCE_IMPORT_CONFIG = {
  entity: 'attendance',
  name: 'Attendance',
  description: 'Import daily student attendance',
  version: '2.0',

  requiredFields: ['studentId', 'date', 'status'],
  optionalFields: ['className', 'sectionName', 'sessionName', 'attendanceType', 'remarks'],

  // Header spellings a school will realistically paste. ColumnMapper compares these
  // case-insensitively against the file's headers, so "Admission No" now maps —
  // previously only the underscore forms were listed and every row lost studentId,
  // which is what made 100% of rows report invalid.
  columnAliases: {
    studentId: [
      'student_id',
      'student id',
      'admission_no',
      'admission no',
      'admission number',
      'admissionno',
      'admission_number',
      'admissionnumber',
      'adm no',
      'adm_no',
      'roll_no',
      'roll no',
      'rollno',
      'roll number',
      'roll_number',
      'scholar no',
      'scholar_no',
    ],
    date: ['attendance_date', 'attendance date', 'day', 'dated'],
    status: ['attendance_status', 'attendance status', 'present_absent', 'p/a', 'mark'],
    className: ['class', 'class_name', 'class name', 'std', 'standard', 'grade'],
    sectionName: ['section', 'section_name', 'section name', 'sec', 'division'],
    sessionName: [
      'session',
      'session_name',
      'session name',
      'academic_session',
      'academic session',
    ],
    attendanceType: ['attendance_type', 'attendance type', 'type'],
    remarks: ['remark', 'note', 'notes', 'comment', 'comments', 'reason'],
  },

  fieldRules: {
    studentId: { required: true, type: DATA_TYPES.STRING },
    date: { required: true, type: DATA_TYPES.DATE },
    status: { required: true, type: DATA_TYPES.ENUM, enum: ATTENDANCE_STATUSES },
    remarks: { type: DATA_TYPES.STRING, maxLength: 500 },
  },

  transformationRules: {
    studentId: { transformations: ['trim'] },
    status: { transformations: ['trim', 'lowercase'] },
    className: { transformations: ['trim'] },
    sectionName: { transformations: ['trim'] },
    remarks: { transformations: ['trim'] },
  },

  normalizationRules: { defaults: {} },

  // Resolution is done inside AttendanceAdapter, batched per import run — a
  // declarative single-field reference cannot express "admission number OR roll
  // number, then cross-check class/section".
  references: {},

  businessRules: {
    // Migrations 07 and 08 dropped the unique attendance index and moved duplicate
    // prevention into application logic, so the adapter owns this.
    checkDuplicates: true,
    duplicateMode: 'update',
    uniqueKeys: ['studentId', 'date'],
  },

  // Registered by init.js — see adapters/attendanceAdapter.js
  adapter: null,

  duplicateMode: 'update',
  validationStrictness: VALIDATION_STRICTNESS.STRICT,
  maxRowsPerBatch: 5000,

  errorMessages: {
    INVALID_DATE: 'Invalid date format',
    INVALID_STATUS: 'Invalid attendance status',
    STUDENT_NOT_FOUND: 'Student not found',
    DUPLICATE_RECORD: 'Attendance already recorded for this student on this date',
  },

  // Drives the downloadable template (GET /api/v1/import/template/attendance).
  templateColumns: [
    {
      column: 'Admission No',
      field: 'studentId',
      required: true,
      help: 'Admission number or roll number of the student',
    },
    { column: 'Date', field: 'date', required: true, help: 'DD/MM/YYYY or YYYY-MM-DD' },
    {
      column: 'Status',
      field: 'status',
      required: true,
      help: 'P/A/L or Present/Absent/Late/Leave',
    },
    {
      column: 'Class',
      field: 'className',
      required: false,
      help: 'Optional — defaults to the student’s class',
    },
    {
      column: 'Section',
      field: 'sectionName',
      required: false,
      help: 'Optional — defaults to the student’s section',
    },
    { column: 'Remarks', field: 'remarks', required: false, help: 'Optional free text' },
  ],

  sampleData: [
    {
      studentId: 'ADM-2500001',
      date: '15/01/2025',
      status: 'P',
      className: '',
      sectionName: '',
      remarks: '',
    },
    {
      studentId: 'ADM-2500002',
      date: '15/01/2025',
      status: 'A',
      className: '',
      sectionName: '',
      remarks: 'Informed by parent',
    },
    {
      studentId: 'ADM-2500003',
      date: '15/01/2025',
      status: 'Late',
      className: '',
      sectionName: '',
      remarks: 'Bus delay',
    },
  ],
};

module.exports = ATTENDANCE_IMPORT_CONFIG;
module.exports.ATTENDANCE_STATUSES = ATTENDANCE_STATUSES;
module.exports.normalizeStatus = normalizeStatus;
