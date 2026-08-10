const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../../core/security/authenticate.js');
const { authorize } = require('../../../core/security/roleMiddleware.js');
const student = require('../controllers/studentController');
const upload = require('../../../core/http/upload.disk.js');
const { authLimiter } = require('../../../core/security/rateLimiters.js');

// All student routes are protected
router.use(varifyToken, authorize('student'));

// Profile
router.get('/profile', student.getMyProfile);

// Login email — students are created with a rollNo only; login accepts either
router.post('/request-email-change', authLimiter, student.requestEmailChange);
router.post('/verify-email-change', authLimiter, student.verifyEmailChange);

// Attendance
router.get('/attendance', student.getMyAttendance);

// Assignments
router.get('/assignments', student.getMyAssignments);
router.post('/assignments/submit', upload.single('photo'), student.submitAssignment);

// Leave
router.post('/leave/apply', student.applyLeave);
router.get('/leave/my', student.getMyLeaves);

// Complaints
router.post('/complaint', student.submitComplaint);
router.get('/complaints', student.getMyComplaints);

// Knowledge Center
router.get('/knowledge-center', student.getMaterials);
router.post('/knowledge-center/:materialId/view', student.markMaterialViewed);

// Notices
router.get('/notices', student.getNotices);

// Marks
router.get('/marks', student.getMyMarks);

// Performance Report
router.get('/report', student.getMyReport);

module.exports = router;
