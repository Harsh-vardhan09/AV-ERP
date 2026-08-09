const express = require('express');

const router = express.Router();

router.use(require('./documentRoutes'));

module.exports = router;
