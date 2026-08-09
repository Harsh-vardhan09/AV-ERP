const express = require('express');

const router = express.Router();

router.use(require('./fingerprintRoutes'));

module.exports = router;
