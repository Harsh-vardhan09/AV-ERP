const express = require('express');

const router = express.Router();

// payrollRoutes carries no auth of its own — varifyToken is applied at the app.js
// mount, ahead of this router. See module.js.
router.use(require('./payrollRoutes'));

module.exports = router;
