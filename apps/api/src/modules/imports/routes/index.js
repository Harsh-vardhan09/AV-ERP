const express = require('express');

const router = express.Router();

router.use(require('./importRoutes'));

module.exports = router;
