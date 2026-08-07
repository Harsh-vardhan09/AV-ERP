const express = require('express');

const router = express.Router();

router.use(require('./reportCardRoutes'));

module.exports = router;
