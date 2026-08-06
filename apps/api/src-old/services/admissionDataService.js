/**
 * AdmissionDataService  (v2 — Production-complete field mapping)
 *
 * Builds the full data snapshot object for a student's admission form.
 * Fed directly into TemplateParserService.render() to produce the final HTML.
 *
 * ── What's new in v2 ────────────────────────────────────────────────────────
 *
 * 1. CONDITIONAL CHECKBOX FIELDS
 *    Template designers mark checkboxes with boolean-style placeholders.
 *    The resolver evaluates the student's actual value and returns '✓' or ''.
 *
 *    gender_m       → '✓' if student.gender === 'male'
 *    gender_f       → '✓' if student.gender === 'female'
 *    rte_yes        → '✓' if student.rte === true
 *    rte_no         → '✓' if student.rte === false
 *    bpl_yes        → '✓' if category/scheme indicates BPL
 *    bpl_no         → '✓' otherwise
 *    cat_gen        → '✓' if category === 'General'
 *    cat_obc        → '✓' if category === 'OBC'
 *    cat_sc         → '✓' if category === 'SC'
 *    cat_st         → '✓' if category === 'ST'
 *    cat_ews        → '✓' if category === 'EWS'
 *    rel_hindu      → '✓' if religion.toLowerCase() === 'hindu'
 *    rel_muslim     → '✓' if religion.toLowerCase() === 'muslim'
 *    rel_christian  → '✓' if religion.toLowerCase() === 'christian'
 *    rel_sikh       → '✓' if religion.toLowerCase() === 'sikh'
 *    rel_other      → '✓' if religion is set but not the above
 *    res_pass       → '✓' if status === 'active' or 'passed'
 *    res_fail       → '✓' if status === 'left' or 'dropped'
 *
 * 2. ALIAS FIELDS (template names → DB fields)
 *    mobile_1       → parentDetails.father.phone
 *    mobile_2       → parentDetails.mother.phone
 *    account_no     → bankDetails.accountNumber
 *    ifsc_code      → bankDetails.ifsc
 *    occupation     → parentDetails.father.occupation
 *    income         → parentDetails.father.annualIncome
 *    prev_school    → previousSchool
 *    admission_class→ className (from classId.name)
 *    ladli_laxmi    → ssmId (SSM / Ladli Laxmi card number)
 *    caste_cert_no  → casteApplicationNo  ← NOW a real schema field
 *    caste_cert_date→ casteApplicationDate ← NOW a real schema field
 *    pen            → pen / penNo (both stored)
 *    scholar_no     → scholarNo
 *    apaar_id       → apaarId (APAAR / ABC ID)
 *    bpl_card_no    → bplCardNo
 *    father_aadhar  → fatherAadharCard
 *    mother_aadhar  → motherAadharCard
 *
 * 3. CORRECT FIELD PATHS (from StudentProfile schema)
 *    bankDetails.accountNumber  (was bankDetails.accountNo — WRONG)
 *    bankDetails.ifsc           (correct)
 *    parentDetails.father.phone (correct)
 *    parentDetails.father.annualIncome (NOT father.income)
 *    parentDetails.father.qualification (NEW)
 *    parentDetails.mother.qualification (NEW)
 *    parentDetails.guardian.income      (NEW)
 *    rte (boolean)              (NOT isRteStudent)
 *    bplStudent (boolean)       (NOT isBplStudent)
 */

const StudentProfile = require('../models/StudentProfile');
const AdmissionFieldRegistry = require('./admissionFieldRegistry');
const School = require('../../src/modules/tenancy').School;
const SchoolSettings = require('../../src/modules/tenancy').SchoolSettings;

// Checkbox tick character used in PDF output
const TICK = '\u2713';
const EMPTY = '';

// Helper: returns TICK if condition is truthy, empty string otherwise
const tick = (condition) => (condition ? TICK : EMPTY);

