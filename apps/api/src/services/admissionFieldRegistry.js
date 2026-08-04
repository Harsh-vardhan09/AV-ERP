/**
 * AdmissionFieldRegistry
 *
 * Single source of truth for all admission template placeholders.
 * Defines:
 *   - Canonical field name (what admissionDataService produces)
 *   - All template aliases that map to it
 *   - Field type: 'text' | 'date' | 'boolean_tick' | 'computed'
 *   - Description (for validation reports)
 *
 * Used by:
 *   - admissionDataService     → resolve all fields from DB
 *   - fieldMappingService      → alias resolution in template parser
 *   - templateFieldExtractor   → validate template fields on upload
 */

const REGISTRY = [
  // ── Student Identity ────────────────────────────────────────────────────────
  { canonical: 'name',            aliases: ['student_name','studentName','fullName','full_name','student-name'],           type: 'text',         desc: 'Full student name' },
  { canonical: 'firstName',       aliases: ['first_name','firstname'],                                                     type: 'text',         desc: 'First name' },
  { canonical: 'lastName',        aliases: ['last_name','lastname','surname'],                                             type: 'text',         desc: 'Last name' },
  { canonical: 'admissionNo',     aliases: ['admission_no','admissionNumber','admission_number','adm_no'],               type: 'text',         desc: 'Admission / registration number' },
  { canonical: 'rollNo',          aliases: ['roll_no','roll-no','rollNumber','roll_number'],                               type: 'text',         desc: 'Roll number' },
  { canonical: 'scholarNo',       aliases: ['scholar_no','scholar-no','scholarNumber','scholar_number'],                   type: 'text',         desc: 'Scholar number' },
  { canonical: 'pen',             aliases: ['pen_no','penNo','pen-no','permanent_education_number'],                       type: 'text',         desc: 'Permanent Education Number' },
  { canonical: 'aadharCard',      aliases: ['aadhar_no','aadharNo','aadhaar_no','aadhaarNo','aadhar','aadhaar','student_aadhar','student_aadhaar','student_aadhar_no'],  type: 'text', desc: 'Aadhaar card number' },
  { canonical: 'studentId',       aliases: ['student_id','studentid'],                                                    type: 'text',         desc: 'Internal student ID' },
  { canonical: 'ssmId',           aliases: ['ssm_id','samagra_id','samgra_id','samagraId','ladli_laxmi','ladliLaxmi','ssm'],  type: 'text',  desc: 'SSM / Samagra / Ladli Laxmi number' },
  { canonical: 'familyId',        aliases: ['family_id','govt_family_id','govtFamilyId','govt_family'],                        type: 'text',  desc: 'Government family ID' },
  { canonical: 'apaarId',         aliases: ['apaar_id','apaar','abc_id','abcId','academic_bank_id'],                           type: 'text',  desc: 'APAAR / ABC ID (Academic Bank of Credits)' },

  // ── Demographics ────────────────────────────────────────────────────────────
  { canonical: 'gender',          aliases: ['student_gender'],                                                            type: 'text',         desc: 'Gender (Male/Female/Other)' },
  { canonical: 'dob',             aliases: ['date_of_birth','dateOfBirth','date-of-birth','student_dob','birth_date'],    type: 'date',         desc: 'Date of birth' },
  { canonical: 'bloodGroup',      aliases: ['blood_group','bloodgroup','blood-group'],                                    type: 'text',         desc: 'Blood group' },
  { canonical: 'religion',        aliases: ['student_religion'],                                                          type: 'text',         desc: 'Religion' },
  { canonical: 'caste',           aliases: ['student_caste'],                                                             type: 'text',         desc: 'Caste' },
  { canonical: 'category',        aliases: ['student_category','caste_category'],                                         type: 'text',         desc: 'Category (General/OBC/SC/ST/EWS)' },
  { canonical: 'nationality',     aliases: ['student_nationality'],                                                       type: 'text',         desc: 'Nationality' },
  { canonical: 'motherTongue',    aliases: ['mother_tongue','mothertongue'],                                              type: 'text',         desc: 'Mother tongue' },
  { canonical: 'placeOfBirth',    aliases: ['place_of_birth','birth_place','birthPlace'],                                 type: 'text',         desc: 'Place of birth' },

  // ── Contact ─────────────────────────────────────────────────────────────────
  { canonical: 'phone',           aliases: ['mobileNo','mobile_no','contact','mobile'],                                   type: 'text',         desc: 'Student mobile' },

  // ── Address ─────────────────────────────────────────────────────────────────
  { canonical: 'address',         aliases: ['street','residential_address','address_line_1','address_line1','addressLine1','address1','addr_line_1','addr1'],  type: 'text',  desc: 'Address line 1' },
  { canonical: 'addressLine2',    aliases: ['address_line2','address_line_2','addressLine2','address2','addr_line_2','addr2'],                                  type: 'text',  desc: 'Address line 2' },
  { canonical: 'city',            aliases: ['district'],                                                                  type: 'text',         desc: 'City / District' },
  { canonical: 'state',           aliases: ['state_name'],                                                                type: 'text',         desc: 'State' },
  { canonical: 'pincode',         aliases: ['pin','zip','postal_code','pin_code'],                                        type: 'text',         desc: 'Pin code' },
  { canonical: 'fullAddress',     aliases: ['full_address'],                                                              type: 'text',         desc: 'Full address combined' },

  // ── Academic ────────────────────────────────────────────────────────────────
  { canonical: 'className',       aliases: ['class','class_name','admission_class','student_class','class-name'],         type: 'text',         desc: 'Class name' },
  { canonical: 'sectionName',     aliases: ['section','section_name','student_section'],                                  type: 'text',         desc: 'Section' },
  { canonical: 'academicYear',    aliases: ['session','academic_year','session_year','year'],                             type: 'text',         desc: 'Academic year / session' },
  { canonical: 'admissionDate',   aliases: ['admission_date','date_of_admission','joining_date'],                         type: 'date',         desc: 'Date of admission' },
  { canonical: 'previousSchool',  aliases: ['prev_school','previous_school','attended_school','attendedSchool','last_school'], type: 'text',    desc: 'Previous school name' },
  { canonical: 'previousClass',   aliases: ['prev_class','previous_class'],                                               type: 'text',         desc: 'Previous class' },

  // ── System / Form-level fields ──────────────────────────────────────────────
  { canonical: 'date',            aliases: ['form_date','today','current_date','print_date','fill_date'],                 type: 'date',         desc: "Today's date (form fill / print date)" },

  // ── School codes ──────────────────────────────────────────────────────────
  { canonical: 'dise_code',       aliases: ['udise_code','udise','udiseCode','diseCode','dise','school_dise','school_udise','u_dise_code'], type: 'text', desc: 'School DISE / UDISE code' },
  { canonical: 'schoolRegNo',     aliases: ['school_reg_no','reg_no','school_registration_no','affiliation_no','affiliationNo','affiliation_code'], type: 'text', desc: 'School registration / affiliation number' },

  // ── Government Schemes ──────────────────────────────────────────────────────
  { canonical: 'rte',             aliases: ['rte_status','isRteStudent','is_rte'],                                        type: 'text',         desc: 'RTE status (Yes/No)' },

  // ── Parent: Father ──────────────────────────────────────────────────────────
  { canonical: 'fatherName',      aliases: ['father_name','father-name','fathername'],                                    type: 'text',         desc: "Father's name" },
  { canonical: 'fatherPhone',     aliases: ['father_phone','father_mobile','mobile_1','mobile1','father-phone'],          type: 'text',         desc: "Father's phone/mobile" },
  { canonical: 'fatherEmail',     aliases: ['father_email'],                                                              type: 'text',         desc: "Father's email" },
  { canonical: 'fatherOccupation',aliases: ['father_occupation','occupation','father-occupation','father_occ'],           type: 'text',         desc: "Father's occupation" },
  { canonical: 'fatherIncome',    aliases: ['father_income','income','annual_income','family_income','annualIncome'],     type: 'text',         desc: "Father's / family annual income" },

  // ── Parent: Mother ──────────────────────────────────────────────────────────
  { canonical: 'motherName',      aliases: ['mother_name','mother-name','mothername'],                                    type: 'text',         desc: "Mother's name" },
  { canonical: 'motherPhone',     aliases: ['mother_phone','mother_mobile','mobile_2','mobile2','mother-phone'],          type: 'text',         desc: "Mother's phone/mobile" },
  { canonical: 'motherEmail',     aliases: ['mother_email'],                                                              type: 'text',         desc: "Mother's email" },
  { canonical: 'motherOccupation',aliases: ['mother_occupation','mother-occupation','mother_occ'],                        type: 'text',         desc: "Mother's occupation" },

  // ── Parent: Guardian ────────────────────────────────────────────────────────
  { canonical: 'guardianName',    aliases: ['guardian_name'],                                                             type: 'text',         desc: "Guardian's name" },
  { canonical: 'guardianPhone',   aliases: ['guardian_phone','guardian_mobile'],                                          type: 'text',         desc: "Guardian's phone" },
  { canonical: 'guardianRelation',aliases: ['guardian_relation','guardian_relationship'],                                 type: 'text',         desc: "Guardian relationship" },

  // ── Bank ────────────────────────────────────────────────────────────────────
  { canonical: 'bankName',        aliases: ['bank_name','bank-name'],                                                     type: 'text',         desc: 'Bank name' },
  { canonical: 'bankBranch',      aliases: ['bank_branch','branch_name'],                                                 type: 'text',         desc: 'Bank branch' },
  { canonical: 'bankAccountNo',   aliases: ['account_no','accountNo','account_number','accountNumber','bank_account','bank_account_no'], type: 'text', desc: 'Bank account number' },
  { canonical: 'bankIfsc',        aliases: ['ifsc_code','ifsc','bank_ifsc','ifscCode'],                                   type: 'text',         desc: 'IFSC code' },

  // ── Previous School ─────────────────────────────────────────────────────────
  { canonical: 'remarks',         aliases: ['remark','student_remarks'],                                                  type: 'text',         desc: 'Remarks' },
  { canonical: 'status',          aliases: ['student_status','enrollment_status'],                                        type: 'text',         desc: 'Student status' },

  // ── School Branding ─────────────────────────────────────────────────────────
  { canonical: 'schoolName',      aliases: ['school_name','school-name','schoolname'],                                    type: 'text',         desc: 'School name' },
  { canonical: 'schoolLogo',      aliases: ['school_logo','logo'],                                                        type: 'text',         desc: 'School logo URL' },
  { canonical: 'schoolPhone',     aliases: ['school_phone','school_mobile','school_contact'],                             type: 'text',         desc: 'School phone number' },
  { canonical: 'schoolAddress',   aliases: ['school_address'],                                                            type: 'text',         desc: 'School address' },

  // ── Caste Certificate (real DB fields) ─────────────────────────────────────
  { canonical: 'casteApplicationNo',   aliases: ['caste_cert_no','casteCertNo','caste_certificate_no','caste_application_no'],  type: 'text', desc: 'Caste certificate/application number' },
  { canonical: 'casteApplicationDate', aliases: ['caste_cert_date','casteCertDate','caste_certificate_date'],                   type: 'date', desc: 'Caste certificate/application date' },

  // ── Government Scheme IDs ───────────────────────────────────────────────────
  { canonical: 'boardEnrollNo',        aliases: ['board_enroll_no','boardEnrollmentNo','board_enrollment_no'],                  type: 'text', desc: 'Board enrollment number' },
  { canonical: 'ladliLaxmiNo',         aliases: ['ladli_laxmi_no','ladliLaxmi'],                                               type: 'text', desc: 'Ladli Laxmi Yojana number' },
  { canonical: 'scholarshipId',        aliases: ['scholarship_id','scholarship_no'],                                            type: 'text', desc: 'Scholarship ID' },
  { canonical: 'domicileApplicationNo',aliases: ['domicile_application_no','domicileNo','domicile_no'],                        type: 'text', desc: 'Domicile application number' },
  { canonical: 'srnNo',                aliases: ['srn_no','srn','state_reg_no'],                                               type: 'text', desc: 'State Registration Number' },
  { canonical: 'bplCardNo',            aliases: ['bpl_card_no','bpl_card_number','bpl_number','bplCardNumber'],               type: 'text',         desc: 'BPL card number' },

  // ── Parent Aadhaar ──────────────────────────────────────────────────────────
  { canonical: 'fatherAadharCard', aliases: ['father_aadhar_no','fatherAadharNo','fatherAadhaar','father_aadhaar','father_aadhar'],  type: 'text', desc: "Father's Aadhaar number" },
  { canonical: 'motherAadharCard', aliases: ['mother_aadhar_no','motherAadharNo','motherAadhaar','mother_aadhaar','mother_aadhar'],  type: 'text', desc: "Mother's Aadhaar number" },
  { canonical: 'guardianAadharCard',aliases:['guardian_aadhar_no','guardianAadharNo','guardianAadhaar','guardian_aadhaar'],          type: 'text', desc: "Guardian's Aadhaar number" },

  // ── Parent Qualifications ───────────────────────────────────────────────────
  { canonical: 'fatherQualification',   aliases: ['father_qualification','father_edu'],  type: 'text', desc: "Father's qualification" },
  { canonical: 'motherQualification',   aliases: ['mother_qualification','mother_edu'],  type: 'text', desc: "Mother's qualification" },
  { canonical: 'guardianQualification', aliases: ['guardian_qualification'],             type: 'text', desc: "Guardian's qualification" },
  { canonical: 'guardianIncome',        aliases: ['guardian_income'],                    type: 'text', desc: "Guardian's income" },

  // ── Contact Extras ──────────────────────────────────────────────────────────
  { canonical: 'whatsappNo',      aliases: ['whatsapp_no','whatsapp'],                                                     type: 'text', desc: 'WhatsApp number' },
  { canonical: 'alternateNumber', aliases: ['alternate_number','alternate_no','alternateNo'],                              type: 'text', desc: 'Alternate contact number' },

  // ══════════════════════════════════════════════════════════════════════════════
  // BOOLEAN / CHECKBOX FIELDS
  // These resolve to '✓' or '' based on student data.
  // ══════════════════════════════════════════════════════════════════════════════

  // Gender checkboxes
  { canonical: 'gender_m',        aliases: ['genderM','gender_male'],                                                     type: 'boolean_tick', desc: "Tick if gender = Male" },
  { canonical: 'gender_f',        aliases: ['genderF','gender_female'],                                                   type: 'boolean_tick', desc: "Tick if gender = Female" },

  // RTE
  { canonical: 'rte_yes',         aliases: ['rteYes','rte_admission_yes'],                                                type: 'boolean_tick', desc: "Tick if RTE admission = Yes" },
  { canonical: 'rte_no',          aliases: ['rteNo','rte_admission_no'],                                                  type: 'boolean_tick', desc: "Tick if RTE admission = No" },

  // BPL
  { canonical: 'bpl_yes',         aliases: ['bplYes','bpl_admission_yes'],                                                 type: 'boolean_tick', desc: "Tick if BPL = Yes" },
  { canonical: 'bpl_no',          aliases: ['bplNo','bpl_admission_no'],                                                  type: 'boolean_tick', desc: "Tick if BPL = No" },

  // Category
  { canonical: 'cat_gen',         aliases: ['catGen','category_general','cat_general'],                                   type: 'boolean_tick', desc: "Tick if category = General" },
  { canonical: 'cat_obc',         aliases: ['catObc','category_obc'],                                                     type: 'boolean_tick', desc: "Tick if category = OBC" },
  { canonical: 'cat_sc',          aliases: ['catSc','category_sc'],                                                       type: 'boolean_tick', desc: "Tick if category = SC" },
  { canonical: 'cat_st',          aliases: ['catSt','category_st'],                                                       type: 'boolean_tick', desc: "Tick if category = ST" },
  { canonical: 'cat_ews',         aliases: ['catEws','category_ews'],                                                     type: 'boolean_tick', desc: "Tick if category = EWS" },

  // Religion
  { canonical: 'rel_hindu',       aliases: ['relHindu','religion_hindu'],                                                 type: 'boolean_tick', desc: "Tick if religion = Hindu" },
  { canonical: 'rel_muslim',      aliases: ['relMuslim','religion_muslim'],                                               type: 'boolean_tick', desc: "Tick if religion = Muslim" },
  { canonical: 'rel_christian',   aliases: ['relChristian','religion_christian'],                                         type: 'boolean_tick', desc: "Tick if religion = Christian" },
  { canonical: 'rel_sikh',        aliases: ['relSikh','religion_sikh'],                                                   type: 'boolean_tick', desc: "Tick if religion = Sikh" },
  { canonical: 'rel_other',       aliases: ['relOther','religion_other'],                                                  type: 'boolean_tick', desc: "Tick if religion = other" },

  // Result
  { canonical: 'res_pass',        aliases: ['resPass','result_pass','pass'],                                              type: 'boolean_tick', desc: "Tick if result = Pass" },
  { canonical: 'res_fail',        aliases: ['resFail','result_fail','fail'],                                              type: 'boolean_tick', desc: "Tick if result = Fail" },
];

