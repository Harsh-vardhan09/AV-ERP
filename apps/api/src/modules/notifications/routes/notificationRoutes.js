/**
 * notificationRoutes.js
 * All routes require authentication + school context.
 * Order matters: specific paths (read-all, clear-all) must come before :id params.
 */

const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../../core/security/authenticate');
const { schoolIsolation } = require('../../../core/security/tenantScope');
const ctrl = require('../controllers/notificationController');

// All notification routes require auth + school context
router.use(varifyToken);
router.use(schoolIsolation);

// Specific routes first (before :id to avoid param conflicts)
router.get('/',              ctrl.getNotifications);
router.get('/unread-count',  ctrl.getUnreadCount);
router.patch('/read-all',    ctrl.markAllRead);
router.delete('/clear-all',  ctrl.clearAllNotifications);

// Parameterized routes after
router.patch('/:id/read',    ctrl.markAsRead);
router.delete('/:id',        ctrl.deleteNotification);

module.exports = router;
