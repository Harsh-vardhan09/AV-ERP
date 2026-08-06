const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../src/core/security/authenticate.js');
const { authorize } = require('../../src/core/security/roleMiddleware.js');
const admission = require('../controller/admissionController');
const otp = require('../controller/otpController');
const { uploadPhoto } = require('../../src/core/http/upload.disk.js');

// All admission routes are protected (admission + admin + teacher can access)
router.use(varifyToken, authorize('admission', 'admin', 'teacher'));

// Email OTP verification
router.post('/email/send-otp', otp.sendEmailOtp);
router.post('/email/verify-otp', otp.verifyEmailOtp);

// Student registration & management
router.get('/student/check-duplicate', admission.checkDuplicateField);
router.post('/student/register', admission.registerStudent);

router.get('/student/:id', admission.getStudentDetails);
router.put('/student/:id', admission.updateStudentDetails);
router.put('/student/:id/activate', admission.activateStudent);
router.put('/student/:id/deactivate', admission.deactivateStudent);
router.get('/students', admission.getAllStudents);

// ── Export all students as Excel (.xlsx) ─────────────────────────────────────
// Must be defined BEFORE '/students/:id/photo' to avoid route conflict
router.get('/students/export-excel', authorize('admin', 'admission'), admission.exportStudentsExcel);

// Student passport photo upload — admin/admission only (teacher excluded)
router.put(
  '/students/:id/photo',
  authorize('admin', 'admission'),
  uploadPhoto.single('photo'),
  admission.uploadStudentPhoto
);

// Teacher registration & management
router.post('/teacher/register', admission.registerTeacher);
router.get('/teacher/:id', admission.getTeacherDetails);
router.put('/teacher/:id', admission.updateTeacherDetails);
router.put('/teacher/:id/activate', admission.activateTeacher);
router.put('/teacher/:id/deactivate', admission.deactivateTeacher);
router.get('/teachers', admission.getAllTeachers);

// School Settings (auto-gen toggles + school profile)
router.get('/school-settings', admission.getSchoolSettings);
router.put('/school-settings', admission.updateSchoolSettings);

// ── Upload school logo / watermark / signature / QR code ────────────────────
// Admin only — uses existing multer uploadPhoto middleware (accepts images)
router.put(
  '/school-settings/upload-logo',
  authorize('admin'),
  uploadPhoto.single('file'),
  admission.uploadSettingsLogo
);

// ── Admission Form Settings ──────────────────────────────────────────────────
// Admin or admission roles can read/write form field visibility config
router.get('/form-settings',  authorize('admin', 'admission'), admission.getAdmissionFormSettings);
router.put('/form-settings',  authorize('admin', 'admission'), admission.updateAdmissionFormSettings);

// ── Form Students (paginated list for Print Admission Form page) ──────────────
router.get('/form-students',  authorize('admin', 'admission'), admission.getFormStudents);

module.exports = router;

