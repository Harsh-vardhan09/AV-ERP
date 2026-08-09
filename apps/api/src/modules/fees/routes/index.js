const express = require('express');

const router = express.Router();

// feeRoutes applies varifyToken + checkModuleAccess('fee_management') and mounts
// all thirteen sub-routers, six of which are factories taking an auth config
router.use(require('./feeRoutes'));

module.exports = router;
