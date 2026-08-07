/**
 * staffRoutes.js
 * All routes require authentication + school context (varifyToken + schoolIsolation).
 * Admin-only — school admin manages admission and accounts staff.
 */

const express = require('express');
const router  = express.Router();

const { varifyToken }     = require('../../../core/security/authenticate.js');
const { authorize }       = require('../../../core/security/roleMiddleware.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');
const staff               = require('../controllers/staffController');

// Every staff route requires: valid JWT → school context → admin role
router.use(varifyToken);
router.use(schoolIsolation);

// ─── Staff CRUD ───────────────────────────────────────────────────────────────
// POST   /api/v1/staff             → create a new staff member
router.post('/', authorize('admin'), staff.createStaffMember);

// GET    /api/v1/staff             → list all staff for this school
router.get('/', authorize('admin'), staff.getAllStaffMembers);

// PUT    /api/v1/staff/:id         → update name / phone
router.put('/:id', authorize('admin'), staff.updateStaffMember);

// PATCH  /api/v1/staff/:id/status  → activate or deactivate
router.patch('/:id/status', authorize('admin'), staff.toggleStaffStatus);

// POST   /api/v1/staff/:id/resend-credentials → regenerate + resend temp password
router.post('/:id/resend-credentials', authorize('admin'), staff.resendCredentials);

// DELETE /api/v1/staff/:id → permanently delete staff account (admin only, school-scoped)
router.delete('/:id', authorize('admin'), staff.deleteStaffMember);

module.exports = router;
