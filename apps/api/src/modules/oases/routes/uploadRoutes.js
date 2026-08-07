
// OASES Routes — Upload (Sprint 7: oasesAuth → Redis blacklist)
// SCAN_OPERATOR / SCHOOL_ADMIN can upload
const express = require('express');
const router = express.Router();
const multer = require('multer');
const oasesAuth = require('../middlewares/auth');
const oasesRole = require('../middlewares/role');
const ctrl = require('../controllers/uploadController');
const { OASES_ROLES } = require('../lib/constants');

// In-memory storage — files are uploaded to Cloudinary by the controller.
// No local directory is created; this is safe in serverless environments.
const upload = multer({
  storage: multer.memoryStorage(),
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are accepted for sheet uploads.'));
  },
});

// Middleware aliases
const scanOrAdmin = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.SCAN_OPERATOR)];
const adminOnly = [oasesAuth, oasesRole(OASES_ROLES.SCHOOL_ADMIN)];
const anyAuth = [oasesAuth, oasesRole(
  OASES_ROLES.SCHOOL_ADMIN, OASES_ROLES.EVALUATOR, OASES_ROLES.HEAD_EXAMINER
)];

// GET   /api/v1/oases/upload/all              — cross-exam sheet list (admin)
router.get('/all', adminOnly, ctrl.listAllSheets);

// GET   /api/v1/oases/upload/checked         — admin checked copies view
router.get('/checked', adminOnly, ctrl.listCheckedSheets);

// POST  /api/v1/oases/upload/:examConfigId          — upload 1-30 PDF sheets
router.post('/:examConfigId', scanOrAdmin, upload.array('sheets', 30), ctrl.uploadSheets);

// GET   /api/v1/oases/upload/:examConfigId          — list sheets + counts
router.get('/:examConfigId', scanOrAdmin, ctrl.listSheets);

// GET   /api/v1/oases/upload/:sheetId/reprocess     — retry failed processing
router.get('/:sheetId/reprocess', adminOnly, ctrl.reprocessSheet);

// GET   /api/v1/oases/upload/:sheetId/page/:pageNo  — signed page URL
router.get('/:sheetId/page/:pageNo', anyAuth, ctrl.getPageUrl);

// PATCH /api/v1/oases/upload/:sheetId/reject        — reject bad sheet
router.patch('/:sheetId/reject', adminOnly, ctrl.rejectSheet);

// PATCH /api/v1/oases/upload/:sheetId/flag-ufm      — flag UFM
router.patch('/:sheetId/flag-ufm', adminOnly, ctrl.flagUfm);

module.exports = router;
