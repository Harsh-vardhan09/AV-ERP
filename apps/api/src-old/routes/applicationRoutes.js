const express=require("express");
const router=express.Router({ mergeParams: true });
const { varifyToken } = require('../middlewares/varifyToken');
const { schoolIsolation } = require('../middlewares/schoolIsolation');
const {getApplication,createPDF}=require("../controller/leave_controller");
const {upload}=require("../middlewares/upload");

// ── Security: require authenticated school user for ALL application routes ──
router.use(varifyToken);
router.use(schoolIsolation);

    router.post("/leaves/:id",upload.single("files"),createPDF);
    router.get("/leaves",getApplication);  
module.exports = router;
   
