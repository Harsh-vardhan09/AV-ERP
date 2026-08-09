const express = require('express');

// assignmentRoutes is not mounted here: it keeps its own top-level /api/v1/assignment
// path and goes through extraMounts. Nothing serves the basePath yet, so this router
// stays empty and the loader skips mounting it.
const router = express.Router();

module.exports = router;