class AdmissionDataService {
  /**
   * Build a flat + namespaced data snapshot for a single student.
   *
   * @param {string|ObjectId} studentId
   * @param {string|ObjectId} schoolId
   * @param {Object}          [schoolSettings]  – optional school branding info
   * @returns {Object}  Fully-enriched data object ready for TemplateParserService
   */
  static async getStudentSnapshot(studentId, schoolId, schoolSettings = {}) {
    const student = await StudentProfile.findOne({ _id: studentId, schoolId })
      .populate('classId',   'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session',   'sessionName startYear endYear')
      .lean();

    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    const s = (v) => (v != null ? String(v).trim() : '');
    const dateStr = (v) => {
      if (!v) return '';
      try { return new Date(v).toLocaleDateString('en-IN'); } catch { return s(v); }
    };
    const normStr = (v) => s(v).toLowerCase();

    // ── Core fields ────────────────────────────────────────────────────────────
    const firstName  = s(student.firstName);
    const lastName   = s(student.lastName);
    const fullName   = `${firstName} ${lastName}`.trim();

    const father   = student.parentDetails?.father   || {};
    const mother   = student.parentDetails?.mother   || {};
    const guardian = student.parentDetails?.guardian || {};

    const bank    = student.bankDetails      || {};
    const transport = student.transportation || {};
    const health  = student.healthInfo       || {};
    const docs    = student.documents        || {};

    const className   = s(student.classId?.name);
    const sectionName = s(student.sectionId?.name);

    const category = s(student.category);
    const religion = normStr(student.religion);
    const gender   = normStr(student.gender);
    const status   = normStr(student.status);

    // ── School branding + codes ────────────────────────────────────────────────
    // Pull from schoolSettings (passed in) AND hydrate from School / SchoolSettings models
    // for fields like udiseCode / affiliationCode that aren't in AdmissionFormSettings.
    let schoolDoc    = null;
    let schoolSetDoc = null;
    try {
      [schoolDoc, schoolSetDoc] = await Promise.all([
        School.findById(schoolId).select('name udiseCode phone address logoUrl affiliationCode').lean().catch(() => null),
        SchoolSettings.findOne({ schoolId }).select('fullName shortName udiseCode affiliationCode schoolLogo phoneNumber address').lean().catch(() => null),
      ]);
    } catch (_) {}

    const schoolName    = s(
      schoolSettings?.schoolName ||
      schoolSettings?.name ||
      schoolSetDoc?.fullName ||
      schoolDoc?.name
    );
    const schoolLogo    = s(schoolSettings?.logo || schoolSetDoc?.schoolLogo || schoolDoc?.logoUrl);
    const schoolPhone   = s(schoolSettings?.phone || schoolSetDoc?.phoneNumber || schoolDoc?.phone);
    const schoolAddress = s(schoolSettings?.address || schoolSetDoc?.address || schoolDoc?.address);
    // DISE code: try schoolSettings pass-in, then SchoolSettings model, then School model
    const diseCode      = s(
      schoolSettings?.udiseCode ||
      schoolSettings?.dise_code ||
      schoolSettings?.diseCode ||
      schoolSetDoc?.udiseCode ||
      schoolDoc?.udiseCode
    );
    // School registration / affiliation number
    const schoolRegNo   = s(
      schoolSettings?.affiliationNo ||
      schoolSettings?.regNo ||
      schoolSetDoc?.affiliationCode ||
      schoolDoc?.affiliationCode ||
      schoolDoc?.udiseCode   // fallback: use DISE as reg no if no separate value
    );

    // Today's date formatted for the form
    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // ── Academic session ──────────────────────────────────────────────────────
    const sessionLabel = student.session
      ? s(student.session.sessionName || `${student.session.startYear}-${student.session.endYear}`)
      : '';

    // ── Address: StudentProfile stores address as a plain string ─────────────
    // (schema: address: String, addressLine2: String, city, state, pincode)
    const addressStr  = s(student.address);
    const city        = s(student.city);
    const stateStr    = s(student.state);
    const pincode     = s(student.pincode);
    const fullAddress = [addressStr, city, stateStr, pincode].filter(Boolean).join(', ');

    // ── Conditional checkbox evaluators ───────────────────────────────────────
    // GENDER
    const gender_m = tick(gender === 'male');
    const gender_f = tick(gender === 'female');

    // RTE — stored as `rte` (boolean) in StudentProfile
    const isRte   = !!student.rte;
    const rte_yes = tick(isRte);
    const rte_no  = tick(!isRte);

    // CATEGORY
    const cat_gen = tick(category === 'General');
    const cat_obc = tick(category === 'OBC');
    const cat_sc  = tick(category === 'SC');
    const cat_st  = tick(category === 'ST');
    const cat_ews = tick(category === 'EWS');

    // RELIGION
    const rel_hindu    = tick(religion === 'hindu');
    const rel_muslim   = tick(religion === 'muslim');
    const rel_christian= tick(religion === 'christian');
    const rel_sikh     = tick(religion === 'sikh');
    const rel_other    = tick(!!religion && !['hindu','muslim','christian','sikh'].includes(religion));

    // BPL — now backed by student.bplStudent boolean field
    const isBpl   = !!(student.bplStudent);  // ← fixed: was isBplStudent (never existed in schema)
    const bpl_yes = tick(isBpl);
    const bpl_no  = tick(!isBpl);

    // RESULT
    const res_pass = tick(['active', 'passed', 'passed_out'].includes(status));
    const res_fail = tick(['left', 'dropped', 'deleted'].includes(status));

    // ── Build the complete flat data map ─────────────────────────────────────
    const flat = {

      // ── Core Identity ────────────────────────────────────────────────────
      name:             fullName,
      fullName,
      firstName,
      lastName,
      admissionNo:      s(student.admissionNumber),
      admissionNumber:  s(student.admissionNumber),
      admissionNo:      s(student.admissionNumber),
      rollNo:           s(student.rollNo),
      roll_no:          s(student.rollNo),
      scholarNo:        s(student.scholarNo),
      scholar_no:       s(student.scholarNo),
      pen:              s(student.pen || student.penNo),
      penNo:            s(student.pen || student.penNo),
      aadharCard:       s(student.aadharCard),
      aadharNo:         s(student.aadharCard),
      aadhaar:          s(student.aadharCard),
      studentId:        s(student.studentId),
      ssmId:            s(student.ssmId),
      familyId:         s(student.familyId),

      // ── Demographics ──────────────────────────────────────────────────────
      gender:           s(student.gender),
      dob:              dateStr(student.dateOfBirth),
      dateOfBirth:      dateStr(student.dateOfBirth),
      bloodGroup:       s(student.bloodGroup),
      blood_group:      s(student.bloodGroup),
      religion:         s(student.religion),
      caste:            s(student.caste),
      category,
      nationality:      s(student.nationality),
      placeOfBirth:     s(student.placeOfBirth),
      motherTongue:     s(student.motherTongue),

      // ── Contact ───────────────────────────────────────────────────────────
      phone:            s(student.phone),
      mobileNo:         s(student.phone),
      mobile_1:         s(father.phone),
      mobile_2:         s(mother.phone),
      whatsappNo:       s(student.whatsappNo || student.phone),
      whatsapp_no:      s(student.whatsappNo || student.phone),
      alternateNumber:  s(student.alternateNumber || mother.phone),
      alternate_number: s(student.alternateNumber || mother.phone),

      // ── Address ───────────────────────────────────────────────────────────
      address:          addressStr,
      addressLine2:     s(student.addressLine2),
      city,
      state:            stateStr,
      pincode,
      fullAddress,

      // ── Academic ──────────────────────────────────────────────────────────
      className,
      class:            className,
      sectionName,
      section:          sectionName,
      academicYear:     sessionLabel,
      session:          sessionLabel,
      admissionDate:    dateStr(student.admissionDate),
      previousSchool:   s(student.previousSchool),
      previousClass:    s(student.previousClass),

      // ── Government Schemes / Special IDs ──────────────────────────────────
      rte:              isRte ? 'Yes' : 'No',
      isRteStudent:     isRte ? 'Yes' : 'No',
      rteApplicationNo: s(student.rteApplicationNo),
      rte_application_no: s(student.rteApplicationNo),

      // Samagra / SSM
      ssmId:            s(student.ssmId),
      samagraId:        s(student.ssmId),
      samgra_id:        s(student.ssmId),      // legacy typo alias kept
      samagra_id:       s(student.ssmId),
      ladli_laxmi:      s(student.ladliLaxmiNo || student.ssmId),
      ladliLaxmiNo:     s(student.ladliLaxmiNo),
      ladli_laxmi_no:   s(student.ladliLaxmiNo),
      boardEnrollNo:    s(student.boardEnrollNo),
      board_enroll_no:  s(student.boardEnrollNo),

      // Family ID
      familyId:         s(student.familyId),
      family_id:        s(student.familyId),
      govt_family_id:   s(student.familyId),

      // APAAR / ABC ID
      apaarId:          s(student.apaarId),
      apaar_id:         s(student.apaarId),
      abcId:            s(student.apaarId),
      abc_id:           s(student.apaarId),

      // BPL
      bplStudent:       isBpl ? 'Yes' : 'No',
      isBplStudent:     isBpl ? 'Yes' : 'No',
      bplCardNo:        s(student.bplCardNo),
      bpl_card_no:      s(student.bplCardNo),

      // SRN
      srnNo:            s(student.srnNo),
      srn_no:           s(student.srnNo),

      // Scholarship & Domicile
      scholarshipId:    s(student.scholarshipId),
      scholarship_id:   s(student.scholarshipId),
      domicileApplicationNo: s(student.domicileApplicationNo),
      domicile_application_no: s(student.domicileApplicationNo),

      // Caste Certificate — now real DB fields
      casteApplicationNo:   s(student.casteApplicationNo),
      caste_cert_no:        s(student.casteApplicationNo),
      casteCertNo:          s(student.casteApplicationNo),
      caste_certificate_no: s(student.casteApplicationNo),
      casteApplicationDate: dateStr(student.casteApplicationDate),
      caste_cert_date:      dateStr(student.casteApplicationDate),
      casteCertDate:        dateStr(student.casteApplicationDate),

      // ── Documents ─────────────────────────────────────────────────────────
      photo:            s(docs.photo || student.photo),
      studentPhoto:     s(docs.photo || student.photo),

      // ── Status ────────────────────────────────────────────────────────────
      status:           s(student.status),
      remarks:          s(student.remarks),

      // ── Father ────────────────────────────────────────────────────────────
      fatherName:          s(father.name),
      fatherPhone:         s(father.phone),
      fatherEmail:         s(father.email),
      fatherOccupation:    s(father.occupation),
      fatherIncome:        s(father.annualIncome),   // ← correct field name
      fatherAnnualIncome:  s(father.annualIncome),
      fatherQualification: s(father.qualification),
      fatherAadharCard:    s(student.fatherAadharCard),
      fatherAadharNo:      s(student.fatherAadharCard),
      father_aadhar_no:    s(student.fatherAadharCard),
      fatherAadhaar:       s(student.fatherAadharCard),
      father_aadhaar:      s(student.fatherAadharCard),

      // ── Mother ────────────────────────────────────────────────────────────
      motherName:          s(mother.name),
      motherPhone:         s(mother.phone),
      motherEmail:         s(mother.email),
      motherOccupation:    s(mother.occupation),
      motherQualification: s(mother.qualification),
      motherAadharCard:    s(student.motherAadharCard),
      motherAadharNo:      s(student.motherAadharCard),
      mother_aadhar_no:    s(student.motherAadharCard),
      motherAadhaar:       s(student.motherAadharCard),
      mother_aadhaar:      s(student.motherAadharCard),

      // ── Guardian ──────────────────────────────────────────────────────────
      guardianName:        s(guardian.name),
      guardianPhone:       s(guardian.phone),
      guardianEmail:       s(guardian.email),
      guardianRelation:    s(guardian.relation),
      guardianQualification: s(guardian.qualification),
      guardianIncome:      s(guardian.income),
      guardianAadharCard:  s(student.guardianAadharCard),
      guardianAadharNo:    s(student.guardianAadharCard),
      guardian_aadhar_no:  s(student.guardianAadharCard),

      // ── Bank (correct field paths from schema) ────────────────────────────
      bankName:            s(bank.bankName),
      bankBranch:          s(bank.branchName),
      bankAccountNo:       s(bank.accountNumber),    // ← schema: accountNumber
      bankIfsc:            s(bank.ifsc),              // ← schema: ifsc

      // ── Transport ─────────────────────────────────────────────────────────
      transportRequired:   transport.transportRequired ? 'Yes' : 'No',
      transportPickup:     s(transport.pickupPoint),
      transportRoute:      s(transport.routeNo),

      // ── School (branding + codes) ────────────────────────────────────────────
      schoolName,
      schoolLogo,
      schoolPhone,
      school_phone:        schoolPhone,
      schoolAddress,
      school_address:      schoolAddress,

      // DISE / UDISE code — resolves {{dise_code}}, {{udise_code}}, etc.
      dise_code:           diseCode,
      udise_code:          diseCode,
      udise:               diseCode,
      diseCode:            diseCode,

      // School registration / affiliation number — resolves {{reg_no}}, {{affiliation_no}}
      schoolRegNo,
      school_reg_no:       schoolRegNo,
      reg_no:              schoolRegNo,
      affiliation_no:      schoolRegNo,

      // ── System / form-level fields ──────────────────────────────────────────
      // {{date}} → today's date (the date the form is printed/filled)
      date:                todayStr,
      form_date:           todayStr,
      today:               todayStr,
      current_date:        todayStr,
      print_date:          todayStr,

      // {{student_aadhar}} → student Aadhaar (extra alias not caught by registry before)
      student_aadhar:      s(student.aadharCard),
      student_aadhaar:     s(student.aadharCard),
      student_aadhar_no:   s(student.aadharCard),

      // ══════════════════════════════════════════════════════════════════════
      // CONDITIONAL CHECKBOX FIELDS
      // ══════════════════════════════════════════════════════════════════════

      // Gender
      gender_m,
      gender_f,

      // RTE
      rte_yes,
      rte_no,

      // BPL
      bpl_yes,
      bpl_no,

      // Category
      cat_gen,
      cat_obc,
      cat_sc,
      cat_st,
      cat_ews,

      // Religion
      rel_hindu,
      rel_muslim,
      rel_christian,
      rel_sikh,
      rel_other,

      // Result / status
      res_pass,
      res_fail,

      // ── Exact template placeholder names (match what the uploaded template uses) ───
      // These are direct copies so the template parser resolves them with 0 lookups.

      // Template uses: {{scholar_no}}
      scholar_no:       s(student.scholarNo),

      // Template uses: {{student_name}}
      student_name:     fullName,

      // Template uses: {{father_name}}
      father_name:      s(father.name),

      // Template uses: {{mother_name}}
      mother_name:      s(mother.name),

      // Template uses: {{admission_class}}
      admission_class:  className,

      // Template uses: {{mobile_1}} / {{mobile_2}}
      mobile_1:         s(father.phone),
      mobile_2:         s(mother.phone),

      // Template uses: {{caste}}
      // (already set above as flat.caste)

      // Template uses: {{bank_name}} — CRITICAL: template uses snake_case
      bank_name:        s(bank.bankName),
      bank_branch:      s(bank.branchName),

      // Template uses: {{ifsc_code}}
      ifsc_code:        s(bank.ifsc),

      // Template uses: {{account_no}}
      account_no:       s(bank.accountNumber),

      // Template uses: {{occupation}} / {{income}}
      occupation:       s(father.occupation),
      income:           s(father.annualIncome),

      // Template uses: {{prev_school}}
      prev_school:      s(student.previousSchool),

      // Template uses: {{ladli_laxmi}}
      ladli_laxmi:      s(student.ssmId),

      // Template uses: {{caste_cert_no}} / {{caste_cert_date}}
      caste_cert_no:    s(student.casteApplicationNo),
      caste_cert_date:  dateStr(student.casteApplicationDate),

      // Samagra / Family IDs (for templates using these names)
      samagra_id:       s(student.ssmId),
      family_id:        s(student.familyId),
    };

    // ── Dot-notation namespace objects ────────────────────────────────────────
    const data = {
      ...flat,

      // student.* namespace
      student: {
        name:           fullName,
        firstName,
        lastName,
        admissionNo:    flat.admissionNo,
        rollNo:         flat.rollNo,
        scholarNo:      flat.scholarNo,
        pen:            flat.pen,
        gender:         s(student.gender),
        dob:            flat.dob,
        bloodGroup:     flat.bloodGroup,
        religion:       flat.religion,
        caste:          flat.caste,
        category,
        nationality:    flat.nationality,
        photo:          flat.photo,
        class:          className,
        section:        sectionName,
        phone:          flat.phone,
        aadharCard:     flat.aadharCard,
        ssmId:          flat.ssmId,
        rte:            flat.rte,
        status:         flat.status,
      },

      // parent.* namespace
      parent: {
        father: {
          name:        flat.fatherName,
          phone:       flat.fatherPhone,
          email:       flat.fatherEmail,
          occupation:  flat.fatherOccupation,
          income:      flat.fatherIncome,
        },
        mother: {
          name:        flat.motherName,
          phone:       flat.motherPhone,
          email:       flat.motherEmail,
          occupation:  flat.motherOccupation,
        },
        guardian: {
          name:        flat.guardianName,
          phone:       flat.guardianPhone,
          email:       flat.guardianEmail,
          relation:    flat.guardianRelation,
        },
      },

      // addr.* namespace — 'address' key is kept as the flat formatted STRING above.
      // Templates using {{address}} resolve to the plain string, NOT this object.
      // Use {{addr.street}}, {{addr.city}} etc. for sub-field access.
      addr: {
        street:  addressStr,
        city,
        state:   stateStr,
        pincode,
        full:    fullAddress,
      },

      // academic.* namespace
      academic: {
        class:   className,
        section: sectionName,
        year:    sessionLabel,
        session: sessionLabel,
        admDate: flat.admissionDate,
      },

      // bank.* namespace
      bank: {
        name:      flat.bankName,
        branch:    flat.bankBranch,
        accountNo: flat.bankAccountNo,
        ifsc:      flat.bankIfsc,
      },

      // school.* namespace
      school: {
        name: schoolName,
        logo: schoolLogo,
      },
    };

    // ── Registry-driven alias expansion ───────────────────────────────────────
    // For every alias in the registry, if the canonical value exists in `data`
    // but the alias key doesn't, add it automatically.
    // This makes the snapshot forward-compatible with new templates.
    const aliasMap = AdmissionFieldRegistry.getAliasMap();
    Object.entries(aliasMap).forEach(([alias, canonical]) => {
      if (data[alias] === undefined && data[canonical] !== undefined) {
        data[alias] = data[canonical];
      }
    });

    return data;
  }

