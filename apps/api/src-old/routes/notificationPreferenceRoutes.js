const express               = require('express');
const router                = express.Router();
const { varifyToken }       = require('../../src/core/security/authenticate.js');
const { schoolIsolation }   = require('../../src/core/security/tenantScope.js');
const { authorize }         = require('../../src/core/security/roleMiddleware.js');
const ctrl                  = require('../controller/notificationPreferenceController');

// All routes require authentication + school scoping
router.use(varifyToken);
router.use(schoolIsolation);

// ── All authenticated users — personal notification preferences ──────────────
router.get('/my',    ctrl.getMyPreferences);
router.patch('/my',  ctrl.updateMyPreferences);
router.delete('/my', ctrl.resetMyPreferences);

// ── Admin only — school-wide notification control ────────────────────────────
router.get('/school',
  authorize('admin'),
  ctrl.getSchoolNotificationSettings
);

router.patch('/school',
  authorize('admin'),
  ctrl.updateSchoolNotificationSettings
);

router.get('/school/history',
  authorize('admin'),
  ctrl.getNotificationHistory
);

router.post('/school/announcement',
  authorize('admin'),
  ctrl.sendBulkAnnouncement
);

module.exports = router;
