const mongoose = require("mongoose");
const refundService = require("../../services/fee/refundService");
const { sendError, sendSuccess } = require("../../../src/shared/helpers.js");

// ─── REQUEST REFUND ───────────────────────────────────────────────────────────
//
// POST /api/fee/refunds
// Body: { paymentId, accountFeeId, amount, reason, requestedBy }

exports.requestRefund = async (req, res) => {
    try {
        const { paymentId, accountFeeId, amount, reason, requestedBy } = req.body;

        if (!paymentId) return sendError(res, 400, "paymentId is required");
        if (!accountFeeId) return sendError(res, 400, "accountFeeId is required");
        if (!amount) return sendError(res, 400, "amount is required");
        if (!requestedBy) return sendError(res, 400, "requestedBy is required");

        const refund = await refundService.requestRefund({
            paymentId,
            accountFeeId,
            amount: Number(amount),
            reason,
            requestedBy,
        });

        return sendSuccess(res, 201, "Refund requested successfully", refund);
    } catch (error) {
        const known = ["Invalid paymentId", "Invalid accountFeeId", "Refund amount", "Payment not found", "already in progress"];
        if (known.some(k => error.message?.includes(k)))
            return sendError(res, 400, error.message);

        console.error("requestRefund error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── APPROVE REFUND ───────────────────────────────────────────────────────────
//
// PATCH /api/fee/refunds/:refundId/approve
// Body: { approvedBy }

exports.approveRefund = async (req, res) => {
    try {
        const { refundId } = req.params;
        const { approvedBy } = req.body;

        if (!approvedBy) return sendError(res, 400, "approvedBy is required");

        const refund = await refundService.approveRefund({ refundId, approvedBy });
        return sendSuccess(res, 200, "Refund approved successfully", refund);
    } catch (error) {
        if (error.message?.includes("Cannot approve") || error.message?.includes("not found"))
            return sendError(res, 400, error.message);

        console.error("approveRefund error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── REJECT REFUND ────────────────────────────────────────────────────────────
//
// PATCH /api/fee/refunds/:refundId/reject
// Body: { approvedBy, reason }

exports.rejectRefund = async (req, res) => {
    try {
        const { refundId } = req.params;
        const { approvedBy, reason } = req.body;

        if (!approvedBy) return sendError(res, 400, "approvedBy is required");

        const refund = await refundService.rejectRefund({ refundId, approvedBy, reason });
        return sendSuccess(res, 200, "Refund rejected", refund);
    } catch (error) {
        if (error.message?.includes("Cannot reject") || error.message?.includes("not found"))
            return sendError(res, 400, error.message);

        console.error("rejectRefund error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── PROCESS REFUND ───────────────────────────────────────────────────────────
//
// PATCH /api/fee/refunds/:refundId/process

exports.processRefund = async (req, res) => {
    try {
        const { refundId } = req.params;

        const result = await refundService.processRefund({ refundId });
        return sendSuccess(res, 200, "Refund processed successfully", result);
    } catch (error) {
        if (error.message?.includes("Cannot process") || error.message?.includes("not found"))
            return sendError(res, 400, error.message);

        console.error("processRefund error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── GET REFUNDS BY PAYMENT ───────────────────────────────────────────────────
//
// GET /api/fee/refunds/payment/:paymentId

exports.getRefundsByPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(paymentId))
            return sendError(res, 400, "Invalid paymentId format");

        const refunds = await refundService.getRefundsByPayment(paymentId);
        return sendSuccess(res, 200, "Refunds fetched successfully", refunds);
    } catch (error) {
        console.error("getRefundsByPayment error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── GET REFUNDS BY ACCOUNT FEE ──────────────────────────────────────────────
//
// GET /api/fee/refunds/account/:accountFeeId

exports.getRefundsByAccountFee = async (req, res) => {
    try {
        const { accountFeeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(accountFeeId))
            return sendError(res, 400, "Invalid accountFeeId format");

        const result = await refundService.getRefundsByAccountFee(accountFeeId, req.query);
        return sendSuccess(res, 200, "Refunds fetched successfully", result);
    } catch (error) {
        console.error("getRefundsByAccountFee error:", error);
        return sendError(res, 500, "Internal server error");
    }
};
