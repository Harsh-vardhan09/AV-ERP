const express = require('express');
const multer = require('multer');

const router = express.Router();

const fp = require('../controllers/fingerprintController');
const { varifyToken } = require('../../../core/security/authenticate');
const { authorize } = require('../../../core/security/roleMiddleware');
const { checkModuleAccess } = require('../../../core/security/moduleGate');
const { ADMIN_ONLY } = require('../permissions');

const adminGuard = [varifyToken, authorize(...ADMIN_ONLY)];

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Gated per path rather than router-wide: /punch is device-initiated and carries no
// school cookie, so a blanket checkModuleAccess would reject every punch
router.use('/device',      checkModuleAccess('biometric'));
router.use('/mapping',     checkModuleAccess('biometric'));
router.use('/attendance',  checkModuleAccess('biometric'));
router.use('/report',      checkModuleAccess('biometric'));
router.use('/queue',       checkModuleAccess('biometric'));

router.post('/device', adminGuard, fp.registerDevice);
router.get('/device', adminGuard, fp.getDevices);
router.patch('/device/:id/toggle', adminGuard, fp.toggleDevice);
router.delete('/device/:id', adminGuard, fp.deleteDevice);

router.post('/mapping', adminGuard, fp.mapFaculty);
router.get('/mapping', adminGuard, fp.getMappings);
router.delete('/mapping/:id', adminGuard, fp.deleteMapping);

router.get('/attendance', adminGuard, fp.getAttendance);
router.post('/attendance/manual', adminGuard, fp.manualCorrection);
router.get('/report/monthly', adminGuard, fp.getMonthlyReport);

// For devices whose software cannot HTTP-push: admin exports a CSV and uploads it
router.post('/attendance/upload-csv', adminGuard, csvUpload.single('file'), fp.uploadAttendanceCSV);

router.get('/queue/stats', adminGuard, fp.getQueueHealth);

// Called by the MORX hardware — no JWT, authenticated by the X-Device-Token header.
// Reachable as both /api/v1/fingerprint/punch and /api/v1/device/punch
router.post('/punch', fp.receivePunch);

module.exports = router;
