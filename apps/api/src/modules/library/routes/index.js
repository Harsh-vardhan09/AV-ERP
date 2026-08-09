const express = require('express');

const router = express.Router();

router.use(require('./libraryRoutes'));

module.exports = router;
