const express = require('express');
const {
  changePassword,
  cheakauth,
  login,
  logout,
  resetPassword,
  signup,
  varifyemail,
  alluser,
  activateUser,
  deactivateUser,
  changeFirstPassword
} = require('../controller/authenticates.js');
const { varifyToken } = require('../../src/core/security/authenticate.js');
const { authorize } = require('../../src/core/security/roleMiddleware.js');
const { platformOwnerOnly } = require('../../src/core/security/tenantScope.js');
const upload = require('../../src/core/http/upload.disk.js');
const router = express.Router();

// Public routes
// FIX 14: Signup is protected with platformOwnerOnly — requires X-Platform-Secret header.
// Regular students & teachers MUST be registered via: POST /api/v1/admission/student/register
//                                                  and: POST /api/v1/admission/teacher/register
router.post('/signup', platformOwnerOnly, upload.none(), signup);
router.post('/login', upload.none(), login);
router.post('/logout', logout);
router.post('/varify-email', varifyemail);
router.post('/reset-password', resetPassword);
router.post('/reset-password/:token', changePassword);


// Authenticated routes
router.get('/cheak-auth', varifyToken, cheakauth);

// Admin-only routes
router.get('/alluser', varifyToken, authorize('admin', 'admission'), alluser);
router.put('/activate/:id', varifyToken, authorize('admin', 'admission'), activateUser);
router.put('/deactivate/:id', varifyToken, authorize('admin', 'admission'), deactivateUser);

// Force password change — required for admin-created staff on first login
// User must be logged-in (varifyToken) but no role restriction — any role can call this.
router.post('/change-first-password', varifyToken, changeFirstPassword);

module.exports = router;