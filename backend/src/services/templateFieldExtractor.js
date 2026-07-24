/**
 * TemplateFieldExtractor  (v2 — Universal Regex)
 *
 * Extracts ALL placeholder types from HTML templates:
 *   {{name}}                  Simple field
 *   {{student.name}}          Dot-notation
 *   {{marks.term1.theory}}    Deep dot-notation
 *   {{student-name}}          Hyphenated
 *   {{subjects[0].t1_oral}}   Bracket + dot
 *   {{#subjects}}...{{/subjects}}   Loop blocks
 *
 * Uses universal regex: /\{\{\s*([^}]+?)\s*\}\}/g
 * This matches ANYTHING inside {{ }} regardless of format.
 */

// ── Known aggregator data keys (report card + admission) ─────────────────────
const KNOWN_FLAT_KEYS = new Set([
  // ── Report Card: Student ──────────────────────────────────────────────────
  'name','firstName','lastName','middleName','scholarNo','rollNo','admissionNo','admissionNumber',
  'pen','dob','dateOfBirth','gender','category','bloodGroup','religion','caste','nationality',
  'className','sectionName','classSection',
  'fatherName','motherName','fatherOccupation','motherOccupation','fatherPhone','motherPhone',
  'parentName','address','city','state','pincode','phone','email',
  'session','academicYear','year_start','year_end','appear_year','appear_year_start','appear_year_end',
  'session_start_date','session_end_date',
  'attendance','attendance_str','attendance_total','attendance_present','attendance_absent',
  'attendance_late','attendance_leave','attendance_percentage','attendance_percent',
  'total_days','present_days','absent_days','late_days','leave_days',
  'grandTotal','grandMaxTotal','percentage','grade','rank','rank_number',
  'totalPercentage','totalGrade','gt_total','gt_obt_th','gt_max_th',
  'result','result_status','remark','remarksTerm1','remarksTerm2',
  'isFinalized','promotedTo','promoted_to',
  'schoolName','schoolAddress','logo','dise','estd','subjectCount',
  // ── Admission: Identity ───────────────────────────────────────────────────
  'aadharCard','aadharNo','aadhaarNo','studentId','ssmId','familyId','apaarId','abcId',
  'samagraId','samagra_id','samgra_id',
  'motherTongue','placeOfBirth','fullAddress','addressLine2',
  'fatherAadharCard','fatherAadharNo','fatherAadhaar','father_aadhar_no',
  'motherAadharCard','motherAadharNo','motherAadhaar','mother_aadhar_no',
  'guardianAadharCard','guardianAadharNo','guardianAadhaar',
  // ── Admission: Academic ───────────────────────────────────────────────────
  'admissionDate','previousSchool','previousClass','rte','isRteStudent','rteApplicationNo',
  'admission_class','prev_school','attended_school',
  // ── Admission: Government IDs ─────────────────────────────────────────────
  'boardEnrollNo','board_enroll_no','ladliLaxmiNo','ladli_laxmi_no',
  'scholarshipId','scholarship_id','domicileApplicationNo','domicile_application_no',
  'srnNo','srn_no','bplCardNo','bpl_card_no','bplStudent','isBplStudent',
  'casteApplicationNo','caste_cert_no','casteCertNo','casteApplicationDate','caste_cert_date',
  // ── Admission: Contact extras ─────────────────────────────────────────────
  'whatsappNo','whatsapp_no','alternateNumber','alternate_number',
  // ── Admission: Parents ────────────────────────────────────────────────────
  'fatherEmail','fatherIncome','fatherAnnualIncome','fatherQualification','father_qualification',
  'motherPhone','motherEmail','motherOccupation','motherQualification','mother_qualification',
  'guardianName','guardianPhone','guardianRelation','guardianEmail',
  'guardianQualification','guardian_qualification','guardianIncome','guardian_income',
  // ── Admission: Aliases ────────────────────────────────────────────────────
  'mobile_1','mobile_2','occupation','income','ladli_laxmi','caste_cert_no','caste_cert_date',
  // ── Admission: Bank ───────────────────────────────────────────────────────
  'bankName','bankBranch','bankAccountNo','bankIfsc','account_no','ifsc_code',
  // ── Admission: Status ─────────────────────────────────────────────────────
  'status','remarks',
  // ── Admission: Boolean/Checkbox fields ────────────────────────────────────
  'gender_m','gender_f',
  'rte_yes','rte_no',
  'bpl_yes','bpl_no',
  'cat_gen','cat_obc','cat_sc','cat_st','cat_ews',
  'rel_hindu','rel_muslim','rel_christian','rel_sikh','rel_other',
  'res_pass','res_fail',
]);

