/**
 * StudentAdapter — Real codebase integration
 *
 * Extends BaseAdapter and implements the actual student creation flow
 * that matches admissionController.registerStudent() exactly:
 *   1. Resolve session/class/section names → ObjectIds
 *   2. Respect SchoolSettings auto-gen toggles
 *   3. Generate admissionNo / rollNo / studentId
 *   4. bcryptjs.hash(password || DOB-as-DDMMYYYY || '12345678')
 *   5. User.create({ role: 'student', schoolId })
 *   6. StudentProfile.create({ userId, ...data, schoolId })
 *   7. Fire-and-forget fee assignment
 *
 * Duplicate policy: SKIP — school sees which rows were skipped so they
 * can do manual entry.
 */

const BaseAdapter = require('./baseAdapter');
const bcryptjs    = require('bcryptjs');

// Lazy requires to avoid circular deps
const getModels = () => ({
  User:            require('../../models/user').User,
  StudentProfile:  require('../../models/StudentProfile'),
  ClassModel:      require('../../models/ClassModel'),
  SectionModel:    require('../../models/SectionModel'),
  AcademicSession: require('../../models/AcademicSession'),
  SchoolSettings:  require('../../models/SchoolSettings'),
});

// ── Helpers (same as admissionController) ────────────────────────────────────