// ── Build lookup maps ──────────────────────────────────────────────────────────

/** alias (lowercase) → canonical field name */
const ALIAS_TO_CANONICAL = {};

/** canonical → registry entry */
const CANONICAL_MAP = {};

/** Set of all known field names (canonical + alias) for validation */
const ALL_KNOWN_FIELDS = new Set();

for (const entry of REGISTRY) {
  CANONICAL_MAP[entry.canonical] = entry;
  ALL_KNOWN_FIELDS.add(entry.canonical.toLowerCase());

  // Register canonical itself as its own alias
  ALIAS_TO_CANONICAL[entry.canonical.toLowerCase()] = entry.canonical;

  for (const alias of entry.aliases) {
    const key = alias.toLowerCase();
    ALIAS_TO_CANONICAL[key] = entry.canonical;
    ALL_KNOWN_FIELDS.add(key);
  }
}

class AdmissionFieldRegistry {

  /**
   * Resolve a raw template placeholder name to its canonical field name.
   * Returns null if completely unknown.
   */
  static resolve(rawField) {
    const lower = (rawField || '').trim().toLowerCase();
    return ALIAS_TO_CANONICAL[lower] || null;
  }

  /**
   * Get the registry entry for a field (by canonical name OR alias).
   */
  static getEntry(rawField) {
    const canonical = this.resolve(rawField) || rawField;
    return CANONICAL_MAP[canonical] || null;
  }

