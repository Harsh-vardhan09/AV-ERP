const express = require('express')
const router = express.Router(); 
const {addknowledgecenter, getknowledgecenters} = require('../controller/knowledgecenter');
const upload = require('../../src/core/http/upload.disk.js'); 
const { varifyToken } = require('../../src/core/security/authenticate.js');
const { schoolIsolation } = require('../../src/core/security/tenantScope.js');

// ── Security: require authenticated school user for ALL knowledge center routes ──
router.use(varifyToken);
router.use(schoolIsolation);

router.post('/create',upload.single("photo") ,addknowledgecenter);
router.get('/getall',getknowledgecenters); 
module.exports = router;
