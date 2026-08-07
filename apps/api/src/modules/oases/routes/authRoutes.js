// OASES Routes — Auth
// Protected by oasesAuth middleware (Redis blacklist + oasesRole check)
const express    = require('express');
const router     = express.Router();
const oasesAuth  = require('../middlewares/auth');
const ctrl       = require('../controllers/authController');

// GET  /api/v1/oases/auth/me      — current OASES user
router.get('/me', oasesAuth, ctrl.me);

// POST /api/v1/oases/auth/logout  — blacklist token
router.post('/logout', oasesAuth, ctrl.logout);

module.exports = router;
