const express = require('express');

const router = express.Router();

router.use(require('./examControllerRoutes'));

module.exports = router;
