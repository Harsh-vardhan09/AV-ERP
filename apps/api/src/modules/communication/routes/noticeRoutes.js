const express = require('express');
const router = express.Router();
const { varifyToken } = require('../../../core/security/authenticate.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');
const {
    CreateNotice,
    getNotice,
    getone,
    Delete,
    getphoto
} = require("../controllers/noticeController.js");

// Security: require authenticated school user for ALL notice routes
router.use(varifyToken);
router.use(schoolIsolation);

router.get("/get/:id", getone);
router.get("/getall", getNotice);
router.post("/create", CreateNotice);
router.delete("/delete/:id", Delete);
router.post("/photo", getphoto);

module.exports = router;