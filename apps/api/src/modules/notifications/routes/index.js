const express = require('express');

const router = express.Router();

router.use(require('./notificationRoutes'));

module.exports = router;
