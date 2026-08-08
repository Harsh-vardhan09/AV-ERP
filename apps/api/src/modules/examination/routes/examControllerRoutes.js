/**
 * Exam Controller Routes
 * ──────────────────────────────────────────────────────────────────────────
 * These routes expose examination management + marks management endpoints
 * to the `exam_controller` role. They intentionally reuse the existing
 * admin and teacher controller functions so that:
 *   a) No logic is duplicated.
 *   b) Teachers and Admin remain completely unaffected.
 *   c) Audit fields (uploadedByRole) distinguish entries automatically.
 *   d) All school isolation (req.schoolId) is enforced inside controllers.
 */
const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../../core/security/authenticate.js');
const { authorize } = require('../../../core/security/roleMiddleware.js');
const validateObjectId = require('../../../core/http/validateObjectId.js');
// TEMP: moves to modules/people — the two god-controllers are still in src-old
const teacher = require('../../../../src-old/controller/teacherController');
const admin = require('../../../../src-old/controller/adminController');
const { sessionController } = require('../../academics');
const uploadMemory = require('../../../core/http/upload.memory.js');

// ── Security guard ────────────────────────────────────────────────────────────
router.use(varifyToken, authorize('exam_controller'));

// ── Reference data (read-only) ────────────────────────────────────────────────
// Sessions
router.get('/session/active', admin.getActiveSession);
router.get('/sessions', sessionController.getAllSessions);

// Classes / Sections (admin endpoints support ?session= / ?classId=)
router.get('/classes', admin.getAllClasses);
router.get('/sections', admin.getAllSections);

// Exam-scoped subjects: returns only subjects configured for that exam+class
// (reuses admin.getExamSubjects which queries ExamSubjectConfig — single source of truth)
router.get('/exam-subjects/:examId', admin.getExamSubjects);

// Report templates (needed by exam creation / template-linking UI)
router.get('/report-templates', admin.listReportTemplates);

// Marks Audit Log — exam_controller can see audit trail for their school
router.get('/marks-audit-log', admin.getMarksAuditLog);

// ── Exam Management (full CRUD — same as Admin, same controllers) ─────────────
// EC creates, reads, edits, deletes exams using the exact same adminController
// functions. School isolation (req.schoolId) is already enforced inside them.
router.post('/exam', admin.createExam);
router.get('/exams', admin.getAllExams);
router.get('/exam/:id', validateObjectId('id'), admin.getExam);
router.put('/exam/:id', validateObjectId('id'), admin.updateExam);
router.delete('/exam/:id', validateObjectId('id'), admin.deleteExam);
router.patch('/exam/:id/start-evaluation', validateObjectId('id'), admin.startEvaluation);
router.patch('/exam/:id/complete-evaluation', validateObjectId('id'), admin.completeEvaluation);
router.patch('/exam/:id/template', validateObjectId('id'), admin.linkTemplateToExam);

// ── Exam Subject Config (add/update/remove per-class subject configs) ─────────
router.post('/exam-subject', admin.addExamSubject);
router.put('/exam-subject/:id', admin.updateExamSubject);
router.delete('/exam-subject/:id', admin.removeExamSubject);

// ── Marks (re-use teacher functions with MARKS_ALL_ACCESS bypass) ─────────────
// Students list for marks entry (now schoolId-scoped in teacherController)
router.get('/students-for-marks', teacher.getStudentsForMarks);

// All exams for this school — uses getMyExams which now has EC bypass
router.get('/my-exams', teacher.getMyExams);

// Exam template resolution (same as teacher — no role guard inside)
router.get('/template', teacher.getTemplateForExam);

// Upload marks (manual / dynamic) — MARKS_ALL_ACCESS bypass fires inside
router.post('/marks', teacher.uploadMarks);
router.post('/marks/excel', uploadMemory.single('file'), teacher.uploadMarksExcel);

// Read marks (school-scoped — same function used by teacher)
router.get('/marks', teacher.getMarks);

module.exports = router;
