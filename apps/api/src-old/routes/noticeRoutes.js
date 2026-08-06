const express = require('express');
const router = express.Router();
const upload = require('../../src/core/http/upload.disk.js');
const { varifyToken } = require('../../src/core/security/authenticate.js');
const { schoolIsolation } = require('../../src/core/security/tenantScope.js');
const {
    CreateNotice,
    getNotice,
    getone,
    Delete,
    getphoto
} = require("../controller/noticeController.js");

// ── Security: require authenticated school user for ALL notice routes ──
router.use(varifyToken);
router.use(schoolIsolation);

router.get("/get/:id", getone);
router.get("/getall", getNotice);
router.post("/create", CreateNotice);
router.delete("/delete/:id", Delete);
router.post("/photo", getphoto);
// router.patch("/editNotice",);

module.exports = router;