const KNOWN_NAMESPACES = new Set(['student','academic','summary','attendance','subjects','skills','co_scholastic']);

class TemplateFieldExtractor {

  // ── Universal regex — matches any {{ ... }} ───────────────────────────────
  static UNIVERSAL_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

  /**
   * Extract all placeholders from an HTML template.
   *
   * @param {string} htmlContent
   * @returns {Object}  { fields, arrays, objects, simple, bracketAccess, summary }
   */
  static extractFields(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') {
      return { fields: [], arrays: [], objects: [], simple: [], bracketAccess: [], summary: {} };
    }

    const fields      = [];
    const arrays      = new Set();
    const objects     = new Set();
    const simple      = new Set();
    const bracketSet  = new Set();

    // Reset regex state
    this.UNIVERSAL_REGEX.lastIndex = 0;

    let match;
    while ((match = this.UNIVERSAL_REGEX.exec(htmlContent)) !== null) {
      const raw = match[1].trim();

      // Skip loop open/close markers — they're not data fields
      if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('@')) continue;

      // Bracket access: subjects[0].field
      if (/\w+\[\d+\]/.test(raw)) {
        bracketSet.add(raw);
        fields.push({ name: raw, type: 'bracket_access', fullMatch: match[0] });
        continue;
      }

      // Loop opener: #subjects → track array name
      // (already skipped above, but keep for completeness)

      // Dot-notation: obj.property.nested
      if (raw.includes('.')) {
        const firstDot = raw.indexOf('.');
        const ns = raw.slice(0, firstDot);
        objects.add(ns);
        fields.push({ name: raw, type: 'object', objectName: ns, propertyPath: raw.slice(firstDot + 1), fullMatch: match[0] });
        continue;
      }

      // Hyphenated: student-name
      if (raw.includes('-')) {
        simple.add(raw);
        fields.push({ name: raw, type: 'hyphenated', fullMatch: match[0] });
        continue;
      }

