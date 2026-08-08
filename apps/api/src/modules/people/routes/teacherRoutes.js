const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../../core/security/authenticate.js');
const { authorize } = require('../../../core/security/roleMiddleware.js');
const teacher = require('../controllers/teacherController');
const upload = require('../../../core/http/upload.disk.js');
const uploadMemory = require('../../../core/http/upload.memory.js');

// All teacher routes are protected
router.use(varifyToken, authorize('teacher'));

// My assignments (what I teach)
router.get('/my-assignments', teacher.getMyAssignments);
router.get('/my-class-teacher', teacher.getMyClassTeacherAssignment);

// Attendance
router.get('/students-for-attendance', teacher.getStudentsForAttendance);
router.post('/attendance', teacher.takeAttendance);
router.get('/attendance', teacher.getAttendanceRecords);

// Teacher leave
router.post('/leave/apply', teacher.applyLeave);
router.get('/leave/my', teacher.getMyLeaves);

// Student leave management (class teacher)
router.get('/leave/students', teacher.getStudentLeaves);
router.put('/leave/student/:id', teacher.approveStudentLeave);

// Assignments
router.post('/assignment', upload.single('photo'), teacher.createAssignment);
router.get('/assignments', teacher.getMyCreatedAssignments);
router.put('/assignment/:assignmentId', upload.single('photo'), teacher.updateAssignment);
router.delete('/assignment/:assignmentId', teacher.deleteAssignment);
router.get('/assignment-submissions/:assignmentId', teacher.getAssignmentSubmissions);
router.get('/assignment-not-submitted/:assignmentId', teacher.getNotSubmittedStudents);

// Knowledge Center
router.post('/material', upload.single('photo'), teacher.uploadMaterial);
router.get('/materials', teacher.getMyMaterials);
router.put('/material/:materialId', upload.single('photo'), teacher.updateMaterial);
router.delete('/material/:materialId', teacher.deleteMaterial);

// Marks
router.get('/students-for-marks', teacher.getStudentsForMarks);
router.post('/marks', teacher.uploadMarks);
router.post('/marks/excel', uploadMemory.single('file'), teacher.uploadMarksExcel);
router.get('/marks', teacher.getMarks);

// Template-driven form: resolve which template to use for an exam
router.get('/template', teacher.getTemplateForExam);

// Teacher test creation
router.post('/test', teacher.createTeacherTest);
router.get('/my-exams', teacher.getMyExams);

// Class teacher specific
router.get('/my-students', teacher.getMyClassStudents);
router.get('/my-students/:studentId/performance', teacher.getStudentPerformance);
router.get('/class-marks', teacher.getClassMarks);

// Co-scholastic (Discipline / Activity) marks — class teacher entry
// router.get('/co-scholastic/templates', teacher.getCoScholasticTemplates);
router.get('/co-scholastic/skills', teacher.getCoScholasticSkills); // detect skills from active template
router.get('/co-scholastic', teacher.getCoScholasticMarks);
router.post('/co-scholastic', teacher.saveCoScholasticMarks);

module.exports = router;
