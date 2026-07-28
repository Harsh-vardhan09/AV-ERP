const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { getStudentInstallments } = require("../../controller/fee/installmentController");
const { applyFines, getOverdueSummary } = require("../../controller/fee/fineController");
const { varifyToken } = require("../../middlewares/varifyToken");
const { authorizeRoles } = require("../../middlewares/authorizeRoles");

// ─── Middleware ───────────────────────────────────────────────────────────────

const validateInstallmentQuery = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.studentFeeId))
        return res.status(400).json({ success: false, message: "Invalid studentFeeId format" });

    if (req.query.status) {
        const validStatuses = ["pending", "partial", "paid"];
        if (!validStatuses.includes(req.query.status))
            return res.status(400).json({ success: false, message: `status must be one of: ${validStatuses.join(", ")}` });
    }

    next();
};

// ─── Auto-Fine Routes (additive — admin only) ─────────────────────────────────

// Preview: how many installments are overdue + fine already stamped
router.get(
    "/overdue-summary",
    varifyToken,
    authorizeRoles("admin"),
    getOverdueSummary
);

// Trigger: apply/recalculate fines on all overdue installments
router.post(
    "/apply-fines",
    varifyToken,
    authorizeRoles("admin"),
    applyFines
);

// ─── Existing Routes ──────────────────────────────────────────────────────────

// ✅ Admin/operator can see any | student can see their own
router.get(
    "/:studentFeeId",
    varifyToken,
    authorizeRoles("admin", "operator", "student"),
    validateInstallmentQuery,
    getStudentInstallments
);

module.exports = router;