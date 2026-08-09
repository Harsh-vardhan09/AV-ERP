const express = require('express');

// Deliberately empty. Every router in this module already owns a top-level path
// (/api/v1/chat, /api/v1/knowledgecenter, /notice, and the bare /api/v1) and is
// declared in module.js extraMounts. basePath '/api/v1/communication' is reserved
// for a future consolidation — mounting these routers there as well would expose
// the whole surface at a second set of URLs.
const router = express.Router();

module.exports = router;
