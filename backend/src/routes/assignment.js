const express = require('express');
const { createAssignment, getassignmentteacher, getassignmentbysubject, Allsubjects, getassignmentbyid,  getExpiredAssignmentById, getNotExpiredAssignmentById } = require('../controller/assignment.js'); 
const upload = require('../middlewares/multer.js'); 
const { uploadassignment, getalluploadassignment, getassignmentbyidupload, getassignmentstudentscount } = require('../controller/uploadassignment.js');
const { checkModuleAccess } = require('../middlewares/checkModuleAccess');
const { varifyToken } = require('../middlewares/varifyToken');
const { schoolIsolation } = require('../middlewares/schoolIsolation');
const router = express.Router(); 

// ── Security: require authenticated school user for ALL assignment routes ──
router.use(varifyToken);
router.use(schoolIsolation);

// ─── Module Guard ─────────────────────────────────────────────────────────────
router.use(checkModuleAccess('assignments'));



router.post('/create', upload.single("photo"), createAssignment);
router.get('/all/:teacherid', getassignmentteacher);
router.get('/alla/:assignmentid', getassignmentbyid);
router.get('/expire/:subject/:section', getExpiredAssignmentById);
router.get('/notexpire/:subject/:section', getNotExpiredAssignmentById)
router.get('/subjects/:subject/:section/:semester', getassignmentbysubject);
router.get('/Allsubjects/:section/:semester', Allsubjects);
router.post('/upload/:studentid/:assignmentid',upload.single("photo"),uploadassignment);
router.get('/Allassignmnetupload/:assignmentid',getalluploadassignment);
router.get('/getassignmentbyid/:assignmentid/:studentid',getassignmentbyidupload);
router.get('/assignmnetcount/:studentid/:semester',getassignmentstudentscount);

// getassignmentbyid
module.exports = router; 


