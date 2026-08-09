/**
 * TeacherAdapter — Real codebase integration
 *
 * Mirrors admissionController.registerTeacher() exactly:
 *   1. Validate + normalize email (required for teachers)
 *   2. Duplicate check — skip policy with clear message
 *   3. Generate teacherId (TCH-XXXXXX) + employeeId (EMP-XXXXX)
 *   4. bcryptjs.hash(password || DOB || '12345678')
 *   5. User.create({ role: 'teacher', schoolId })
 *   6. TeacherProfile.create({ userId, schoolId, ...data })
 */

const BaseAdapter = require('./baseAdapter');
const bcryptjs    = require('bcryptjs');
const logger = require('../../../core/logging/logger.js');

const getModels = () => ({
  User:           require('../../identity').User,
  TeacherProfile: require('../../people').TeacherProfile,
  SchoolSettings: require('../../tenancy').SchoolSettings,
});

// Helpers

const dobToPassword = (dob) => {
  if (!dob) return '12345678';
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return '12345678';
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}${mm}${yyyy}`;
  } catch { return '12345678'; }
};

const safeDate = (v) => (v && String(v).trim() !== '' ? v : undefined);
const safeNum  = (v) => (v !== '' && v !== null && v !== undefined && !isNaN(Number(v)) ? Number(v) : undefined);

const getOrCreateSettings = async (SchoolSettings, schoolId) => {
  let s = await SchoolSettings.findOne({ schoolId });
  if (!s) s = await SchoolSettings.create({ schoolId });
  return s;
};

const generateTeacherId = async (SchoolSettings, schoolId) => {
  const settings = await getOrCreateSettings(SchoolSettings, schoolId);
  settings.lastTeacherSerial = (settings.lastTeacherSerial || 0) + 1;
  await settings.save();
  return `TCH-${String(settings.lastTeacherSerial).padStart(6, '0')}`;
};

const generateEmployeeId = async (TeacherProfile, schoolId) => {
  const count = await TeacherProfile.countDocuments({ schoolId });
  return `EMP-${String(count + 1).padStart(5, '0')}`;
};

// TeacherAdapter Class

class TeacherAdapter extends BaseAdapter {
  constructor(config = {}, services = {}) {
    super(config, services);
    this.entityType = 'teacher';
  }

  getEntityType()   { return 'teacher'; }
  getEntityConfig() { return this.config; }

  async validateRow(row, context = {}) {
    const errors = [];
    if (!row.firstName) errors.push('firstName is required');
    if (!row.lastName)  errors.push('lastName is required');
    const email = row.email?.trim();
    if (!email) errors.push('email is required for teachers');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`"${email}" is not a valid email`);
    if (!row.phone) errors.push('phone is required');
    return errors;
  }

  async create(row, context = {}) {
    const { schoolId } = context;
    const { User, TeacherProfile, SchoolSettings } = getModels();

    try {
      // 1. Email validation + duplicate check
      const normalizedEmail = (row.email || '').trim().toLowerCase();
      if (!normalizedEmail) {
        return { success: false, errors: ['Email is required for teacher registration.'] };
      }

      const existingUser = await User.findOne({ email: normalizedEmail, schoolId });
      if (existingUser) {
        return {
          success: false,
          skipped: true,
          errors:  [`Email "${normalizedEmail}" already registered. Skipped — do manual entry if needed.`],
        };
      }

      // 2. Password
      const dob        = row.dateOfBirth || row.dob || null;
      const rawPass    = row.password || dobToPassword(dob);
      const hashedPass = await bcryptjs.hash(rawPass, 10);

      // 3. Generate IDs
      const finalTeacherId  = await generateTeacherId(SchoolSettings, schoolId);
      const finalEmployeeId = row.employeeId || await generateEmployeeId(TeacherProfile, schoolId);

      // 4. Create User
      let user;
      try {
        user = await User.create({
          firstName:  row.firstName || row.first_name,
          lastName:   row.lastName  || row.last_name,
          email:      normalizedEmail,
          phone:      row.phone || row.mobile || '',
          password:   hashedPass,
          role:       'teacher',
          isActive:   true,
          isVerified: true,
          schoolId,
        });
      } catch (userErr) {
        if (userErr.code === 11000) {
          return {
            success: false,
            skipped: true,
            errors:  [`Email "${normalizedEmail}" already exists. Skipped.`],
          };
        }
        throw userErr;
      }

      // 5. Create TeacherProfile
      let teacherProfile;
      try {
        teacherProfile = await TeacherProfile.create({
          userId:       user._id,
          employeeId:   finalEmployeeId,
          teacherId:    finalTeacherId,
          firstName:    row.firstName    || row.first_name,
          middleName:   row.middleName   || row.middle_name || '',
          lastName:     row.lastName     || row.last_name,
          gender:       (row.gender || '').toLowerCase(),
          dateOfBirth:  safeDate(dob),
          nationality:  row.nationality   || 'Indian',
          religion:     row.religion      || '',
          caste:        row.caste         || '',
          category:     row.category      || '',
          maritalStatus:row.maritalStatus || row.marital_status || '',
          bloodGroup:   (row.bloodGroup   || row.blood_group || '').toUpperCase(),
          motherTongue: row.motherTongue  || row.mother_tongue || '',
          aadharCard:   row.aadharCard    || row.aadhar || '',
          panCard:      row.panCard       || row.pan || '',
          phone:        row.phone         || row.mobile || '',
          alternatePhone: row.alternatePhone || row.alternate_phone || '',
          address:      row.address       || '',
          addressLine2: row.addressLine2  || row.address2 || '',
          city:         row.city          || '',
          state:        row.state         || '',
          pincode:      row.pincode       || '',
          qualification:  row.qualification  || '',
          specialization: row.specialization || '',
          experience:     safeNum(row.experience),
          department:     row.department     || '',
          designation:    row.designation    || '',
          joiningDate:    safeDate(row.joiningDate || row.joining_date),
          familyDetails: {
            fatherName:  row.fatherName  || row.father_name  || '',
            fatherPhone: row.fatherPhone || row.father_phone || '',
            motherName:  row.motherName  || row.mother_name  || '',
            motherPhone: row.motherPhone || row.mother_phone || '',
            spouseName:  row.spouseName  || row.spouse_name  || '',
          },
          bankDetails: {
            accountNumber: row.accountNumber || row.bank_account || '',
            bankName:      row.bankName      || row.bank_name    || '',
            ifsc:          row.ifsc          || '',
            branchName:    row.branchName    || row.branch_name  || '',
          },
          salary: {
            basic:     safeNum(row.salaryBasic     || row.basic),
            hra:       safeNum(row.salaryHra       || row.hra),
            transport: safeNum(row.salaryTransport || row.transport_allowance),
            total:     safeNum(row.salaryTotal     || row.salary),
          },
          emergencyContact: {
            name:     row.emergencyName     || '',
            phone:    row.emergencyPhone    || '',
            relation: row.emergencyRelation || '',
          },
          panNumber: row.panNumber || row.pan_number || row.panCard || '',
          uanNumber: row.uanNumber || row.uan_number || '',
          esiNumber: row.esiNumber || row.esi_number || '',
          remarks:   row.remarks   || '',
          schoolId,
        });
      } catch (profileErr) {
        // Rollback user to avoid orphan
        await User.findByIdAndDelete(user._id);
        throw profileErr;
      }

      return {
        success: true,
        data: {
          user:    { _id: user._id, email: user.email, role: user.role },
          profile: teacherProfile,
          credentials: {
            employeeId:      finalEmployeeId,
            teacherId:       finalTeacherId,
            defaultPassword: rawPass,
            loginEmail:      normalizedEmail,
          },
        },
      };
    } catch (err) {
      logger.error('[TeacherAdapter] create() error:', err.message);
      return { success: false, errors: [err.message] };
    }
  }

  async update(id, data, context = {}) {
    const { TeacherProfile } = getModels();
    const { schoolId } = context;
    const profile = await TeacherProfile.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: data },
      { new: true, runValidators: true }
    );
    return profile
      ? { success: true, data: profile }
      : { success: false, errors: ['Teacher not found'] };
  }

  async checkDuplicate(row, context = {}) {
    const { User } = getModels();
    const { schoolId } = context;
    const email = row.email?.trim().toLowerCase();
    if (!email) return false;
    return !!(await User.findOne({ email, schoolId }));
  }

  getTransformRules()   { return this.config?.transformations  || {}; }
  getValidationRules()  { return this.config?.validationRules  || {}; }
}

module.exports = TeacherAdapter;
