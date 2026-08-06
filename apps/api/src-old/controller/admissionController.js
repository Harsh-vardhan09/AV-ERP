const { User } = require('../../src/modules/identity');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const AcademicSession = require('../models/AcademicSession');
const ClassModel = require('../models/ClassModel');
const SectionModel = require('../models/SectionModel');
const SchoolSettings = require('../../src/modules/tenancy').SchoolSettings;
const validator = require('validator');
const bcryptjs = require('bcryptjs');
const mongoose = require('mongoose');
// Fee auto-assignment (fire-and-forget on student registration)
const { assignFeeToStudent } = require('../services/fee/studentFeeService');
const { uploadImageToCloud, deleteFromCloud } = require('../../src/core/config/storage.js');

// ── Phase 2: Notification imports ────────────────────────────────────────────
const { createInAppNotification, sendEmailNotification } = require('../../src/modules/notifications').notificationService;
const { welcomeStudentTemplate, welcomeTeacherTemplate } = require('../../src/modules/notifications').emailTemplates;
const logger = require('../../src/core/logging/logger.js');

// ========================
// HELPERS — AUTO GENERATION
// ========================

// Get or create per-school settings
const getSettings = async (schoolId) => {
  let settings = await SchoolSettings.findOne({ schoolId });
  if (!settings) settings = await SchoolSettings.create({ schoolId });
  return settings;
};