  /**
   * Build sample data for template preview (no real student needed).
   * Includes all conditional checkbox fields and aliases.
   */
  static getSampleData(schoolSettings = {}) {
    const schoolName = schoolSettings?.schoolName || 'The Hukumchand Memorial H.S. School';
    return {
      // ── Identity
      name:             'Sneha Sharma',
      firstName:        'Sneha',
      lastName:         'Sharma',
      admissionNo:      'ADM-2024-0082',
      admissionNumber:  'ADM-2024-0082',
      rollNo:           '12',
      scholarNo:        'SCH9002',
      pen:              'PEN12345678',
      aadharCard:       '1234-5678-9012',
      aadharNo:         '1234-5678-9012',
      ssmId:            'SSM-2024-001',
      familyId:         'FAM-20240001',

      // ── Demographics
      gender:           'Female',
      dob:              '12/03/2013',
      dateOfBirth:      '12/03/2013',
      bloodGroup:       'B+',
      religion:         'Hindu',
      caste:            'General',
      category:         'General',
      nationality:      'Indian',
      motherTongue:     'Hindi',

      // ── Contact
      phone:            '9876543210',
      mobileNo:         '9876543210',

      // ── Address
      address:          '42, Ram Nagar',
      city:             'Bhopal',
      state:            'Madhya Pradesh',
      pincode:          '462001',
      fullAddress:      '42, Ram Nagar, Bhopal, Madhya Pradesh, 462001',

      // ── Academic
      className:        'Class 6',
      class:            'Class 6',
      sectionName:      'A',
      section:          'A',
      academicYear:     '2024-25',
      session:          '2024-25',
      admissionDate:    '01/04/2024',
      previousSchool:   'Government Primary School, Bhopal',
      previousClass:    '5th',

      // ── Scheme
      rte:              'No',
      isRteStudent:     'No',
      bplStudent:       'No',
      isBplStudent:     'No',
      bplCardNo:        '',

      // ── Parents
      fatherName:       'Sharma Father',
      fatherPhone:      '9812345678',
      fatherEmail:      'sharma.father@example.com',
      fatherOccupation: 'Government Employee',
      fatherIncome:     '50000',
      fatherAnnualIncome: '50000',
      fatherAadharCard: '9876-5432-1010',
      fatherAadharNo:   '9876-5432-1010',

      motherName:       'Sharma Mother',
      motherPhone:      '9800012345',
      motherOccupation: 'Homemaker',
      motherAadharCard: '9876-5432-2020',
      motherAadharNo:   '9876-5432-2020',

      guardianName:     '',
      guardianPhone:    '',
      guardianRelation: '',

      // ── Bank
      bankName:         'State Bank of India',
      bankBranch:       'Bhopal Main Branch',
      bankAccountNo:    '1234567890',
      bankIfsc:         'SBIN0000001',

      // ── Transport
      transportRequired: 'No',

      // ── School branding + codes
      schoolName,
      schoolLogo:       schoolSettings?.logo || '',
      schoolPhone:      schoolSettings?.phone || '0755-2600000',
      school_phone:     schoolSettings?.phone || '0755-2600000',
      schoolAddress:    schoolSettings?.address || 'Station Road, Indore, MP',
      school_address:   schoolSettings?.address || 'Station Road, Indore, MP',
      dise_code:        schoolSettings?.udiseCode || schoolSettings?.dise_code || '23360309912',
      udise_code:       schoolSettings?.udiseCode || schoolSettings?.dise_code || '23360309912',
      udise:            schoolSettings?.udiseCode || schoolSettings?.dise_code || '23360309912',
      diseCode:         schoolSettings?.udiseCode || schoolSettings?.dise_code || '23360309912',
      schoolRegNo:      schoolSettings?.regNo || schoolSettings?.affiliationNo || '682064',
      school_reg_no:    schoolSettings?.regNo || schoolSettings?.affiliationNo || '682064',
      reg_no:           schoolSettings?.regNo || schoolSettings?.affiliationNo || '682064',
      affiliation_no:   schoolSettings?.regNo || schoolSettings?.affiliationNo || '',

      // ── System / form-level
      date:             new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      form_date:        new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      today:            new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      current_date:     new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      print_date:       new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),

      // student_aadhar alias
      student_aadhar:   '1234-5678-9012',
      student_aadhaar:  '1234-5678-9012',
      student_aadhar_no:'1234-5678-9012',

      // ══════════════════════════════════════════════
      // CONDITIONAL CHECKBOX FIELDS (sample: Female, Hindu, General, active)
      // ══════════════════════════════════════════════
      gender_m:     EMPTY,
      gender_f:     TICK,
      rte_yes:      EMPTY,
      rte_no:       TICK,
      bpl_yes:      EMPTY,
      bpl_no:       TICK,
      cat_gen:      TICK,
      cat_obc:      EMPTY,
      cat_sc:       EMPTY,
      cat_st:       EMPTY,
      cat_ews:      EMPTY,
      rel_hindu:    TICK,
      rel_muslim:   EMPTY,
      rel_christian:EMPTY,
      rel_sikh:     EMPTY,
      rel_other:    EMPTY,
      res_pass:     TICK,
      res_fail:     EMPTY,

      // ══════════════════════════════════════════════
      // ALIAS FIELDS (exact template placeholder names)
      // ══════════════════════════════════════════════
      mobile_1:         '9812345678',
      mobile_2:         '9800012345',
      account_no:       '1234567890',
      ifsc_code:        'SBIN0000001',
      occupation:       'Government Employee',
      income:           '50000',
      prev_school:      'Government Primary School, Bhopal',
      admission_class:  'Class 6',
      ladli_laxmi:      'SSM-2024-001',
      caste_cert_no:    'CC-2024-0456',
      caste_cert_date:  '15/08/2023',

      // ── Exact template placeholder names (match uploaded template)
      scholar_no:       'SCH9002',
      student_name:     'Sneha Sharma',
      father_name:      'Sharma Father',
      mother_name:      'Sharma Mother',
      bank_name:        'State Bank of India',
      bank_branch:      'Bhopal Main Branch',
      samagra_id:       'SSM-2024-001',
      family_id:        'FAM-20240001',

      // ── Namespace objects
      student: {
        name: 'Sneha Sharma', firstName: 'Sneha', lastName: 'Sharma',
        class: 'Class 6', section: 'A', gender: 'Female', dob: '12/03/2013',
        aadharCard: '1234-5678-9012', pen: 'PEN12345678', ssmId: 'SSM-2024-001',
      },
      parent: {
        father: { name: 'Sharma Father', phone: '9812345678', occupation: 'Government Employee', income: '50000' },
        mother: { name: 'Sharma Mother', phone: '9800012345', occupation: 'Homemaker' },
        guardian: { name: '', phone: '', relation: '' },
      },
      addr: { street: '42, Ram Nagar', city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001', full: '42, Ram Nagar, Bhopal, Madhya Pradesh, 462001' },
      academic: { class: 'Class 6', section: 'A', year: '2024-25', admDate: '01/04/2024' },
      bank: { name: 'State Bank of India', branch: 'Bhopal Main Branch', accountNo: '1234567890', ifsc: 'SBIN0000001' },
      school: { name: schoolName, logo: schoolSettings?.logo || '', dise: schoolSettings?.udiseCode || '23360309912' },
    };
  }

  /**
   * Diagnose missing fields after rendering.
   * Returns enriched error info for each field that didn't resolve.
   *
   * @param {string[]} missingFields  - from TemplateParserService.render().missingFields
   * @param {Object}   data           - the snapshot used for rendering
   */
  static diagnoseMissing(missingFields, data = {}) {
    return AdmissionFieldRegistry.diagnoseMissing(missingFields, data);
  }
}

module.exports = AdmissionDataService;
