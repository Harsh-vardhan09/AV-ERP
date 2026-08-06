const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const {
    createFeeHead,
    getAllFeeHeads,
    updateFeeHead,
    deleteFeeHead,
} = require("../../controller/fee/feeHeadController");
const { varifyToken } = require("../../../src/core/security/authenticate.js");
const { authorizeRoles } = require("../../../src/core/security/authorizeRoles.js");

// ─── Middleware ───────────────────────────────────────────────────────────────

const validateObjectId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id))
        return res.status(400).json({ success: false, message: "Invalid fee head ID format" });
    next();
};

const validateFeeHeadBody = (req, res, next) => {
    const { name, category } = req.body;
    const missing = [];

    if (!name) missing.push("name");
    if (!category) missing.push("category");

    if (missing.length > 0)
        return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

    const allowed = ["one-time", "monthly", "yearly", "optional"];
    if (!allowed.includes(category))
        return res.status(400).json({ success: false, message: `category must be one of: ${allowed.join(", ")}` });

    next();
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// Admin/operator can read fee heads
router.get("/", varifyToken, authorizeRoles("admin", "operator"), getAllFeeHeads);

// Admin only — create fee head
router.post("/", varifyToken, authorizeRoles("admin"), validateFeeHeadBody, createFeeHead);

// Admin only — update/delete fee head
router.patch("/:id", varifyToken, authorizeRoles("admin"), validateObjectId, updateFeeHead);
router.delete("/:id", varifyToken, authorizeRoles("admin"), validateObjectId, deleteFeeHead);

module.exports = router;