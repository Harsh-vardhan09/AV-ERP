const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../src/core/security/authenticate.js');
const { authorize } = require('../../src/core/security/roleMiddleware.js');
const student = require('../controller/studentController');
const upload = require('../../src/core/http/upload.disk.js');

// All student routes are protected
router.use(varifyToken, authorize('student'));

// Profile
router.get('/profile', student.getMyProfile);

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
