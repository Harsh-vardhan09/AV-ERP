const express=require("express");
const router=express.Router({ mergeParams: true });
const { varifyToken } = require('../../../core/security/authenticate.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');
const {getApplication,createPDF}=require("../../communication").leaveController;
const {upload}=require("../../../../src-old/middlewares/upload");  // TEMP: moves to modules/leave

// Security: require authenticated school user for ALL application routes
router.use(varifyToken);
router.use(schoolIsolation);

    router.post("/leaves/:id",upload.single("files"),createPDF);
    router.get("/leaves",getApplication);  
module.exports = router;
   