  /**
   * Check if a field name is known to the registry.
   */
  static isKnown(rawField) {
    return ALL_KNOWN_FIELDS.has((rawField || '').trim().toLowerCase());
  }

  /**
   * Returns the flat alias map keyed by lowercase alias → canonical.
   * Used by FieldMappingService to merge admission aliases into its ALIASES table.
   */
  static getAliasMap() {
    return { ...ALIAS_TO_CANONICAL };
  }

  /**
   * Returns all boolean_tick field canonical names.
   * Used by admissionDataService to add computed checkbox values.
   */
  static getBooleanFields() {
    return REGISTRY.filter(e => e.type === 'boolean_tick').map(e => e.canonical);
  }

  /**
   * Validate a list of extracted template field names against the registry.
   * Returns a structured report suitable for returning to the Super Admin on upload.
   *
   * @param {string[]} fieldNames   - raw placeholder names from template
   * @returns {{
   *   valid: string[],
   *   unknown: Array<{field, reason}>,
   *   booleanFields: string[],
   *   summary: { total, valid, unknown, boolean }
   * }}
   */
  static validate(fieldNames) {
    const valid         = [];
    const unknown       = [];
    const booleanFields = [];

    for (const raw of fieldNames) {
      if (this.isKnown(raw)) {
        valid.push(raw);
        const entry = this.getEntry(raw);
        if (entry?.type === 'boolean_tick') booleanFields.push(raw);
      } else {
        unknown.push({
          field:  raw,
          reason: this._diagnose(raw),
        });
      }
    }

    return {
      valid,
      unknown,
      booleanFields,
      summary: {
        total:   fieldNames.length,
        valid:   valid.length,
        unknown: unknown.length,
        boolean: booleanFields.length,
      },
    };
  }