// Format DOB as DDMMYYYY for default password
const dobToPassword = (dob) => {
  const d = new Date(dob);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}${mm}${yyyy}`;
};

// Get session 2-digit suffix e.g. "2025-26" → "26"
const getSessionCode = (sessionName) => {
  // Handles "2025-26" → "26", "2026-27" → "27"
  const parts = sessionName.split('-');
  return parts.length > 1 ? parts[1] : String(sessionName).slice(-2);
};

// Generate admission number: ADM-{session2}{serial5}
const generateAdmissionNo = async (sessionCode, schoolId) => {
  const settings = await getSettings(schoolId); // ← schoolId required for multi-tenancy
  settings.lastAdmissionSerial += 1;
  await settings.save();
  return `ADM-${sessionCode}${String(settings.lastAdmissionSerial).padStart(5, '0')}`;
};

// Generate student ID: STU-{session2}{random4}
const generateStudentId = (sessionCode) => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `STU-${sessionCode}${rand}`;
};

// Generate roll no: {session2}{classNum}{sectionLetter}{serial}
// e.g. 265A1 → session 26, class 5, section A, 1st student
const generateRollNo = async (sessionCode, classNumericOrder, sectionName, classId, sectionId, sessionId) => {
  // Count existing students in this class+section+session to get next serial
  const count = await StudentProfile.countDocuments({
    classId, sectionId, session: sessionId
  });
  const serial = count + 1;
  return `${sessionCode}${classNumericOrder}${sectionName}${serial}`;
};

// Generate teacher ID: TCH-{serial6}
const generateTeacherId = async (schoolId) => {
  const settings = await getSettings(schoolId);
  settings.lastTeacherSerial += 1;
  await settings.save();
  return `TCH-${String(settings.lastTeacherSerial).padStart(6, '0')}`;
};

// Generate employee ID: EMP-{serial5}
const generateEmployeeId = async (schoolId) => {
  const count = await TeacherProfile.countDocuments({ schoolId });
  return `EMP-${String(count + 1).padStart(5, '0')}`;
};

// ========================
// STUDENT REGISTRATION
// ========================

exports.registerStudent = async (req, res) => {
  try {
    const {
      // User fields
      firstName, lastName, email, phone, password,
      // Student profile fields
      admissionNumber, rollNo, studentId, middleName, gender, dateOfBirth,
      placeOfBirth, nationality, religion, caste, category, motherTongue, bloodGroup,
      classId, sectionId, session, admissionDate, previousSchool, previousClass,
      aadharCard, ssmId, familyId, rte,
      // New identity fields
      apaarId, bplStudent, bplCardNo,
      // Caste certificate
      casteApplicationNo, casteApplicationDate,
      // Government Scheme IDs
      boardEnrollNo, ladliLaxmiNo, scholarshipId, domicileApplicationNo, rteApplicationNo, srnNo,
      // PEN
      pen, penNo,
      // Contact
      address, addressLine2, city, state, pincode,
      whatsappNo, alternateNumber,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      // Parent
      fatherName, fatherOccupation, fatherPhone, fatherEmail, fatherIncome, fatherQualification, fatherAadharCard,
      motherName, motherOccupation, motherPhone, motherEmail, motherQualification, motherAadharCard,
      guardianName, guardianRelation, guardianPhone, guardianEmail, guardianQualification, guardianIncome, guardianAadharCard,
      // Bank
      accountNumber, bankName, ifsc, branchName,
      // Health
      healthIssues, allergies, medications, disabilityType,
      // Transport & hostel
      transportRequired, pickupPoint, routeNo, hostelRequired, roomNo,
      // Documents (URLs)
      photoUrl, birthCertificateUrl, transferCertificateUrl, previousMarksheetsUrl,
      medicalCertificateUrl, aadharCardDocUrl, addressProofUrl, casteProofUrl,
      remarks,
      // Scholar
      scholarNo,
      // HMHSS00022 new fields
      diseCode, previousResult
    } = req.body;

    // === Required fields check ===
    // Note: lastName is optional — physical admission forms may not always have separate last name
    if (!firstName || !dateOfBirth || !fatherName || !fatherPhone || !classId || !sectionId || !session || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, DOB, Father\'s Name, Father\'s Phone, Class, Section, Session, and Address are required.'
      });
    }

    // === Fetch class & section details for auto-gen ===
    const classDoc = await ClassModel.findById(classId);
    const sectionDoc = await SectionModel.findById(sectionId);
    const sessionDoc = await AcademicSession.findById(session);
    if (!classDoc || !sectionDoc || !sessionDoc) {
      return res.status(400).json({ success: false, message: 'Invalid class, section, or session' });
    }

    const sessionCode = getSessionCode(sessionDoc.name);
    const settings = await getSettings(req.schoolId);

    // === Auto-generate or use manual values ===
    let finalAdmissionNo = admissionNumber;
    let finalRollNo = rollNo;
    let finalStudentId = studentId;

    if (settings.autoGenerateAdmissionNo && !admissionNumber) {
      finalAdmissionNo = await generateAdmissionNo(sessionCode, req.schoolId); // ← pass schoolId
    }
    if (!finalAdmissionNo) {
      return res.status(400).json({ success: false, message: 'Admission number is required (auto-gen is off)' });
    }

    if (settings.autoGenerateRollNo && !rollNo) {
      finalRollNo = await generateRollNo(
        sessionCode, classDoc.numericOrder, sectionDoc.name,
        classId, sectionId, session
      );
    }

    if (settings.autoGenerateStudentId && !studentId) {
      finalStudentId = generateStudentId(sessionCode);
    }

    // === Password: DOB if not provided ===
    const defaultPassword = password || dobToPassword(dateOfBirth);
    // === Email: optional for students — must be undefined (not null) for sparse index ===
    const rawEmail = email && typeof email === 'string' ? email.trim() : '';
    const normalizedEmail = rawEmail || undefined; // strictly undefined if empty
    if (normalizedEmail && !validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail, schoolId: req.schoolId });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email already registered in this school' });
      }
    }

    // === Create User ===
    const hashPassword = await bcryptjs.hash(defaultPassword, 10);
    const userPayload = {
      firstName, lastName,
      phone: phone || fatherPhone,
      password: hashPassword,
      role: 'student',
      isActive: true,
      isVerified: true
    };
    // Only add email if it's a real non-empty string (sparse index requires field to be absent, not null)
    if (normalizedEmail) userPayload.email = normalizedEmail;
    userPayload.schoolId = req.schoolId; // ← data isolation
    const user = await User.create(userPayload);

    // ── Sanitize: convert empty strings → undefined for Date fields ───────────
    // Prevents Mongoose CastError when the frontend sends dateOfBirth="" or admissionDate=""
    const safeDate = (v) => (v && String(v).trim() !== '' ? v : undefined);

    // === Create Student Profile — roll back user on failure ==================
    let studentProfile;
    try {
      studentProfile = await StudentProfile.create({
        userId: user._id,
        admissionNumber: finalAdmissionNo,
        studentId: finalStudentId,
        rollNo: finalRollNo,
        scholarNo: scholarNo || undefined,
        firstName, middleName, lastName,
        gender, placeOfBirth, nationality, religion, caste, category,
        motherTongue, bloodGroup,
        aadharCard, ssmId, familyId, rte: rte || false,
        // New identity fields
        apaarId,
        bplStudent: bplStudent || false,
        bplCardNo,
        // Caste certificate
        casteApplicationNo,
        casteApplicationDate: safeDate(casteApplicationDate),
        // Government Scheme IDs
        boardEnrollNo, ladliLaxmiNo, scholarshipId,
        domicileApplicationNo, rteApplicationNo,
        srnNo,
        // PEN — store in both fields for alias compatibility
        pen: pen || penNo,
        penNo: penNo || pen,
        // Contact extras
        whatsappNo,
        alternateNumber,
        // Parent Aadhaar
        fatherAadharCard, motherAadharCard, guardianAadharCard,
        classId, sectionId, session,
        // ── Safe date fields ──────────────────────────────────────────────────
        dateOfBirth:   safeDate(dateOfBirth),
        admissionDate: safeDate(admissionDate),
        previousSchool, previousClass,
        diseCode, previousResult,
        phone: phone || fatherPhone,
        address, addressLine2, city, state, pincode,
        emergencyContact: {
          name: emergencyContactName,
          phone: emergencyContactPhone,
          relation: emergencyContactRelation
        },
        parentDetails: {
          father: { name: fatherName, occupation: fatherOccupation, phone: fatherPhone, email: fatherEmail, annualIncome: fatherIncome, qualification: fatherQualification },
          mother: { name: motherName, occupation: motherOccupation, phone: motherPhone, email: motherEmail, qualification: motherQualification },
          guardian: { name: guardianName, relation: guardianRelation, phone: guardianPhone, email: guardianEmail, qualification: guardianQualification, income: guardianIncome }
        },
        bankDetails: { accountNumber, bankName, ifsc, branchName },
        healthInfo: { healthIssues, allergies, medications, disabilityType },
        transportation: { transportRequired: transportRequired || false, pickupPoint, routeNo },
        hostel: { hostelRequired: hostelRequired || false, roomNo },
        documents: {
          photo: photoUrl,
          birthCertificate: birthCertificateUrl,
          transferCertificate: transferCertificateUrl,
          previousMarksheets: previousMarksheetsUrl,
          medicalCertificate: medicalCertificateUrl,
          aadharCardDoc: aadharCardDocUrl,
          addressProof: addressProofUrl,
          casteProof: casteProofUrl
        },
        remarks,
        schoolId: req.schoolId,
      });
    } catch (profileErr) {
      // Roll back: delete the newly created user so the email is free for retry
      await User.findByIdAndDelete(user._id);
      console.error('Student profile creation failed, user rolled back:', profileErr.message);
      return res.status(500).json({ success: false, message: profileErr.message });
    }

    // ── Auto-assign fee (fire and forget — never blocks registration) ──
    // Finds the active FeeStructure for this student's class+session and creates
    // a StudentFee record + installments automatically.
    setImmediate(async () => {
      try {
        await assignFeeToStudent(studentProfile._id);
        console.log(`[FeeAutoAssign] ✓ Fee assigned for student ${studentProfile._id}`);
      } catch (feeErr) {
        // If no fee structure exists for this class yet, that's okay — can be done later
        console.log(`[FeeAutoAssign] ⚠ Skipped for ${studentProfile._id}: ${feeErr.message}`);
      }
    });
    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: {
        user: { _id: user._id, email: user.email, role: user.role },
        profile: studentProfile,
        credentials: {
          admissionNumber: finalAdmissionNo,
          rollNo: finalRollNo,
          studentId: finalStudentId,
          password: defaultPassword,
          loginEmail: normalizedEmail || 'Not provided (use Admission No / Student ID to login)'
        }
      }
    });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        const School = require('../../src/modules/tenancy').School;
        const school = await School.findById(req.schoolId).select('name').lean();
        const schoolName = school?.name || 'School';
        const loginUrl   = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
        const studentName = `${firstName} ${lastName}`;

        // In-app welcome notification
        await createInAppNotification({
          userId:   user._id,
          schoolId: req.schoolId,
          type:     'system',
          title:    `Welcome to ${schoolName}!`,
          message:  `Your account has been created. Admission No: ${finalAdmissionNo}${finalRollNo ? ', Roll No: ' + finalRollNo : ''}.`,
          link:     '/student/dashboard',
          metadata: { admissionNumber: finalAdmissionNo, rollNo: finalRollNo },
        });

        // Welcome email (only when email provided)
        if (normalizedEmail) {
          const { subject, html } = welcomeStudentTemplate({
            studentName, schoolName, loginUrl,
            admissionNumber: finalAdmissionNo,
            rollNo:  finalRollNo  || 'N/A',
            password: defaultPassword,
          });
          await sendEmailNotification({ to: normalizedEmail, subject, html });
        }

        // Notify admin of new admission
        const adminUser = await User.findOne({
          schoolId: req.schoolId,
          role: 'admin',
          isActive: true,
        }).select('_id').lean();
        if (adminUser) {
          await createInAppNotification({
            userId:   adminUser._id,
            schoolId: req.schoolId,
            type:     'admission',
            title:    `New Student Admission — ${studentName}`,
            message:  `${studentName} has been admitted to ${classDoc.name}. Admission No: ${finalAdmissionNo}.`,
            link:     '/admin/students',
            metadata: { studentId: user._id, admissionNumber: finalAdmissionNo },
          });
        }
      } catch (notifErr) {
        logger.warn('[Notif] Student registration notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// CHECK DUPLICATE FIELD
// ========================
exports.checkDuplicateField = async (req, res) => {
  try {
    const { field, value, classId, sectionId } = req.query;
    if (!field || !value) return res.status(400).json({ success: false, message: 'field and value required' });
    const allowed = ['rollNo', 'admissionNumber', 'scholarNo', 'studentId'];
    if (!allowed.includes(field)) return res.status(400).json({ success: false, message: 'Invalid field' });

    // Build query: rollNo is scoped to class+section; other IDs scoped to school
    const query = { [field]: value.trim(), schoolId: req.schoolId };
    if (field === 'rollNo' && classId && sectionId) {
      query.classId = classId;
      query.sectionId = sectionId;
    }

    const existing = await StudentProfile.findOne(query)
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .select('firstName middleName lastName rollNo admissionNumber scholarNo studentId classId sectionId');

    if (existing) {
      return res.status(200).json({ success: true, exists: true, data: existing });
    }
    return res.status(200).json({ success: true, exists: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ========================
// TEACHER REGISTRATION
// ========================

exports.registerTeacher = async (req, res) => {
  try {
    const {
      firstName, lastName, middleName, email, phone, password,
      employeeId, gender, dateOfBirth, qualification, specialization,
      experience, department, designation,
      address, addressLine2, city, state, pincode,
      alternatePhone, joiningDate,
      aadharCard, panCard,
      nationality, religion, caste, category, maritalStatus, bloodGroup, motherTongue,
      // Family
      fatherName, fatherPhone, motherName, motherPhone, spouseName, spousePhone,
      // Bank
      accountNumber, bankName, ifsc, branchName,
      // Salary
      salaryBasic, salaryHra, salaryTransport, salaryTotal,
      // Emergency
      emergencyName, emergencyPhone, emergencyRelation,
      // Documents (URLs)
      photoUrl, resumeUrl, idProofUrl, qualificationCertUrl,
      experienceLetterUrl, aadharCardDocUrl, panCardDocUrl,
      remarks
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ success: false, message: 'First name and last name are required' });
    }

    // Email: REQUIRED for teacher
    const normalizedEmail = email && email.trim() ? email.trim() : undefined;
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required for teacher registration' });
    }
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    const existingUser = await User.findOne({ email: normalizedEmail, schoolId: req.schoolId });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered in this school' });
    }

    // Password: DOB if not provided
    const defaultPassword = password || (dateOfBirth ? dobToPassword(dateOfBirth) : '12345678');

    // Auto-gen IDs
    const finalTeacherId = await generateTeacherId(req.schoolId);
    const finalEmployeeId = employeeId || await generateEmployeeId(req.schoolId);

    const hashPassword = await bcryptjs.hash(defaultPassword, 10);
    const user = await User.create({
      firstName, lastName,
      email: normalizedEmail,
      phone,
      password: hashPassword,
      role: 'teacher',
      isActive: true,
      isVerified: true,
      schoolId: req.schoolId,
    });

    // ── Sanitize: convert empty strings to undefined for Date + Number fields ──
    // Mongoose throws a CastError (500) when it receives "" for a Date or Number
    // field. If that error is not caught, the User created above becomes orphaned
    // and the next attempt gets a false "Email already registered" error.
    const safeDate = (v) => (v && String(v).trim() !== '' ? v : undefined);
    const safeNum  = (v) => (v !== '' && v !== null && v !== undefined ? Number(v) : undefined);

    // Create teacher profile — if this fails, roll back the user to avoid
    // an orphaned User record that would block future re-registration.
    let teacherProfile;
    try {
      teacherProfile = await TeacherProfile.create({
        userId: user._id,
        employeeId: finalEmployeeId,
        teacherId: finalTeacherId,
        firstName, middleName, lastName,
        gender, qualification, specialization,
        department, designation,
        phone, alternatePhone,
        address, addressLine2, city, state, pincode,
        aadharCard, panCard,
        nationality, religion, caste, category, maritalStatus, bloodGroup, motherTongue,
        // ── Safe date fields ──────────────────────────────────────────────────
        dateOfBirth:  safeDate(dateOfBirth),
        joiningDate:  safeDate(joiningDate),
        // ── Safe number fields ────────────────────────────────────────────────
        experience:   safeNum(experience),
        familyDetails: {
          fatherName, fatherPhone, motherName, motherPhone, spouseName, spousePhone
        },
        bankDetails: { accountNumber, bankName, ifsc, branchName },
        salary: {
          basic:     safeNum(salaryBasic),
          hra:       safeNum(salaryHra),
          transport: safeNum(salaryTransport),
          total:     safeNum(salaryTotal),
        },
        emergencyContact: { name: emergencyName, phone: emergencyPhone, relation: emergencyRelation },
        documents: {
          photo: photoUrl, resume: resumeUrl, idProof: idProofUrl,
          qualificationCert: qualificationCertUrl, experienceLetter: experienceLetterUrl,
          aadharCardDoc: aadharCardDocUrl, panCardDoc: panCardDocUrl
        },
        remarks,
        schoolId: req.schoolId,
      });
    } catch (profileErr) {
      // Roll back: delete the newly created user so the email is free for retry
      await User.findByIdAndDelete(user._id);
      console.error('Teacher profile creation failed, user rolled back:', profileErr.message);
      return res.status(500).json({ success: false, message: profileErr.message });
    }

    res.status(201).json({
      success: true,
      message: 'Teacher registered successfully',
      data: {
        user: { _id: user._id, email: user.email, role: user.role },
        profile: teacherProfile,
        credentials: {
          employeeId: finalEmployeeId,
          teacherId: finalTeacherId,
          password: defaultPassword,
          loginEmail: normalizedEmail
        }
      }
    });

    // ── NOTIFICATION BLOCK — non-blocking ───────────────────────────────────
    ;(async () => {
      try {
        const School = require('../../src/modules/tenancy').School;
        const school = await School.findById(req.schoolId).select('name').lean();
        const schoolName = school?.name || 'School';
        const loginUrl   = process.env.CLIENT_URL || 'https://campus.unifiedcampus.com';
        const teacherName = `${firstName} ${lastName}`;

        // In-app welcome
        await createInAppNotification({
          userId:   user._id,
          schoolId: req.schoolId,
          type:     'system',
          title:    `Welcome to ${schoolName}!`,
          message:  `Your teacher account has been created. Employee ID: ${finalEmployeeId}.`,
          link:     '/teacher/dashboard',
          metadata: { employeeId: finalEmployeeId, teacherId: finalTeacherId },
        });

        // Welcome email
        const { subject, html } = welcomeTeacherTemplate({
          teacherName, schoolName, loginUrl,
          employeeId: finalEmployeeId,
          password: defaultPassword,
          loginEmail: normalizedEmail,
        });
        await sendEmailNotification({ to: normalizedEmail, subject, html });

        // Notify admin
        const adminUser = await User.findOne({
          schoolId: req.schoolId,
          role: 'admin',
          isActive: true,
        }).select('_id').lean();
        if (adminUser) {
          await createInAppNotification({
            userId:   adminUser._id,
            schoolId: req.schoolId,
            type:     'admission',
            title:    `New Teacher Registered — ${teacherName}`,
            message:  `${teacherName} has been registered. Employee ID: ${finalEmployeeId}.`,
            link:     '/admin/teachers',
            metadata: { userId: user._id, employeeId: finalEmployeeId },
          });
        }
      } catch (notifErr) {
        logger.warn('[Notif] Teacher registration notification failed', { error: notifErr.message });
      }
    })();
    // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────
  } catch (error) {
    console.error('Teacher registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// VIEW & UPDATE
// ========================

exports.getStudentDetails = async (req, res) => {
  try {
    // Use .lean() to get raw BSON/JS object — prevents Mongoose from casting
    // old {addressLine1, ...} address objects to null/'' via String schema coercion
    const profile = await StudentProfile.findOne({ _id: req.params.id, schoolId: req.schoolId })
      .populate('userId', 'firstName lastName email phone isActive role')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name')
      .lean();

    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });

    // ── Normalize address into one consistent shape ──
    // Old format: address = { addressLine1, addressLine2, city, state, pincode, ... }
    // New format: address = String, plus flat fields city/state/pincode at root level
    let addressData = {};
    if (profile.address && typeof profile.address === 'object') {
      // Legacy: address stored as nested object
      addressData = {
        line1: profile.address.addressLine1 || profile.address.address || '',
        line2: profile.address.addressLine2 || '',
        city: profile.address.city || profile.city || '',
        state: profile.address.state || profile.state || '',
        pincode: profile.address.pincode || profile.pincode || '',
      };
    } else {
      // New: flat string + separate fields
      addressData = {
        line1: profile.address || '',
        line2: profile.addressLine2 || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
      };
    }

    res.status(200).json({ success: true, data: { ...profile, addressData } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStudentDetails = async (req, res) => {
  try {
    // Prevent overwriting sensitive system fields via raw body
    const { schoolId: _s, userId: _u, _id: _i, ...safeUpdate } = req.body;

    const _id = new mongoose.Types.ObjectId(req.params.id);
    const profile = await StudentProfile.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId }, // ← correct query + school scoping
      { $set: safeUpdate },
      { new: true, runValidators: true }
    );
    if (!profile) return res.status(404).json({ success: false, message: 'Student not found' });
    res.status(200).json({ success: true, message: 'Student updated', data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeacherDetails = async (req, res) => {
  try {
    const profile = await TeacherProfile.findOne({ _id: req.params.id, schoolId: req.schoolId }) // ← school scoped
      .populate('userId', 'firstName lastName email phone isActive role');
    if (!profile) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTeacherDetails = async (req, res) => {
  try {
    // Prevent overwriting sensitive system fields via raw body
    const { schoolId: _s, userId: _u, _id: _i, ...safeUpdate } = req.body;

    const profile = await TeacherProfile.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId }, // ← school scoped + sensitive fields stripped
      { $set: safeUpdate },
      { new: true, runValidators: true }
    );
    if (!profile) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.status(200).json({ success: true, message: 'Teacher updated', data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// ACTIVATE / DEACTIVATE
// ========================

const toggleUserStatus = async (req, res, isActive, entityType) => {
  try {
    // ← school scoped: ensure the user belongs to this school before toggling
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      { isActive },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: `${entityType} not found` });

    const ProfileModel = user.role === 'student' ? StudentProfile : TeacherProfile;
    await ProfileModel.findOneAndUpdate(
      { userId: req.params.id, schoolId: req.schoolId }, // ← school scoped
      { status: isActive ? 'active' : 'inactive' }
    );

    const action = isActive ? 'activated' : 'deactivated';
    res.status(200).json({ success: true, message: `${entityType} ${action} successfully`, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.activateStudent = (req, res) => toggleUserStatus(req, res, true, 'Student');
exports.deactivateStudent = (req, res) => toggleUserStatus(req, res, false, 'Student');
exports.activateTeacher = (req, res) => toggleUserStatus(req, res, true, 'Teacher');
exports.deactivateTeacher = (req, res) => toggleUserStatus(req, res, false, 'Teacher');

// ========================
// LIST ALL
// ========================

exports.getAllStudents = async (req, res) => {

  try {
    const filter = {
      schoolId: req.schoolId,   // ← data isolation
      isDeleted: { $ne: true }, // ← always hide soft-deleted students
      status: { $nin: ['deleted'] } // ← extra guard: exclude status=deleted
    };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.session) filter.session = req.query.session;
    // Only allow filtering by status if it's not a deleted-type status
    if (req.query.status && req.query.status !== 'deleted') filter.status = req.query.status;

    // Text search: name, rollNo, scholarNo
    if (req.query.search) {
      const q = req.query.search.trim();
      const words = q.split(" ");
      const regex = new RegExp(q, 'i');
      if (words.length > 1) {
        filter.$or = [
          {
            $and: [
              { firstName: new RegExp(words[0], 'i') },
              { lastName: new RegExp(words[1], 'i') }
            ]
          },
          { fullName: regex }
        ];
      } else {
        filter.$or = [
          { firstName: regex },
          { lastName: regex },
          { fullName: regex },
          { rollNo: regex },
          { scholarNo: regex },
          { admissionNumber: regex },
        ];
      }
    }

    const students = await StudentProfile.find(filter)
      .populate('userId', 'firstName lastName email phone isActive')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name')
      .sort({ firstName: 1, lastName: 1 });
    res.status(200).json({ success: true, count: students.length, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// EXPORT STUDENTS — EXCEL
// ========================

/**
 * GET /api/v1/admission/students/export-excel
 * Downloads an Excel (.xlsx) file containing all (filtered) students.
 * Supports same filters as getAllStudents: classId, sectionId, session, status, search.
 */
exports.exportStudentsExcel = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    const filter = {
      schoolId: req.schoolId,
      isDeleted: { $ne: true },
      status: { $nin: ['deleted'] },
    };
    if (req.query.classId)   filter.classId   = req.query.classId;
    if (req.query.sectionId) filter.sectionId = req.query.sectionId;
    if (req.query.session)   filter.session   = req.query.session;
    if (req.query.status && req.query.status !== 'deleted') filter.status = req.query.status;

    if (req.query.search) {
      const q     = req.query.search.trim();
      const words = q.split(' ');
      const regex = new RegExp(q, 'i');
      filter.$or  = words.length > 1
        ? [
            { $and: [{ firstName: new RegExp(words[0], 'i') }, { lastName: new RegExp(words[1], 'i') }] },
            { fullName: regex },
          ]
        : [
            { firstName: regex }, { lastName: regex }, { fullName: regex },
            { rollNo: regex }, { scholarNo: regex }, { admissionNumber: regex },
          ];
    }

    const students = await StudentProfile.find(filter)
      .populate('classId',   'name')
      .populate('sectionId', 'name')
      .populate('session',   'name')
      .populate('userId',    'email phone isActive')
      .sort({ firstName: 1, lastName: 1 })
      .lean();

    // Build flat rows for Excel
    const rows = students.map((s, i) => ({
      'S.No':               i + 1,
      'Admission No':       s.admissionNumber || '',
      'Scholar No':         s.scholarNo       || '',
      'Roll No':            s.rollNo          || '',
      'Student ID':         s.studentId       || '',
      'First Name':         s.firstName       || '',
      'Middle Name':        s.middleName      || '',
      'Last Name':          s.lastName        || '',
      'Gender':             s.gender          || '',
      'Date of Birth':      s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '',
      'Class':              s.classId?.name   || '',
      'Section':            s.sectionId?.name || '',
      'Session':            s.session?.name   || '',
      'Admission Date':     s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-IN') : '',
      'Category':           s.category        || '',
      'Caste':              s.caste           || '',
      'Religion':           s.religion        || '',
      'Blood Group':        s.bloodGroup      || '',
      'Aadhar Card':        s.aadharCard      || '',
      'APAAR ID':           s.apaarId         || '',
      'Samagra ID':         s.ssmId           || '',
      'Family ID':          s.familyId        || '',
      'PEN No':             s.penNo || s.pen  || '',
      'SRN No':             s.srnNo           || '',
      'Board Enroll No':    s.boardEnrollNo   || '',
      'Ladli Laxmi No':     s.ladliLaxmiNo    || '',
      'RTE':                s.rte ? 'Yes' : 'No',
      'BPL Student':        s.bplStudent ? 'Yes' : 'No',
      'BPL Card No':        s.bplCardNo       || '',
      // Contact
      'Phone':              s.phone || s.userId?.phone || '',
      'WhatsApp No':        s.whatsappNo      || '',
      'Alternate Number':   s.alternateNumber || '',
      'Address':            s.address         || '',
      'City':               s.city            || '',
      'State':              s.state           || '',
      'Pincode':            s.pincode         || '',
      // Father
      "Father's Name":      s.parentDetails?.father?.name        || '',
      "Father's Phone":     s.parentDetails?.father?.phone       || '',
      "Father's Occupation":s.parentDetails?.father?.occupation  || '',
      "Father's Income":    s.parentDetails?.father?.annualIncome|| '',
      "Father's Aadhar":    s.fatherAadharCard || '',
      // Mother
      "Mother's Name":      s.parentDetails?.mother?.name        || '',
      "Mother's Phone":     s.parentDetails?.mother?.phone       || '',
      // Bank
      'Account Number':     s.bankDetails?.accountNumber || '',
      'Bank Name':          s.bankDetails?.bankName      || '',
      'IFSC Code':          s.bankDetails?.ifsc          || '',
      // Previous School
      'Previous School':    s.previousSchool  || '',
      'Previous Class':     s.previousClass   || '',
      'Dise Code':          s.diseCode        || '',
      'Previous Result':    s.previousResult  || '',
      // Status
      'Status':             s.status          || '',
      'Email':              s.userId?.email   || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2,
    }));
    ws['!cols'] = colWidths;

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="students_${Date.now()}.xlsx"`);
    res.setHeader('Content-Length', buf.length);
    res.send(buf);
  } catch (error) {
    console.error('exportStudentsExcel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllTeachers = async (req, res) => {
  try {
    const filter = { schoolId: req.schoolId }; // ← data isolation
    if (req.query.status) filter.status = req.query.status;
    if (req.query.department) filter.department = req.query.department;

    const teachers = await TeacherProfile.find(filter)
      .populate('userId', 'firstName lastName email phone isActive')
      .sort({ firstName: 1, lastName: 1 });
    res.status(200).json({ success: true, count: teachers.length, data: teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// SCHOOL SETTINGS (auto-gen toggles)
// ========================

exports.getSchoolSettings = async (req, res) => {
  try {
    const settings = await getSettings(req.schoolId); // ← scoped to current school
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSchoolSettings = async (req, res) => {
  try {
    const {
      autoGenerateAdmissionNo, autoGenerateRollNo, autoGenerateStudentId,
      allowHallAttendance, isOasesEnabled,
      schoolProfile, // ← new: school profile fields from redesigned Settings page
    } = req.body;

    const settings = await getSettings(req.schoolId); // ← scoped to current school

    if (autoGenerateAdmissionNo !== undefined) settings.autoGenerateAdmissionNo = autoGenerateAdmissionNo;
    if (autoGenerateRollNo      !== undefined) settings.autoGenerateRollNo      = autoGenerateRollNo;
    if (autoGenerateStudentId   !== undefined) settings.autoGenerateStudentId   = autoGenerateStudentId;
    if (allowHallAttendance     !== undefined) settings.allowHallAttendance     = allowHallAttendance;
    if (isOasesEnabled          !== undefined) {
      settings.isOasesEnabled = isOasesEnabled;
      if (!settings.modules) settings.modules = {};
      settings.modules.oases = isOasesEnabled;
    }

    // ── Merge schoolProfile fields (whitelist approach for security) ─────────
    if (schoolProfile && typeof schoolProfile === 'object') {
      const ALLOWED_PROFILE_KEYS = [
        'fullName', 'tagline', 'headerTagline', 'shortName', 'schoolCode',
        'affiliatedTo', 'affiliatedToText', 'affiliationCode', 'udiseCode',
        'contactPerson', 'mobileNumber', 'whatsappNumber', 'phoneNumber',
        'emailId', 'website', 'pincode', 'city', 'state', 'address',
        'schoolLogo', 'watermarkLogo', 'authoritySignature', 'marksheetQrCode',
        'country', 'currency', 'language',
        'weekOffDay', 'gstNo', 'fontForPdf', 'aboutSchool', 'admissionFormNote',
      ];
      if (!settings.schoolProfile) settings.schoolProfile = {};
      ALLOWED_PROFILE_KEYS.forEach((key) => {
        if (schoolProfile[key] !== undefined) {
          settings.schoolProfile[key] = schoolProfile[key];
        }
      });
      settings.markModified('schoolProfile');
    }

    await settings.save();
    res.status(200).json({ success: true, message: 'Settings updated', data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Upload school logo / signature / watermark / QR to Cloudinary ────────────
// PUT /api/v1/admission/school-settings/upload-logo
// Field name: "file" (multipart/form-data)
// Query param: type = schoolLogo | watermarkLogo | authoritySignature | marksheetQrCode
exports.uploadSettingsLogo = async (req, res) => {
  try {
    const ALLOWED_TYPES = ['schoolLogo', 'watermarkLogo', 'authoritySignature', 'marksheetQrCode'];
    const { type } = req.query;

    if (!ALLOWED_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: `Invalid type. Use: ${ALLOWED_TYPES.join(', ')}` });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const settings = await getSettings(req.schoolId);

    // Delete old image from Cloudinary if it has a public_id
    const oldUrl = settings.schoolProfile?.[type];
    if (oldUrl && typeof oldUrl === 'string' && oldUrl.includes('cloudinary')) {
      try {
        // Extract public_id from URL: last segment before extension
        const parts = oldUrl.split('/');
        const fileWithExt = parts[parts.length - 1];
        const publicIdParts = [...parts.slice(parts.indexOf('upload') + 2)];
        publicIdParts[publicIdParts.length - 1] = fileWithExt.replace(/\.[^.]+$/, '');
        const publicId = publicIdParts.join('/');
        await deleteFromCloud(publicId);
      } catch (_) { /* ignore cleanup errors */ }
    }

    // Upload new image
    const result = await uploadImageToCloud(req.file.path);
    const imageUrl = result.secure_url;

    if (!settings.schoolProfile) settings.schoolProfile = {};
    settings.schoolProfile[type] = imageUrl;
    settings.markModified('schoolProfile');
    await settings.save();

    res.status(200).json({ success: true, message: 'Image uploaded', url: imageUrl, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================
// STUDENT PHOTO UPLOAD (Cloudinary)
// ========================================

/**
 * PUT /api/v1/admission/students/:id/photo
 * Requires multer single('photo') middleware — accepts image/* only.
 * Uploads to Cloudinary, deletes old image if it had a publicId, updates StudentProfile.
 * Admin / admission roles only.
 */
exports.uploadStudentPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo file uploaded' });
    }

    // Find existing profile (school-scoped)
    const profile = await StudentProfile.findOne({ _id: id, schoolId: req.schoolId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadImageToCloud(req.file.path, {
      folder: `erp/${req.schoolId}/students`,
      public_id: `student_${id}`,     // deterministic id → overwrites old photo cleanly
      overwrite: true,
      resource_type: 'image',
    });

    if (!uploadResult) {
      return res.status(500).json({ success: false, message: 'Photo upload to cloud failed' });
    }

    // Build URL and store publicId for future deletion
    const photoUrl = uploadResult.secure_url;
    const publicId = uploadResult.public_id;

    // Persist photo URL and publicId in StudentProfile
    profile.documents = profile.documents || {};
    profile.documents.photo = photoUrl;
    profile.documents.photoPublicId = publicId;        // stored for deletion on next update
    profile.markModified('documents');
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: { photoUrl, publicId },
    });
  } catch (error) {
    console.error('uploadStudentPhoto error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// ADMISSION FORM SETTINGS
// ========================

const AdmissionFormSettings = require('../models/AdmissionFormSettings');
const { ALL_FIELDS } = require('../models/AdmissionFormSettings');

const getOrCreateFormSettings = async (schoolId) => {
  let settings = await AdmissionFormSettings.findOne({ schoolId });
  if (!settings) {
    settings = await AdmissionFormSettings.create({ schoolId, visibleFields: [...ALL_FIELDS] });
  }
  return settings;
};

exports.getAdmissionFormSettings = async (req, res) => {
  try {
    const settings = await getOrCreateFormSettings(req.schoolId);
    res.status(200).json({
      success: true,
      data: {
        visibleFields: settings.visibleFields,
        allFields: ALL_FIELDS,
        registrationFormConfig: settings.registrationFormConfig || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAdmissionFormSettings = async (req, res) => {
  try {
    const { visibleFields, registrationFormConfig } = req.body;
    const updateData = {};

    if (Array.isArray(visibleFields)) {
      // Only allow valid field keys
      updateData.visibleFields = visibleFields.filter(f => ALL_FIELDS.includes(f));
    }

    if (Array.isArray(registrationFormConfig)) {
      updateData.registrationFormConfig = registrationFormConfig;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide visibleFields or registrationFormConfig' });
    }

    let settings = await AdmissionFormSettings.findOneAndUpdate(
      { schoolId: req.schoolId },
      { $set: updateData },
      { new: true, upsert: true }
    );
    res.status(200).json({
      success: true,
      message: 'Form settings saved',
      data: {
        visibleFields: settings.visibleFields,
        registrationFormConfig: settings.registrationFormConfig,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================
// FORM STUDENTS (for Print Admission Form page)
// ========================

exports.getFormStudents = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, search = '',
      classId, sectionId, session
    } = req.query;

    const filter = { schoolId: req.schoolId, isDeleted: { $ne: true } };
    if (classId)   filter.classId   = classId;
    if (sectionId) filter.sectionId = sectionId;
    if (session)   filter.session   = session;

    if (search && search.trim()) {
      const q = search.trim();
      const words = q.split(' ');
      const regex = new RegExp(q, 'i');
      if (words.length > 1) {
        filter.$or = [
          { $and: [{ firstName: new RegExp(words[0], 'i') }, { lastName: new RegExp(words[1], 'i') }] },
          { fullName: regex },
          { 'parentDetails.father.name': regex },
        ];
      } else {
        filter.$or = [
          { firstName: regex }, { lastName: regex }, { fullName: regex },
          { admissionNumber: regex }, { rollNo: regex },
          { 'parentDetails.father.name': regex },
        ];
      }
    }

    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    const [students, total] = await Promise.all([
      StudentProfile.find(filter)
        .populate('classId',   'name numericOrder')
        .populate('sectionId', 'name')
        .populate('session',   'name')
        .populate('userId',    'firstName lastName email phone isActive')
        .sort({ firstName: 1, lastName: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StudentProfile.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        students,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

