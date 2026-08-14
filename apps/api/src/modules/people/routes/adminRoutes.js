const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const { sessionController, classController, sectionController } = require('../../academics');
const { varifyToken } = require('../../../core/security/authenticate.js');
const { authorize } = require('../../../core/security/roleMiddleware.js');
const validateObjectId = require('../../../core/http/validateObjectId.js');
const { examController } = require('../../examination');

// ── Guards ────────────────────────────────────────────────────────────────────
// All admin routes require authentication
router.use(varifyToken);

// Admin + Admission: full write access
const writeGuard = authorize('admin', 'admission');
// Admin + Admission + Teacher + Exam Controller: can read reference data (classes, sessions, subjects)
const readGuard = authorize('admin', 'admission', 'teacher', 'exam_controller');

// ── Session management ────────────────────────────────────────────────────────
router.post('/session', authorize('admin'), sessionController.createSession);
router.get('/sessions', readGuard, sessionController.getAllSessions);
router.get('/session/active', readGuard, sessionController.getActiveSession);
router.put(
  '/session/:id',
  authorize('admin'),
  validateObjectId('id'),
  sessionController.updateSession
);
router.delete(
  '/session/:id',
  authorize('admin'),
  validateObjectId('id'),
  sessionController.deleteSession
);
router.post(
  '/session/:id/copy-classes',
  authorize('admin'),
  validateObjectId('id'),
  sessionController.copyClassesToSession
);
router.post(
  '/session/:id/sync-students',
  authorize('admin'),
  validateObjectId('id'),
  sessionController.syncStudentSessions
);
router.post(
  '/session/:id/copy-subject-maps',
  authorize('admin'),
  validateObjectId('id'),
  sessionController.copySubjectMapsToSession
);
router.post(
  '/session/:id/copy-teacher-assignments',
  authorize('admin'),
  validateObjectId('id'),
  sessionController.copyTeacherAssignmentsToSession
);

// ── Class management ──────────────────────────────────────────────────────────
router.post('/class', writeGuard, classController.createClass);
router.get('/classes', readGuard, classController.getAllClasses);
router.put('/class/:id', writeGuard, validateObjectId('id'), classController.updateClass);
router.delete(
  '/class/:id',
  authorize('admin'),
  validateObjectId('id'),
  classController.deleteClass
);

// ── Section management ────────────────────────────────────────────────────────
router.post('/section', writeGuard, sectionController.createSection);
router.post('/sections/bulk', writeGuard, sectionController.createBulkSections);
router.get('/sections', readGuard, sectionController.getAllSections);
router.put('/section/:id', writeGuard, validateObjectId('id'), sectionController.updateSection);
router.delete(
  '/section/:id',
  authorize('admin'),
  validateObjectId('id'),
  sectionController.deleteSection
);

// ── Subject management ────────────────────────────────────────────────────────
router.post('/subject', writeGuard, admin.createSubject);
router.get('/subjects', readGuard, admin.getAllSubjects);
router.put('/subject/:id', writeGuard, validateObjectId('id'), admin.updateSubject);
router.delete('/subject/:id', authorize('admin'), validateObjectId('id'), admin.deleteSubject);

// ── Class-Subject mapping ─────────────────────────────────────────────────────
router.post('/class-subject-map', writeGuard, admin.mapSubjectToClass);
router.get('/class-subjects', readGuard, admin.getClassSubjects);
router.delete('/class-subject-map/:id', writeGuard, admin.removeClassSubjectMapping);

// ── Teacher-Subject assignment ────────────────────────────────────────────────
router.post('/teacher-assignment', writeGuard, admin.assignTeacherToSubject);
router.get('/teacher-assignments', readGuard, admin.getTeacherAssignments);
router.put('/teacher-assignment/:id', writeGuard, admin.updateTeacherAssignment);
router.delete('/teacher-assignment/:id', writeGuard, admin.removeTeacherAssignment);

// ── Class Teacher assignment ──────────────────────────────────────────────────
router.post('/class-teacher', writeGuard, admin.assignClassTeacher);
router.get('/class-teachers', readGuard, admin.getClassTeachers);
router.put('/class-teacher/:id', writeGuard, admin.updateClassTeacher);
router.delete('/class-teacher/:id', writeGuard, admin.removeClassTeacher);