  /**
   * Given a rendered data object and the list of missing placeholder names
   * (from TemplateParserService), return enriched diagnostics.
   *
   * @param {string[]} missingFields  - field names that didn't resolve
   * @param {Object}   data           - the flat data object used for rendering
   */
  static diagnoseMissing(missingFields, data = {}) {
    return missingFields.map(field => {
      const canonical = this.resolve(field);
      const entry     = canonical ? CANONICAL_MAP[canonical] : null;
      let reason      = 'Mapping not found in registry';

      if (entry) {
        // Known field — check if value is actually empty in data
        const val = data[canonical] ?? data[field];
        if (val !== undefined && val !== null && val !== '') {
          reason = 'Value present in data but placeholder not resolved (parser issue)';
        } else if (entry.type === 'boolean_tick') {
          reason = `Boolean checkbox field — value in data: "${data[canonical] ?? ''}"`;
        } else if (val === '' || val === null || val === undefined) {
          reason = `Empty value in ERP database (field: ${entry.desc})`;
        }
      } else {
        reason = this._diagnose(field);
      }

      return {
        field,
        canonical: canonical || null,
        reason,
        description: entry?.desc || 'Unknown field',
      };
    });
  }

  /** Internal: produce a human reason for why a field is unknown */
  static _diagnose(raw) {
    if (/^\d/.test(raw))            return 'Field name starts with a number — invalid placeholder';
    if (/[A-Z]{2,}/.test(raw))     return 'Check casing — use snake_case (e.g. father_name)';
    if (raw.includes(' '))         return 'Field name contains spaces — use underscores';
    if (raw.length < 2)            return 'Field name too short';
    return 'Not a recognized ERP admission field — check the field registry';
  }

  /** Return full registry for documentation/debug purposes */
  static getRegistry() { return [...REGISTRY]; }
}

module.exports = AdmissionFieldRegistry;
