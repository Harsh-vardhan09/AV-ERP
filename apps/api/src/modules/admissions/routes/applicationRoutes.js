const express = require('express');
const router = express.Router({ mergeParams: true });
const { varifyToken } = require('../../../core/security/authenticate.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');
const { getApplication, createPDF } = require('../../communication').leaveController;
// upload.disk prefixes a timestamp+random to the original name. The old src-old
// middleware kept the original name, so two students attaching photo.jpg collided
const upload = require('../../../core/http/upload.disk.js');

// Security: require authenticated school user for ALL application routes
router.use(varifyToken);
router.use(schoolIsolation);

router.post('/leaves/:id', upload.single('files'), createPDF);
router.get('/leaves', getApplication);
module.exports = router;
