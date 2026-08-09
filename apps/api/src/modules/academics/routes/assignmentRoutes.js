const express = require('express');
const {
  createAssignment,
  getassignmentteacher,
  getassignmentbysubject,
  Allsubjects,
  getassignmentbyid,
  getExpiredAssignmentById,
  getNotExpiredAssignmentById,
} = require('../controllers/assignmentController.js');
const upload = require('../../../core/http/upload.disk.js');
const {
  uploadassignment,
  getalluploadassignment,
  getassignmentbyidupload,
  getassignmentstudentscount,
} = require('../controllers/uploadAssignmentController.js');
const { checkModuleAccess } = require('../../../core/security/moduleGate.js');
const { varifyToken } = require('../../../core/security/authenticate.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');
const router = express.Router();

// ── Security: require authenticated school user for ALL assignment routes ──
router.use(varifyToken);
router.use(schoolIsolation);

// ─── Module Guard ─────────────────────────────────────────────────────────────
router.use(checkModuleAccess('assignments'));

router.post('/create', upload.single('photo'), createAssignment);
router.get('/all/:teacherid', getassignmentteacher);
router.get('/alla/:assignmentid', getassignmentbyid);
router.get('/expire/:subject/:section', getExpiredAssignmentById);
router.get('/notexpire/:subject/:section', getNotExpiredAssignmentById);
router.get('/subjects/:subject/:section/:semester', getassignmentbysubject);
router.get('/Allsubjects/:section/:semester', Allsubjects);
router.post('/upload/:studentid/:assignmentid', upload.single('photo'), uploadassignment);
router.get('/Allassignmnetupload/:assignmentid', getalluploadassignment);
router.get('/getassignmentbyid/:assignmentid/:studentid', getassignmentbyidupload);
router.get('/assignmnetcount/:studentid/:semester', getassignmentstudentscount);

// getassignmentbyid
module.exports = router;
