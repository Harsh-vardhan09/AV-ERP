// OASES Routes — Index
// Combines all OASES sub-routers under a single Express Router.
// Mounted in backend/index.js at: /api/v1/oases
const express = require('express');
const router  = express.Router();

// rate limiters
const { generalOasesLimiter } = require('../lib/rateLimiter');

// unified module guard (replaces checkOasesEnabled).
// Reads modules.oases from SchoolSettings; falls back to isOasesEnabled for
// legacy documents that haven't been migrated yet. Backward-compatible.
const { checkModuleAccess } = require('../../../core/security/moduleGate.js');

const authRoutes       = require('./authRoutes');       // Sprint 1
const schemeRoutes     = require('./schemeRoutes');     // Sprint 1
const examConfigRoutes = require('./examConfigRoutes');
const uploadRoutes     = require('./uploadRoutes');
const evaluationRoutes = require('./evaluationRoutes');
const assignmentRoutes = require('./assignmentRoutes');
const conflictRoutes   = require('./conflictRoutes');
const resultRoutes     = require('./resultRoutes');
const auditRoutes      = require('./auditRoutes');
const moderateRoutes   = require('./moderateRoutes');  // HE panel
const reportRoutes     = require('./reportRoutes');    // reports

// Global OASES enablement guard
router.use(checkModuleAccess('oases'));


// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'OASES',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    message: 'OASES module is running.',
  });
});

// Apply general limiter to all authenticated routes
router.use(generalOasesLimiter);

// Sub-routes
router.use('/auth',        authRoutes);
router.use('/scheme',      schemeRoutes);
router.use('/exam-config', examConfigRoutes);
router.use('/upload',      uploadRoutes);
router.use('/evaluation',  evaluationRoutes);
router.use('/assignment',  assignmentRoutes);
router.use('/conflict',    conflictRoutes);
router.use('/result',      resultRoutes);
router.use('/audit',       auditRoutes);
router.use('/moderate',    moderateRoutes);
router.use('/report',      reportRoutes);

module.exports = router;
