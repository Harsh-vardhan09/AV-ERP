const express = require('express')
const router = express.Router(); 
const {addknowledgecenter, getknowledgecenters} = require('../controllers/knowledgecenter');
const upload = require('../../../core/http/upload.disk.js'); 
const { varifyToken } = require('../../../core/security/authenticate.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');

// Security: require authenticated school user for ALL knowledge center routes
router.use(varifyToken);
router.use(schoolIsolation);

router.post('/create',upload.single("photo") ,addknowledgecenter);
router.get('/getall',getknowledgecenters); 
module.exports = router;