// ── Exam management ───────────────────────────────────────────────────────────
router.post('/exam', writeGuard, admin.createExam);
router.get('/exams', readGuard, admin.getAllExams);
router.get('/exam/:id', readGuard, validateObjectId('id'), admin.getExam);
// Edit/archive/delete/unlock live in the examination module — same implementation
// the exam_controller and teacher routers use, so the rules cannot drift.
router.put('/exam/:id', writeGuard, validateObjectId('id'), examController.updateExam);
router.delete('/exam/:id', writeGuard, validateObjectId('id'), examController.deleteExam);
router.patch('/exam/:id/archive', writeGuard, validateObjectId('id'), examController.archiveExam);
router.patch('/exam/:id/restore', writeGuard, validateObjectId('id'), examController.restoreExam);
// completeEvaluation sets evaluationLocked and nothing outside OASES ever cleared
// it — a locked exam could not be edited, deleted or marked, with no way back.
router.patch('/exam/:id/unlock', writeGuard, validateObjectId('id'), examController.unlockExam);
router.get('/exam-audit-log', readGuard, examController.getExamAuditLog);
router.patch(
  '/exam/:id/start-evaluation',
  writeGuard,
  validateObjectId('id'),
  admin.startEvaluation
);
router.patch(
  '/exam/:id/complete-evaluation',
  writeGuard,
  validateObjectId('id'),
  admin.completeEvaluation
);
// Force the marks-entry window open/closed, or hand it back to the dates
router.patch(
  '/exam/:id/marks-window',
  writeGuard,
  validateObjectId('id'),
  admin.setMarksEntryOverride
);
// Link / unlink a report template to an exam (PATCH /exam/:id/template)
router.patch('/exam/:id/template', writeGuard, validateObjectId('id'), admin.linkTemplateToExam);

// Also: read-only route to list school's report templates (used by admin exam form)
router.get('/report-templates', readGuard, admin.listReportTemplates);

// ── Exam Subject config ───────────────────────────────────────────────────────
router.post('/exam-subject', writeGuard, admin.addExamSubject);
router.get('/exam-subjects/:examId', readGuard, admin.getExamSubjects);
router.put('/exam-subject/:id', writeGuard, admin.updateExamSubject);
router.delete('/exam-subject/:id', writeGuard, admin.removeExamSubject);

// ── Marks Audit Log ───────────────────────────────────────────────────────────
router.get('/marks-audit-log', authorize('admin'), admin.getMarksAuditLog);

// ── Teacher leave management ──────────────────────────────────────────────────
router.get('/teacher-leaves', authorize('admin'), admin.getTeacherLeaves);
router.put('/teacher-leave/:id', authorize('admin'), admin.approveTeacherLeave);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', readGuard, admin.getDashboardStats);
router.get('/dashboard/analytics', readGuard, admin.getDashboardAnalytics);

// ── Knowledge Center ──────────────────────────────────────────────────────────
router.get('/knowledge-center', readGuard, admin.getKnowledgeCenterMaterials);

// ── Student directory ─────────────────────────────────────────────────────────
router.get('/students', readGuard, admin.getAdminStudents);
router.get('/students/:id', readGuard, validateObjectId('id'), admin.getAdminStudentDetail);

// ── Teacher directory ─────────────────────────────────────────────────────────
router.get('/teachers', readGuard, admin.getAdminTeachers);
router.get('/teachers/:id', readGuard, validateObjectId('id'), admin.getAdminTeacherDetail);

// Dashboard detail views (card click-through) — SECURED: require auth + admin role
router.get('/all-students', authorize('admin'), admin.getAllStudentsAdmin);
router.get('/all-teachers', authorize('admin'), admin.getAllTeachersAdmin);
router.get(
  '/all-classes',
  authorize('admin', 'admission', 'teacher'),
  classController.getAllClassesAdmin
);
router.get('/all-subjects', authorize('admin', 'admission', 'teacher'), admin.getAllSubjectsAdmin);

module.exports = router;
