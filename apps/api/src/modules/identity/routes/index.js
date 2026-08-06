const express = require('express');

const router = express.Router();

router.use(require('./authRoutes'));

module.exports = router;
