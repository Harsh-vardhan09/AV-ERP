const express = require('express');

const router = express.Router();

router.use(require('./admissionRoutes'));

module.exports = router;
