/**
 * Pre-extracted templateSchema for each bundled report card template.
 *
 * Shape mirrors seedDemo.js TEMPLATE_SCHEMA exactly:
 *   fields[]      { name, label, category, isLoop, subject?, component? }
 *   marksFields[] names of category:'marks' fields
 *   metaFields[]  names of category:'meta' fields
 *   subjectBlock  { start, end }
 *
 * Shipping these means teachers see the mapped fields immediately instead of
 * waiting for TemplateFieldExtractor to run on first save.
 *
 * category values must stay within the ReportTemplate enum:
 *   marks | meta | attendance | derived | other
 */

// ── Shared header/footer meta present in all three templates ────────────────
const COMMON_META = [
  { name: 'school-logo',      label: 'School Logo',      category: 'meta', isLoop: false },
  { name: 'school-name',      label: 'School Name',      category: 'meta', isLoop: false },
  { name: 'board-logo',       label: 'Board Logo',       category: 'meta', isLoop: false },
  { name: 'session',          label: 'Academic Session', category: 'meta', isLoop: false },
  { name: 'class',            label: 'Class',            category: 'meta', isLoop: false },
  { name: 'student-name',     label: 'Student Name',     category: 'meta', isLoop: false },
  { name: 'rollNo',           label: 'Roll No',          category: 'meta', isLoop: false },
  { name: 'admissionNumber',  label: 'Admission No',     category: 'meta', isLoop: false },
  { name: 'dob',              label: 'Date Of Birth',    category: 'meta', isLoop: false },
];

const COMMON_META_NAMES = COMMON_META.map(f => f.name);

const SUBJECT_BLOCK = { start: '{{#subjects}}', end: '{{/subjects}}' };