const dobToPassword = (dob) => {
  if (!dob) return '12345678';
  try {
    const d  = new Date(dob);
    if (isNaN(d.getTime())) return '12345678';
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}${mm}${yyyy}`;
  } catch { return '12345678'; }
};

const getSessionCode = (sessionName) => {
  const parts = (sessionName || '').split('-');
  return parts.length > 1 ? parts[1].trim() : String(sessionName).slice(-2);
};

const getOrCreateSettings = async (SchoolSettings, schoolId) => {
  let s = await SchoolSettings.findOne({ schoolId });
  if (!s) s = await SchoolSettings.create({ schoolId });
  return s;
};

const generateAdmissionNo = async (SchoolSettings, sessionCode, schoolId) => {
  const settings = await getOrCreateSettings(SchoolSettings, schoolId);
  settings.lastAdmissionSerial += 1;
  await settings.save();
  return `ADM-${sessionCode}${String(settings.lastAdmissionSerial).padStart(5, '0')}`;
};

const generateStudentId = (sessionCode) => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `STU-${sessionCode}${rand}`;
};

const generateRollNo = async (StudentProfile, sessionCode, classNumericOrder, sectionName, classId, sectionId, sessionId) => {
  const count  = await StudentProfile.countDocuments({ classId, sectionId, session: sessionId });
  const serial = count + 1;
  return `${sessionCode}${classNumericOrder}${sectionName}${serial}`;
};

const safeDate = (v) => (v && String(v).trim() !== '' ? v : undefined);

// ── StudentAdapter Class ──────────────────────────────────────────────────────

class StudentAdapter extends BaseAdapter {
  constructor(config = {}, services = {}) {
    super(config, services);
    this.entityType = 'student';
  }

  // ── Required by BaseAdapter ──────────────────────────────────────────────

  getEntityType()    { return 'student'; }
  getEntityConfig()  { return this.config; }

  /**
   * Validate a single processed row before persisting.
   * Returns array of error strings (empty = valid).
   */
  async validateRow(row, context = {}) {
    const errors = [];
    const { schoolId, referenceResolver } = context;

    if (!row.firstName) errors.push('firstName is required');
    if (!row.lastName)  errors.push('lastName is required');
    if (!row.dateOfBirth && !row.dob) errors.push('dateOfBirth is required');
    if (!row.fatherName && !row.parentDetails?.father?.name) errors.push('fatherName is required');
    if (!row.fatherPhone && !row.parentDetails?.father?.phone) errors.push('fatherPhone is required');
    if (!row.address)   errors.push('address is required');

    // Resolve session
    const sessionName = row.sessionName || row.session;
    if (!sessionName) {
      errors.push('sessionName is required (e.g. "2025-26")');
      return errors; // stop here — class/section depend on session
    }

    if (referenceResolver && schoolId) {
      const sessionDoc = await referenceResolver.resolveSessionByName(sessionName, schoolId);
      if (!sessionDoc) {
        errors.push(`Session "${sessionName}" not found. Please create it in Academic Sessions first.`);
        return errors;
      }

      const className = row.className || row.class;
      if (!className) { errors.push('className is required'); return errors; }

      const classDoc = await referenceResolver.resolveClassByName(className, sessionDoc._id, schoolId);
      if (!classDoc) {
        errors.push(`Class "${className}" not found in session "${sessionName}". Please ensure classes are set up.`);
        return errors;
      }

      const sectionName = row.sectionName || row.section;
      if (!sectionName) { errors.push('sectionName is required'); return errors; }

      const sectionDoc = await referenceResolver.resolveSectionByName(sectionName, classDoc._id, sessionDoc._id, schoolId);
      if (!sectionDoc) {
        errors.push(`Section "${sectionName}" not found in class "${className}". Please ensure sections are set up.`);
      }
    }

    return errors;
  }

  /**
   * Persist a single validated row to the database.
   * Returns { success, data, errors }.
   */
  async create(row, context = {}) {
    const { schoolId, referenceResolver } = context;
    const {
      User, StudentProfile, ClassModel, SectionModel, AcademicSession, SchoolSettings
    } = getModels();

    try {
      // ── 1. Resolve session ───────────────────────────────────────────────
      const sessionName = row.sessionName || row.session || '';
      const sessionDoc  = await referenceResolver.resolveSessionByName(sessionName, schoolId);
      if (!sessionDoc) {
        return {
          success: false,
          errors: [`Session "${sessionName}" not found. Create it first in Academic Sessions.`],
        };
      }

      // ── 2. Resolve class ─────────────────────────────────────────────────
      const className = row.className || row.class || '';
      const classDoc  = await referenceResolver.resolveClassByName(className, sessionDoc._id, schoolId);
      if (!classDoc) {
        return {
          success: false,
          errors: [`Class "${className}" not found in session "${sessionName}".`],
        };
      }

      // ── 3. Resolve section ───────────────────────────────────────────────
      const sectionName = row.sectionName || row.section || '';
      const sectionDoc  = await referenceResolver.resolveSectionByName(sectionName, classDoc._id, sessionDoc._id, schoolId);
      if (!sectionDoc) {
        return {
          success: false,
          errors: [`Section "${sectionName}" not found in class "${className}".`],
        };
      }

      // ── 4. SchoolSettings auto-gen toggles ───────────────────────────────
      const settings    = await getOrCreateSettings(SchoolSettings, schoolId);
      const sessionCode = getSessionCode(sessionDoc.name);

      // ── 5. Generate IDs ──────────────────────────────────────────────────
      let finalAdmissionNo = row.admissionNumber || row.admissionNo || row.admission_no;
      let finalRollNo      = row.rollNo || row.roll_no || row.rollNumber;
      let finalStudentId   = row.studentId || row.student_id;

      if (settings.autoGenerateAdmissionNo && !finalAdmissionNo) {
        finalAdmissionNo = await generateAdmissionNo(SchoolSettings, sessionCode, schoolId);
      }
      if (!finalAdmissionNo) {
        return {
          success: false,
          errors: ['admissionNumber is required (auto-generate is off in School Settings).'],
        };
      }
      if (settings.autoGenerateRollNo && !finalRollNo) {
        finalRollNo = await generateRollNo(
          StudentProfile, sessionCode,
          classDoc.numericOrder, sectionDoc.name,
          classDoc._id, sectionDoc._id, sessionDoc._id
        );
      }
      if (settings.autoGenerateStudentId && !finalStudentId) {
        finalStudentId = generateStudentId(sessionCode);
      }

      // ── 6. Email + Phone ─────────────────────────────────────────────────
      const rawEmail       = row.email && typeof row.email === 'string' ? row.email.trim() : '';
      const normalizedEmail = rawEmail || undefined;
      const phone          = row.phone || row.mobile || row.fatherPhone || row.father_phone || '';

      // ── 7. Duplicate check — SKIP policy ─────────────────────────────────
      if (normalizedEmail) {
        const existingUser = await User.findOne({ email: normalizedEmail, schoolId });
        if (existingUser) {
          return {
            success:   false,
            skipped:   true,
            errors:    [`Email "${normalizedEmail}" already registered. Skipped — do manual entry if needed.`],
          };
        }
      }
      // Also check admissionNumber uniqueness
      const existingProfile = await StudentProfile.findOne({ admissionNumber: finalAdmissionNo, schoolId });
      if (existingProfile) {
        return {
          success:  false,
          skipped:  true,
          errors:   [`Admission number "${finalAdmissionNo}" already exists. Skipped — do manual entry if needed.`],
        };
      }

      // ── 8. Build parent details ──────────────────────────────────────────
      const fatherName  = row.fatherName  || row.father_name  || row['Father Name'] || '';
      const fatherPhone = row.fatherPhone || row.father_phone || row['Father Phone'] || phone;
      const fatherEmail = row.fatherEmail || row.father_email || '';
      const motherName  = row.motherName  || row.mother_name  || '';
      const motherPhone = row.motherPhone || row.mother_phone || '';

      // ── 9. Hash password ─────────────────────────────────────────────────
      const dob             = row.dateOfBirth || row.dob || row.date_of_birth || null;
      const rawPassword     = row.password || dobToPassword(dob);
      const hashedPassword  = await bcryptjs.hash(rawPassword, 10);

      // ── 10. Create User ──────────────────────────────────────────────────
      const userPayload = {
        firstName:  row.firstName || row.first_name,
        lastName:   row.lastName  || row.last_name,
        phone:      phone || fatherPhone,
        password:   hashedPassword,
        role:       'student',
        isActive:   true,
        isVerified: true,
        schoolId,
      };
      if (normalizedEmail) userPayload.email = normalizedEmail;

      let user;
      try {
        user = await User.create(userPayload);
      } catch (userErr) {
        if (userErr.code === 11000) {
          return {
            success: false,
            skipped: true,
            errors:  [`User with email "${normalizedEmail}" already exists. Skipped.`],
          };
        }
        throw userErr;
      }

      // ── 11. Create StudentProfile ────────────────────────────────────────
      let studentProfile;
      try {
        studentProfile = await StudentProfile.create({
          userId:          user._id,
          admissionNumber: finalAdmissionNo,
          studentId:       finalStudentId,
          rollNo:          finalRollNo,
          scholarNo:       row.scholarNo || row.scholar_no || undefined,
          pen:             row.pen || undefined,
          firstName:       row.firstName  || row.first_name,
          middleName:      row.middleName || row.middle_name || '',
          lastName:        row.lastName   || row.last_name,
          gender:          (row.gender || '').toLowerCase(),
          dateOfBirth:     safeDate(dob),
          placeOfBirth:    row.placeOfBirth  || row.place_of_birth || '',
          nationality:     row.nationality   || 'Indian',
          religion:        row.religion      || '',
          caste:           row.caste         || '',
          category:        row.category      || '',
          motherTongue:    row.motherTongue  || row.mother_tongue || '',
          bloodGroup:      row.bloodGroup    || row.blood_group   || '',
          aadharCard:      row.aadharCard    || row.aadhar        || '',
          ssmId:           row.ssmId         || row.ssm_id        || '',
          familyId:        row.familyId      || row.family_id     || '',
          rte:             String(row.rte).toLowerCase() === 'true' || row.rte === true || false,
          classId:         classDoc._id,
          sectionId:       sectionDoc._id,
          session:         sessionDoc._id,
          admissionDate:   safeDate(row.admissionDate || row.admission_date),
          previousSchool:  row.previousSchool  || row.previous_school  || '',
          previousClass:   row.previousClass   || row.previous_class   || '',
          stream:          row.stream          || undefined,
          phone:           phone               || fatherPhone,
          address:         row.address         || '',
          addressLine2:    row.addressLine2    || row.address2         || '',
          city:            row.city            || '',
          state:           row.state           || '',
          pincode:         row.pincode         || row.pin              || '',
          emergencyContact: {
            name:     row.emergencyContactName  || row.emergency_name  || '',
            phone:    row.emergencyContactPhone || row.emergency_phone || '',
            relation: row.emergencyContactRelation || row.emergency_relation || '',
          },
          parentDetails: {
            father: {
              name:         fatherName,
              occupation:   row.fatherOccupation || row.father_occupation || '',
              phone:        fatherPhone,
              email:        fatherEmail,
              annualIncome: row.fatherIncome     || row.father_income     || '',
            },
            mother: {
              name:       motherName,
              occupation: row.motherOccupation   || row.mother_occupation || '',
              phone:      motherPhone,
              email:      row.motherEmail        || row.mother_email       || '',
            },
            guardian: {
              name:     row.guardianName     || row.guardian_name     || '',
              relation: row.guardianRelation || row.guardian_relation || '',
              phone:    row.guardianPhone    || row.guardian_phone    || '',
              email:    row.guardianEmail    || row.guardian_email    || '',
            },
          },
          bankDetails: {
            accountNumber: row.accountNumber || row.bank_account || '',
            bankName:      row.bankName      || row.bank_name    || '',
            ifsc:          row.ifsc          || '',
            branchName:    row.branchName    || row.branch_name  || '',
          },
          healthInfo: {
            healthIssues:   row.healthIssues   || '',
            allergies:      row.allergies       || '',
            medications:    row.medications     || '',
            disabilityType: row.disabilityType  || '',
          },
          transportation: {
            transportRequired: row.transportRequired === 'true' || row.transportRequired === true,
            pickupPoint:       row.pickupPoint  || '',
            routeNo:           row.routeNo      || '',
          },
          hostel: {
            hostelRequired: row.hostelRequired === 'true' || row.hostelRequired === true,
            roomNo:         row.roomNo || '',
          },
          remarks:  row.remarks  || '',
          schoolId,
        });
      } catch (profileErr) {
        // Roll back user to avoid orphaned User records
        await User.findByIdAndDelete(user._id);
        throw profileErr;
      }

      // ── 12. Fee auto-assignment (fire and forget) ────────────────────────
      setImmediate(async () => {
        try {
          const { assignFeeToStudent } = require('../../services/fee/studentFeeService');
          await assignFeeToStudent(studentProfile._id);
        } catch (_) { /* No fee structure set up yet — that's OK */ }
      });

      return {
        success: true,
        data: {
          user:        { _id: user._id, email: user.email, role: user.role },
          profile:     studentProfile,
          credentials: {
            admissionNumber: finalAdmissionNo,
            rollNo:          finalRollNo,
            studentId:       finalStudentId,
            defaultPassword: rawPassword,
          },
        },
      };
    } catch (err) {
      console.error('[StudentAdapter] create() error:', err.message);
      return { success: false, errors: [err.message] };
    }
  }

  /**
   * Update existing student (not used in standard import — kept for future)
   */
  async update(id, data, context = {}) {
    const { StudentProfile } = getModels();
    const { schoolId } = context;
    const profile = await StudentProfile.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: data },
      { new: true, runValidators: true }
    );
    return profile
      ? { success: true, data: profile }
      : { success: false, errors: ['Student not found'] };
  }

  /**
   * Check if a student already exists based on unique identifiers
   */
  async checkDuplicate(row, context = {}) {
    const { StudentProfile, User } = getModels();
    const { schoolId } = context;

    const checks = [];
    const admissionNo = row.admissionNumber || row.admissionNo;
    if (admissionNo) checks.push(StudentProfile.findOne({ admissionNumber: admissionNo, schoolId }));

    const email = row.email?.trim();
    if (email) checks.push(User.findOne({ email, schoolId }));

    const results = await Promise.all(checks);
    return results.some(Boolean);
  }

  /**
   * Get transform rules for this entity (delegates to config)
   */
  getTransformRules() {
    return this.config?.transformations || {};
  }

  /**
   * Get validation rules for this entity (delegates to config)
   */
  getValidationRules() {
    return this.config?.validationRules || {};
  }
}

module.exports = StudentAdapter;
