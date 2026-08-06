const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const {
    assignStudentFee,
    getStudentFeeSummary,
    getClassFeeStatus,
    collectPayment,
    backfillAllStudentFees,
    updatePreviousDues,
} = require("../../controller/fee/studentFeeController");
const { varifyToken } = require("../../../src/core/security/authenticate.js");
const { authorizeRoles, guardSelfAccess } = require("../../../src/core/security/authorizeRoles.js");

// ─── Middleware ───────────────────────────────────────────────────────────────

const validateAssignFeeBody = (req, res, next) => {
    const { studentProfileId } = req.body;
    if (!studentProfileId)
        return res.status(400).json({ success: false, message: "studentProfileId is required" });
    if (!mongoose.Types.ObjectId.isValid(studentProfileId))
        return res.status(400).json({ success: false, message: "Invalid studentProfileId format" });
    next();
};

const validateStudentIdParam = (req, res, next) => {
    const { studentProfileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentProfileId))
        return res.status(400).json({ success: false, message: "Invalid studentProfileId format" });
    next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// Only admin/operator can assign fees
router.post("/", varifyToken, authorizeRoles("admin", "operator"), validateAssignFeeBody, assignStudentFee);

// Admin/operator can see anyone | Student can only see their own
router.get(
    "/summary/student/:studentProfileId",
    varifyToken,
    authorizeRoles("admin", "operator", "student"),
    validateStudentIdParam,
    guardSelfAccess,
    getStudentFeeSummary
);

// Admin only — assign missing fees to all students in classes with active fee structures
router.post("/backfill", varifyToken, authorizeRoles("admin"), backfillAllStudentFees);

// Admin/operator — get all students in a class with their fee status
// GET /student-fees/class?classId=&sessionId=
router.get("/class", varifyToken, authorizeRoles("admin", "operator"), getClassFeeStatus);

// Operator/admin — collect a payment for a student installment
router.post("/collect", varifyToken, authorizeRoles("admin", "operator"), collectPayment);

// Admin — set previous year arrears for a student
// PATCH /student-fees/previous-dues/:studentProfileId
router.patch(
    "/previous-dues/:studentProfileId",
    varifyToken,
    authorizeRoles("admin"),
    validateStudentIdParam,
    updatePreviousDues
);

module.exports = router;
