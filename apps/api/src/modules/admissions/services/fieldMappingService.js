/**
 * FieldMappingService
 *
 * Maps ANY template field naming convention → aggregator data keys.
 * Covers both Report Card fields and Admission Form fields.
 *
 * Admission aliases are auto-merged from AdmissionFieldRegistry so
 * the template parser resolves admission placeholders without any
 * changes to the parser itself.
 */

// Merge admission field aliases at startup
let _admissionAliasesLoaded = false;

class FieldMappingService {
  /**
   * Master alias table.
   * Keys are what templates might write; values are what the aggregator produces.
   * All keys are lowercased for case-insensitive matching.
   */
  static ALIASES = {
    // Student
    'student-name':      'name',
    'student_name':      'name',
    'studentname':       'name',
    'full_name':         'name',
    'fullname':          'name',
    'student-roll':      'rollNo',
    'student_roll':      'rollNo',
    'roll-no':           'rollNo',
    'roll_no':           'rollNo',
    'rollnumber':        'rollNo',
    'roll-number':       'rollNo',
    'roll_number':       'rollNo',
    'student-scholar':   'scholarNo',
    'scholar-no':        'scholarNo',
    'scholar_no':        'scholarNo',
    'scholarnumber':     'scholarNo',
    'scholar-number':    'scholarNo',
    'scholar_number':    'scholarNo',
    'admission-no':      'admissionNo',
    'admission_no':      'admissionNo',
    'admissionnumber':   'admissionNo',
    'admission-number':  'admissionNo',
    'admission_number':  'admissionNo',
    'student-class':     'className',
    'student_class':     'className',
    'class-name':        'className',
    'class_name':        'className',
    'student-section':   'sectionName',
    'student_section':   'sectionName',
    'section-name':      'sectionName',
    'section_name':      'sectionName',
    'student-dob':       'dob',
    'student_dob':       'dob',
    'date-of-birth':     'dob',
    'date_of_birth':     'dob',
    'dateofbirth':       'dob',
    'student-gender':    'gender',
    'student_gender':    'gender',
    'student-category':  'category',
    'student_category':  'category',
    'student-blood':     'bloodGroup',
    'blood-group':       'bloodGroup',
    'blood_group':       'bloodGroup',
    'bloodgroup':        'bloodGroup',
    'student-pen':       'pen',

    'father-name':       'fatherName',
    'father_name':       'fatherName',
    'fathername':        'fatherName',
    'mother-name':       'motherName',
    'mother_name':       'motherName',
    'mothername':        'motherName',
    'father-phone':      'fatherPhone',
    'father_phone':      'fatherPhone',
    'father-occ':        'fatherOccupation',
    'father_occ':        'fatherOccupation',
    'father-occupation': 'fatherOccupation',
    'father_occupation': 'fatherOccupation',
    'mother-occupation': 'motherOccupation',
    'mother_occupation': 'motherOccupation',

    // Session
    'academic-year':     'academicYear',
    'academic_year':     'academicYear',
    'session-year':      'academicYear',
    'session_year':      'academicYear',
    'year-start':        'year_start',
    'year_start':        'year_start',
    'year-end':          'year_end',
    'year_end':          'year_end',
    'appear-year':       'appear_year',
    'appear_year':       'appear_year',

    // Grand totals
    'grand-total':       'grandTotal',
    'grand_total':       'grandTotal',
    'total-marks':       'grandTotal',
    'total_marks':       'grandTotal',
    'grand-max':         'grandMaxTotal',
    'grand_max':         'grandMaxTotal',
    'total-percentage':  'percentage',
    'total_percentage':  'percentage',
    'overall-percentage':'percentage',
    'overall_percentage':'percentage',
    'total-grade':       'grade',
    'total_grade':       'grade',
    'final-grade':       'grade',
    'final_grade':       'grade',
    'class-rank':        'rank',
    'class_rank':        'rank',
    'student-rank':      'rank',
    'student_rank':      'rank',
    'result-status':     'result',
    'result_status':     'result',
    'pass-fail':         'result',
    'pass_fail':         'result',
    'promoted-to':       'promotedTo',
    'promoted_to':       'promotedTo',

    // Attendance
    'total-days':        'attendance_total',
    'total_days':        'attendance_total',
    'working-days':      'attendance_total',
    'working_days':      'attendance_total',
    'present-days':      'attendance_present',
    'present_days':      'attendance_present',
    'absent-days':       'attendance_absent',
    'absent_days':       'attendance_absent',
    'late-days':         'attendance_late',
    'late_days':         'attendance_late',
    'leave-days':        'attendance_leave',
    'leave_days':        'attendance_leave',
    'attendance-pct':    'attendance_percentage',
    'attendance_pct':    'attendance_percentage',
    'attendance-percent':'attendance_percentage',
    'attendance_percent':'attendance_percentage',
    'attendance-str':    'attendance_str',
    'attendance_str':    'attendance_str',
  };

  /**
   * Resolve a template field name to the canonical aggregator key.
   * Handles:
   *   - Exact match (case-insensitive)
   *   - Hyphenated  → snake_case  → camelCase normalization
   *
   * @param {string} field  Raw field name from template placeholder
   * @returns {string}      Resolved aggregator key, or original if no mapping found
   */
  static resolve(field) {
    if (!field) return field;
    const lower = field.trim().toLowerCase();
    return this.ALIASES[lower] || field;
  }

  /**
   * Apply field mapping across an entire flat data object.
   * Adds mapped aliases WITHOUT removing original keys.
   *
   * @param {Object} data  Flat data object from aggregator
   * @returns {Object}     Data enriched with all alias keys
   */
  static applyAliases(data) {
    const enriched = { ...data };
    Object.entries(this.ALIASES).forEach(([alias, canonical]) => {
      if (enriched[canonical] !== undefined && enriched[alias] === undefined) {
        enriched[alias] = enriched[canonical];
      }
    });
    return enriched;
  }

  /**
   * Normalize a template path for resolution attempts:
   *   "student-name"  → tries "student-name", "studentName", "student_name"
   *
   * @param {string} raw  Raw field/path from template
   * @returns {string[]}  Array of candidate keys to try, in priority order
   */
  static candidates(raw) {
    const lower = raw.trim().toLowerCase();
    const camel = lower.replace(/[-_](\w)/g, (_, c) => c.toUpperCase());
    const snake = lower.replace(/[-]/g, '_');
    const hyphen = lower.replace(/[_]/g, '-');
    return [
      this.ALIASES[lower] || raw,   // mapped canonical name first
      raw,
      lower,
      camel,
      snake,
      hyphen,
    ].filter((v, i, arr) => arr.indexOf(v) === i);  // deduplicate
  }
  static _ensureAdmissionAliases() {
    if (_admissionAliasesLoaded) return;
    try {
      const AdmissionFieldRegistry = require('./admissionFieldRegistry');
      const map = AdmissionFieldRegistry.getAliasMap();
      // Merge: alias → canonical. Do NOT overwrite existing entries.
      Object.entries(map).forEach(([alias, canonical]) => {
        if (!this.ALIASES[alias]) {
          this.ALIASES[alias] = canonical;
        }
      });
    } catch (_) {
      // Registry not available — skip silently
    }
    _admissionAliasesLoaded = true;
  }
}

// Auto-merge admission aliases once at module load
FieldMappingService._ensureAdmissionAliases();

module.exports = FieldMappingService;