// ═══════════════════════════════════════════════════════════════════════════
// 1. CBSE Two-Term Scholastic
// ═══════════════════════════════════════════════════════════════════════════
// Marks fields map to ExamSubjectConfig.marksDistribution component types.
// A school wanting this layout defines components named:
//   pertest | nb | se | halfyearly   (Term I)
//   pertest | nb | se | yearly       (Term II)
// The aggregator emits t1_<type> / t2_<type> per subject row automatically.
const CBSE_TWO_TERM = {
  fields: [
    ...COMMON_META,
    { name: 'father-name',    label: "Father's Name",  category: 'meta', isLoop: false },
    { name: 'mother-name',    label: "Mother's Name",  category: 'meta', isLoop: false },
    { name: 'address',        label: 'Address',        category: 'meta', isLoop: false },
    { name: 'student-photo',  label: 'Student Photo',  category: 'meta', isLoop: false },

    // Scholastic loop — Term I
    { name: 't1_pertest',    label: 'T1 Per Test',    category: 'marks', isLoop: true, subject: '', component: 'pertest'    },
    { name: 't1_nb',         label: 'T1 Note Book',   category: 'marks', isLoop: true, subject: '', component: 'nb'         },
    { name: 't1_se',         label: 'T1 Subject Enr', category: 'marks', isLoop: true, subject: '', component: 'se'         },
    { name: 't1_halfyearly', label: 'T1 Half Yearly', category: 'marks', isLoop: true, subject: '', component: 'halfyearly' },
    { name: 't1_total',      label: 'T1 Total',       category: 'derived', isLoop: true },

    // Scholastic loop — Term II
    { name: 't2_pertest',    label: 'T2 Per Test',    category: 'marks', isLoop: true, subject: '', component: 'pertest' },
    { name: 't2_nb',         label: 'T2 Note Book',   category: 'marks', isLoop: true, subject: '', component: 'nb'      },
    { name: 't2_se',         label: 'T2 Subject Enr', category: 'marks', isLoop: true, subject: '', component: 'se'      },
    { name: 't2_yearly',     label: 'T2 Yearly Exam', category: 'marks', isLoop: true, subject: '', component: 'yearly'  },
    { name: 't2_total',      label: 'T2 Total',       category: 'derived', isLoop: true },

    // Overall (loop)
    { name: 'grandtotal',    label: 'Grand Total',    category: 'derived', isLoop: true },
    { name: 'grade',         label: 'Subject Grade',  category: 'derived', isLoop: true },
    { name: 'name',          label: 'Subject Name',   category: 'derived', isLoop: true },

    // Summary strip
    { name: 'attendance.str', label: 'Attendance',       category: 'attendance', isLoop: false },
    { name: 'total-marks',    label: 'Overall Total',    category: 'derived',    isLoop: false },
    { name: 'percentage',     label: 'Overall %',        category: 'derived',    isLoop: false },
    { name: 'overall-grade',  label: 'Overall Grade',    category: 'derived',    isLoop: false },
    { name: 'result',         label: 'Result',           category: 'derived',    isLoop: false },
  ],
  marksFields: [
    't1_pertest', 't1_nb', 't1_se', 't1_halfyearly',
    't2_pertest', 't2_nb', 't2_se', 't2_yearly',
  ],
  metaFields: [...COMMON_META_NAMES, 'father-name', 'mother-name', 'address', 'student-photo'],
  subjectBlock: SUBJECT_BLOCK,
  // Extra loops beyond {{#subjects}} — documented so the UI can surface them.
  coScholasticBlocks: [
    { name: 'co_scholastic_a', label: 'Co-Scholastic Part A', start: '{{#co_scholastic_a}}', end: '{{/co_scholastic_a}}' },
    { name: 'co_scholastic_b', label: 'Co-Scholastic Part B', start: '{{#co_scholastic_b}}', end: '{{/co_scholastic_b}}' },
    { name: 'co_scholastic_c', label: 'Co-Scholastic Part C', start: '{{#co_scholastic_c}}', end: '{{/co_scholastic_c}}' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. Single-Term Numeric
// ═══════════════════════════════════════════════════════════════════════════
const SINGLE_TERM_NUMERIC = {
  fields: [
    ...COMMON_META,
    { name: 'section',       label: 'Section',        category: 'meta', isLoop: false },
    { name: 'father-name',   label: "Father's Name",  category: 'meta', isLoop: false },
    { name: 'mother-name',   label: "Mother's Name",  category: 'meta', isLoop: false },

    { name: 'name',          label: 'Subject Name',   category: 'derived', isLoop: true },
    { name: 't1_total',      label: 'Formative (FA)', category: 'marks',   isLoop: true, subject: '', component: 'total' },
    { name: 't2_total',      label: 'Summative (SA)', category: 'marks',   isLoop: true, subject: '', component: 'total' },
    { name: 'total',         label: 'Subject Total',  category: 'derived', isLoop: true },
    { name: 'grandMax',      label: 'Max Marks',      category: 'derived', isLoop: true },
    { name: 'grade',         label: 'Subject Grade',  category: 'derived', isLoop: true },

    { name: 'attendance.str', label: 'Attendance',    category: 'attendance', isLoop: false },
    { name: 'total-marks',    label: 'Total',         category: 'derived',    isLoop: false },
    { name: 'percentage',     label: 'Percentage',    category: 'derived',    isLoop: false },
    { name: 'overall-grade',  label: 'Overall Grade', category: 'derived',    isLoop: false },
    { name: 'result',         label: 'Result',        category: 'derived',    isLoop: false },
    { name: 'remarks',        label: 'Remarks',       category: 'other',      isLoop: false },
  ],
  marksFields: ['t1_total', 't2_total'],
  metaFields: [...COMMON_META_NAMES, 'section', 'father-name', 'mother-name'],
  subjectBlock: SUBJECT_BLOCK,
  coScholasticBlocks: [
    { name: 'co_scholastic', label: 'Co-Scholastic', start: '{{#co_scholastic}}', end: '{{/co_scholastic}}' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. Compact Grade Card
// ═══════════════════════════════════════════════════════════════════════════
const COMPACT_GRADE_CARD = {
  fields: [
    { name: 'school-logo',   label: 'School Logo',    category: 'meta', isLoop: false },
    { name: 'school-name',   label: 'School Name',    category: 'meta', isLoop: false },
    { name: 'session',       label: 'Academic Session', category: 'meta', isLoop: false },
    { name: 'student-name',  label: 'Student Name',   category: 'meta', isLoop: false },
    { name: 'class',         label: 'Class',          category: 'meta', isLoop: false },
    { name: 'section',       label: 'Section',        category: 'meta', isLoop: false },
    { name: 'rollNo',        label: 'Roll No',        category: 'meta', isLoop: false },

    { name: 'name',          label: 'Subject Name',   category: 'derived', isLoop: true },
    { name: 'grade',         label: 'Subject Grade',  category: 'derived', isLoop: true },

    { name: 'attendance.str', label: 'Attendance',    category: 'attendance', isLoop: false },
    { name: 'overall-grade',  label: 'Overall Grade', category: 'derived',    isLoop: false },
    { name: 'result',         label: 'Result',        category: 'derived',    isLoop: false },
    { name: 'remarks',        label: 'Remarks',       category: 'other',      isLoop: false },
  ],
  marksFields: [],   // grade-only card — no raw marks tokens
  metaFields: ['school-logo', 'school-name', 'session', 'student-name', 'class', 'section', 'rollNo'],
  subjectBlock: SUBJECT_BLOCK,
  coScholasticBlocks: [
    { name: 'co_scholastic', label: 'Personal & Social Qualities', start: '{{#co_scholastic}}', end: '{{/co_scholastic}}' },
  ],
};

module.exports = {
  CBSE_TWO_TERM,
  SINGLE_TERM_NUMERIC,
  COMPACT_GRADE_CARD,
};
