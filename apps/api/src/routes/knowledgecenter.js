const express = require('express')
const router = express.Router(); 
const {addknowledgecenter, getknowledgecenters} = require('../controller/knowledgecenter');
const upload = require('../middlewares/multer.js'); 
const { varifyToken } = require('../middlewares/varifyToken');
const { schoolIsolation } = require('../middlewares/schoolIsolation');

// ── Security: require authenticated school user for ALL knowledge center routes ──
router.use(varifyToken);
router.use(schoolIsolation);

router.post('/create',upload.single("photo") ,addknowledgecenter);
router.get('/getall',getknowledgecenters); 
module.exports = router;
