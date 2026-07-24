const express = require("express");
const mongoose = require("mongoose");
const {
    assignAccountFee,
    getAccountFeeSummary,
    bulkAssignFees,
} = require("../../controller/fee/accountFeeController");

// ─── Route Factory ────────────────────────────────────────────────────────────

module.exports = (auth = {}) => {

    const {
        authenticate = (req, res, next) => next(),
        authorize = () => (req, res, next) => next(),
    } = auth;

    const router = express.Router();

    // ─── Validation ────────────────────────────────────────────────────────────

    const validateAssignBody = (req, res, next) => {
        const { accountHolderId, cohortKey } = req.body;
        if (!accountHolderId)
            return res.status(400).json({ success: false, message: "accountHolderId is required" });
        if (!mongoose.Types.ObjectId.isValid(accountHolderId))
            return res.status(400).json({ success: false, message: "Invalid accountHolderId format" });
        if (!cohortKey || !cohortKey.trim())
            return res.status(400).json({ success: false, message: "cohortKey is required" });
        next();
    };

    // ─── Routes ───────────────────────────────────────────────────────────────

    // POST / — assign fee to an account holder
    router.post(
        "/",
        authenticate,
        authorize("admin", "operator"),
        validateAssignBody,
        assignAccountFee
    );

    // GET /summary/:accountHolderId — fee summary for an account holder
    router.get(
        "/summary/:accountHolderId",
        authenticate,
        authorize("admin", "operator"),
        (req, res, next) => {
            if (!mongoose.Types.ObjectId.isValid(req.params.accountHolderId))
                return res.status(400).json({ success: false, message: "Invalid accountHolderId format" });
            next();
        },
        getAccountFeeSummary
    );

    // POST /bulk-assign — assign fees to multiple account holders at once
    router.post(
        "/bulk-assign",
        authenticate,
        authorize("admin"),
        bulkAssignFees
    );

    return router;
};
