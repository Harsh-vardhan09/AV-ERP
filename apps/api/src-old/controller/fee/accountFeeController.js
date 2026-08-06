const mongoose = require("mongoose");
const {
    assignFeeToAccountHolder,
    getAccountFeeSummary,
} = require("../../services/fee/accountFeeService");
const BillingPeriod = require("../../models/fee/BillingPeriod");
const FeeStructure = require("../../models/fee/FeeStructure");
const AccountFee = require("../../models/fee/AccountFee");
const { sendError, sendSuccess } = require("../../../src/shared/helpers.js");

// ─── Known business-level errors → 400 ───────────────────────────────────────

const KNOWN_ERRORS = [
    "No active billing period found",
    "Billing period is locked",
    "Fee structure not found",
    "Fee structure has invalid total amount",
    "Fee already assigned",
    "Invalid accountHolderId",
    "cohortKey is required",
    "Invalid accountFeeId",
];

const isKnownError = (message) =>
    KNOWN_ERRORS.some((e) => message?.includes(e));

// ─── ASSIGN FEE TO ACCOUNT HOLDER ────────────────────────────────────────────
//
// POST /api/fee/account-fees
// Body: { accountHolderId, cohortKey, billingPeriodId? }

exports.assignAccountFee = async (req, res) => {
    try {
        const { accountHolderId, cohortKey, billingPeriodId } = req.body;

        if (!accountHolderId)
            return sendError(res, 400, "Missing required field: accountHolderId");

        if (!cohortKey)
            return sendError(res, 400, "Missing required field: cohortKey");

        const result = await assignFeeToAccountHolder({ accountHolderId, cohortKey, billingPeriodId });

        return sendSuccess(res, 201, "Fee assigned successfully", result);
    } catch (error) {
        if (isKnownError(error.message))
            return sendError(res, 400, error.message);

        console.error("assignAccountFee error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── GET ACCOUNT FEE SUMMARY ──────────────────────────────────────────────────
//
// GET /api/fee/account-fees/summary/:accountHolderId

exports.getAccountFeeSummary = async (req, res) => {
    try {
        const { accountHolderId } = req.params;
        const { billingPeriodId } = req.query;

        if (!mongoose.Types.ObjectId.isValid(accountHolderId))
            return sendError(res, 400, "Invalid accountHolderId format");

        const result = await getAccountFeeSummary(accountHolderId, billingPeriodId || null);

        if (result === null) {
            return res.status(200).json({
                success: true,
                message: "No fee record assigned to this account holder yet.",
                data: null,
            });
        }

        return sendSuccess(res, 200, "Account fee summary fetched successfully", result);
    } catch (error) {
        if (isKnownError(error.message))
            return sendError(res, 400, error.message);

        console.error("getAccountFeeSummary error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── BULK ASSIGN FEES (BACKFILL) ──────────────────────────────────────────────
//
// POST /api/fee/account-fees/bulk-assign
//
// Generic version of the old "backfillAllStudentFees" — takes a list of
// { accountHolderId, cohortKey } pairs from the request body.
// The host system resolves which entities need fee assignment and passes them in.
//
// This removes the school-specific User.find({ role: "student" }) logic.
// Host system is responsible for providing the list.

exports.bulkAssignFees = async (req, res) => {
    try {
        const { assignments, billingPeriodId } = req.body;

        if (!Array.isArray(assignments) || assignments.length === 0)
            return sendError(res, 400, "assignments must be a non-empty array of { accountHolderId, cohortKey }");

        const billingPeriod = billingPeriodId
            ? await BillingPeriod.findById(billingPeriodId).lean()
            : await BillingPeriod.findOne({ isActive: true }).lean();

        if (!billingPeriod)
            return sendError(res, 404, "No active billing period found");

        // Find which accountHolderIds already have a fee record
        const holderIds = assignments.map(a => a.accountHolderId);
        const existingFees = await AccountFee.find({
            accountHolderId: { $in: holderIds },
            billingPeriodId: billingPeriod._id,
        }).select("accountHolderId").lean();

        const alreadyAssigned = new Set(existingFees.map(f => f.accountHolderId.toString()));

        const toAssign = assignments.filter(a => !alreadyAssigned.has(a.accountHolderId.toString()));

        if (!toAssign.length) {
            return sendSuccess(res, 200, "All account holders already have fee records", {
                assigned: 0,
                skipped: alreadyAssigned.size,
                failed: 0,
            });
        }

        let assigned = 0, failed = 0;
        const errors = [];

        for (const item of toAssign) {
            try {
                await assignFeeToAccountHolder({
                    accountHolderId: item.accountHolderId,
                    cohortKey: item.cohortKey,
                    billingPeriodId: billingPeriod._id,
                });
                assigned++;
            } catch (err) {
                failed++;
                errors.push({ accountHolderId: item.accountHolderId, reason: err.message });
            }
        }

        return sendSuccess(res, 200,
            `Bulk assignment complete. Assigned: ${assigned}, Skipped: ${alreadyAssigned.size}, Failed: ${failed}`,
            {
                assigned,
                skipped: alreadyAssigned.size,
                failed,
                ...(errors.length && { errors }),
            }
        );

    } catch (error) {
        console.error("bulkAssignFees error:", error);
        return sendError(res, 500, "Internal server error during bulk assignment");
    }
};
