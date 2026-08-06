const express = require('express');
const router = express.Router();
const fp = require('../controller/fingerprintController');
const { varifyToken } = require('../../src/core/security/authenticate.js');
const { authorize } = require('../../src/core/security/roleMiddleware.js');
const { checkModuleAccess } = require('../../src/core/security/moduleGate.js');
const multer = require('multer');

// All admin routes require JWT + admin role
const adminGuard = [varifyToken, authorize('admin')];

// Multer: memory storage for CSV (no disk write needed)
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// ─── Module Guard (applied only to admin-authenticated routes below) ──────────
// NOTE: the /punch endpoint (device-initiated) is intentionally AFTER this guard
// so it is NOT blocked by the module check — devices don't send school cookies.
router.use('/device',      checkModuleAccess('biometric'));
router.use('/mapping',     checkModuleAccess('biometric'));
router.use('/attendance',  checkModuleAccess('biometric'));
router.use('/report',      checkModuleAccess('biometric'));
router.use('/queue',       checkModuleAccess('biometric'));


// ─── Device Management ────────────────────────────────────────────────────────
router.post('/device', adminGuard, fp.registerDevice);
router.get('/device', adminGuard, fp.getDevices);
router.patch('/device/:id/toggle', adminGuard, fp.toggleDevice);
router.delete('/device/:id', adminGuard, fp.deleteDevice);

// ─── Faculty Mapping ──────────────────────────────────────────────────────────
router.post('/mapping', adminGuard, fp.mapFaculty);
router.get('/mapping', adminGuard, fp.getMappings);
router.delete('/mapping/:id', adminGuard, fp.deleteMapping);

// ─── Attendance Queries ───────────────────────────────────────────────────────
router.get('/attendance', adminGuard, fp.getAttendance);
router.post('/attendance/manual', adminGuard, fp.manualCorrection);
router.get('/report/monthly', adminGuard, fp.getMonthlyReport);

// ─── CSV Upload (for devices that don't support HTTP push) ───────────────────
// Admin downloads CSV from device software → uploads here → auto-processes
router.post('/attendance/upload-csv', adminGuard, csvUpload.single('file'), fp.uploadAttendanceCSV);

// ─── Queue Health (admin monitoring) ─────────────────────────────────────────
router.get('/queue/stats', adminGuard, fp.getQueueHealth);

// ─── Device Punch Endpoint ────────────────────────────────────────────────────
// Called by physical MORX device — NO JWT, uses X-Device-Token header
// Mounted at BOTH /api/v1/fingerprint/punch AND /api/v1/device/punch (see index.js)
router.post('/punch', fp.receivePunch);

module.exports = router;