      // Simple field
      simple.add(raw);
      fields.push({ name: raw, type: 'simple', fullMatch: match[0] });
    }

    // Extract loop array names separately
    const loopRegex = /\{\{#(\w+)\}\}/g;
    let lm;
    while ((lm = loopRegex.exec(htmlContent)) !== null) {
      arrays.add(lm[1]);
    }

    return {
      fields,
      arrays:        Array.from(arrays),
      objects:       Array.from(objects),
      simple:        Array.from(simple),
      bracketAccess: Array.from(bracketSet),
      summary: {
        totalFields:   fields.length,
        arrayCount:    arrays.size,
        objectCount:   objects.size,
        simpleCount:   simple.size,
        bracketCount:  bracketSet.size,
      },
    };
  }

  /**
   * Validate a template against the known aggregator schema.
   * Returns advisory warnings (upload is never blocked).
   *
   * @param {string} htmlContent
   * @returns {Object}  { missingFields, unknownFields, warnings, status }
   */
  static validateAgainstSchema(htmlContent) {
    // Lazy-load AdmissionFieldRegistry to avoid circular deps
    let AdmissionFieldRegistry = null;
    try { AdmissionFieldRegistry = require('./admissionFieldRegistry'); } catch (_) {}

    const extracted = this.extractFields(htmlContent);
    const unknownFields  = [];
    const warnings       = [];

    extracted.fields.forEach(f => {
      if (f.type === 'simple' || f.type === 'hyphenated') {
        const isKnownFlat = KNOWN_FLAT_KEYS.has(f.name);
        const isKnownReg  = AdmissionFieldRegistry?.isKnown(f.name);
        const isMarksPat  = f.name.startsWith('sub_') || f.name.match(/^[a-z]{2,5}_/);

        if (!isKnownFlat && !isKnownReg && !isMarksPat) {
          const reason = AdmissionFieldRegistry
            ? AdmissionFieldRegistry._diagnose(f.name)
            : 'Not a recognized ERP field';
          unknownFields.push({ field: f.name, reason });
        }
      } else if (f.type === 'object') {
        if (!KNOWN_NAMESPACES.has(f.objectName) && !KNOWN_FLAT_KEYS.has(f.objectName)) {
          unknownFields.push({ field: f.name, reason: `Unknown namespace: ${f.objectName}` });
        }
      }
    });

    if (extracted.arrays.length === 0 && htmlContent.includes('subject')) {
      warnings.push('Template references subjects but no {{#subjects}} loop found. Consider using the loop syntax for dynamic subject rows.');
    }

    // Admission-specific boolean field hints
    const boolFields = extracted.fields.filter(f =>
      ['gender_m','gender_f','rte_yes','rte_no','bpl_yes','bpl_no',
       'cat_gen','cat_obc','cat_sc','cat_st','rel_hindu','rel_muslim',
       'res_pass','res_fail'].includes(f.name)
    );
    if (boolFields.length > 0) {
      warnings.push(`Detected ${boolFields.length} boolean checkbox field(s): ${boolFields.map(f => f.name).join(', ')}. These will auto-render ✓ or blank based on student data.`);
    }

    const uniqueUnknown = [...new Map(unknownFields.map(u => [u.field, u])).values()];

    return {
      unknownFields: uniqueUnknown,
      warnings,
      status: uniqueUnknown.length > 0 || warnings.length > 0 ? 'warning' : 'ok',
      // also expose flat list for backward compat
      unknownFieldNames: uniqueUnknown.map(u => u.field),
    };
  }

  /**
   * Validate template against an actual data snapshot.
   * @param {string} htmlContent
   * @param {Object} data
   * @returns {Object}  { isValid, missing, available, summary }
   */
  static validateData(htmlContent, data) {
    const extracted = this.extractFields(htmlContent);
    const missing   = [];
    const available = [];

    extracted.fields.forEach(f => {
      if (f.type === 'array') return;  // arrays checked separately

      const val = this._resolve(data, f.name);
      if (val === undefined || val === null) {
        missing.push({ type: f.type, name: f.name });
      } else {
        available.push({ type: f.type, name: f.name, value: val });
      }
    });

    extracted.arrays.forEach(arr => {
      if (!Array.isArray(data[arr])) {
        missing.push({ type: 'array', name: arr });
      } else {
        available.push({ type: 'array', name: arr, itemCount: data[arr].length });
      }
    });

    return {
      isValid: missing.length === 0,
      missing,
      available,
      summary: {
        totalRequired: missing.length + available.length,
        available: available.length,
        missing: missing.length,
      },
    };
  }

  /**
   * @deprecated Use validateAgainstSchema() instead.
   */
  static getRequiredFields(htmlContent) {
    const extraction = this.extractFields(htmlContent);
    const required = { simple: [], objects: {}, arrays: {} };
    extraction.fields.forEach(f => {
      if (f.type === 'simple')  required.simple.push(f.name);
      if (f.type === 'object')  {
        if (!required.objects[f.objectName]) required.objects[f.objectName] = [];
        required.objects[f.objectName].push(f.propertyPath);
      }
    });
    extraction.arrays.forEach(a => { required.arrays[a] = { properties: [] }; });
    return required;
  }

  /** Suggest DB-field mappings for extracted template fields */
  static suggestMappings(extractedFields) {
    const common = {
      student_name: 'name', name: 'name', scholar_no: 'scholarNo', roll_no: 'rollNo',
      class: 'className', section: 'sectionName', father: 'fatherName', mother: 'motherName',
      dob: 'dob', percentage: 'percentage', grade: 'grade', rank: 'rank',
    };
    const suggestions = {};
    extractedFields.fields.forEach(f => {
      const k = f.name.toLowerCase().replace(/[-]/g, '_');
      if (common[k]) suggestions[f.name] = common[k];
    });
    return suggestions;
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  static _resolve(obj, path) {
    try {
      return path.split('.').reduce((o, k) => o?.[k], obj);
    } catch {
      return undefined;
    }
  }

  // kept for backward compat
  static _getNestedValue(obj, path) { return this._resolve(obj, path); }
  static _extractSimpleFields(content) {
    const fields = new Set();
    const re = /\{\{\s*(\w+)\s*\}\}/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      if (!m[1].startsWith('/') && !m[1].startsWith('#')) fields.add(m[1]);
    }
    return Array.from(fields);
  }

  // ── NEW: extractAndClassify ───────────────────────────────────────────────
  /**
   * Extract ALL template fields and classify them into the templateSchema shape.
   * Called automatically on template upload.
   *
   * @param {string} htmlContent
   * @returns {{ fields: Array, marksFields: string[], metaFields: string[], extractedAt: Date }}
   */
  static extractAndClassify(htmlContent) {
    if (!htmlContent) return { fields: [], marksFields: [], metaFields: [], extractedAt: new Date() };

    const UNIVERSAL_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

    // Detect if a field name is inside a {{#loop}} block
    // Simple heuristic: track open/close loop tags
    const loopRanges = [];
    const loopRegex  = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    let lm;
    while ((lm = loopRegex.exec(htmlContent)) !== null) {
      loopRanges.push({ start: lm.index, end: lm.index + lm[0].length, loop: lm[1] });
    }
    const isInLoop = (index) => loopRanges.some(r => index >= r.start && index <= r.end);

    const seen   = new Set();
    const fields = [];
    UNIVERSAL_REGEX.lastIndex = 0;
    let m;
    // Collect loop array names so we skip their bare root tokens (e.g. "subjects")
    const loopArrayNames = new Set(loopRanges.map(r => r.loop));

    while ((m = UNIVERSAL_REGEX.exec(htmlContent)) !== null) {
      const raw = m[1].trim();
      // Skip Handlebars control tags
      if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('@')) continue;

      // ── BRACKET-ACCESS: subjects[0].t1_oral → extract "t1_oral" ──────────
      // These are per-subject marks fields stored in a subjects[] array.
      // We extract the PROPERTY after the bracket and classify it as isLoop=true.
      const bracketMatch = raw.match(/^\w+\[\d+\]\.(.+)$/);
      if (bracketMatch) {
        const propName = bracketMatch[1].trim();  // e.g. "t1_oral"
        if (!seen.has(propName)) {
          seen.add(propName);
          fields.push(this._classifyField(propName, true));
        }
        // Never register the array root ("subjects") as a data field
        continue;
      }

      // ── NORMAL token: take root key ───────────────────────────────────────
      const rootKey = raw.split(/[.\[]/)[0].trim();

      // Skip bare loop array names — they are structural markers, not data fields
      if (loopArrayNames.has(rootKey)) continue;

      if (seen.has(rootKey)) continue;
      seen.add(rootKey);

      const inLoop = isInLoop(m.index);
      fields.push(this._classifyField(rootKey, inLoop));
    }

    const marksFields = fields.filter(f => f.category === 'marks').map(f => f.name);
    const metaFields  = fields.filter(f => f.category === 'meta').map(f => f.name);

    return { fields, marksFields, metaFields, extractedAt: new Date() };
  }

  /**
   * Classify a single field name into category + subject/component breakdown.
   *
   * UNIVERSAL RULE: any field with an underscore is treated as <subject>_<component>
   * marks field — NO whitelist of component names needed.
   *
   * @param {string} raw   - e.g. "math_theory", "math_quiz", "eng_assignment", "student_name"
   * @param {boolean} inLoop
   */
  static _classifyField(raw, inLoop = false) {
    const normalized = raw.toLowerCase().replace(/[\s\-_]/g, '');
    const lower      = raw.toLowerCase();

    // ── Derived / computed ────────────────────────────────────────────────────
    if (/^(percentage|percent|grade|rank|result|gpa|cgpa|grandtotal|grand_total|gt_)/.test(lower)) {
      return { name: raw, normalized, label: toLabel(raw), category: 'derived', subject: '', component: '', isLoop: inLoop };
    }

    // ── Attendance ────────────────────────────────────────────────────────────
    if (/^(attendance|present|absent|leave|late|total_days|present_days|absent_days)/.test(lower)) {
      return { name: raw, normalized, label: toLabel(raw), category: 'attendance', subject: '', component: '', isLoop: inLoop };
    }

    // ── Meta / student info (known prefixes) ──────────────────────────────────
    const META_PREFIXES = /^(student|name|first|last|middle|father|mother|parent|dob|date|gender|blood|religion|caste|nationality|scholar|roll|admission|pen|address|city|state|pin|phone|email|school|class|section|session|academic|logo|dise|estd|promoted|result|remark)/i;
    if (META_PREFIXES.test(raw)) {
      return { name: raw, normalized, label: toLabel(raw), category: 'meta', subject: '', component: '', isLoop: inLoop };
    }

    // ── Marks — UNIVERSAL: ANY <prefix>_<suffix> = marks field ────────────────
    // Rule: if field contains underscore AND is not meta/attendance/derived → it's a marks field.
    // The LAST segment is the component; everything before is the subject slug.
    // Examples: math_theory, math_quiz, sci_assignment, sub_1_obt_th, eng_portfolio
    const parts = raw.split('_');
    if (parts.length >= 2) {
      const component = parts[parts.length - 1];
      const subject   = parts.slice(0, parts.length - 1).join('_');
      return { name: raw, normalized, label: toLabel(raw), category: 'marks', subject, component, isLoop: inLoop };
    }

    // ── Default: single-word field with no underscore → other ────────────────
    return { name: raw, normalized, label: toLabel(raw), category: 'other', subject: '', component: '', isLoop: inLoop };
  }
}

/** Convert field name to human-readable label: "math_theory" → "Math Theory" */
function toLabel(fieldName) {
  return fieldName
    .replace(/[_\-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

module.exports = TemplateFieldExtractor;
