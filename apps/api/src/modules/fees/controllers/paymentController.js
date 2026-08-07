const mongoose = require("mongoose");
const { processPayment, getPaymentsByAccountFee } = require("../services/paymentService");
const { sendError, sendSuccess } = require("../../../shared/helpers.js");
const { serviceError } = require('../lib/respond');

// MAKE PAYMENT
//
// POST /api/fee/payments
// Body: { accountFeeId, amount, method?, note?, idempotencyKey? }

exports.makePayment = async (req, res) => {
    try {
        const { accountFeeId, amount, method, note, idempotencyKey } = req.body;

        const result = await processPayment(
            accountFeeId,
            Number(amount),
            method,
            note,
            idempotencyKey
        );

        const statusCode = result.idempotent ? 200 : 201;
        const message = result.idempotent
            ? "Duplicate request — returning original payment"
            : "Payment processed successfully";

        return sendSuccess(res, statusCode, message, result);
    } catch (error) {
        const knownErrors = [
            "No outstanding due",
            "Payment amount must be greater than",
            "Invalid account fee",
            "Invalid payment method",
            "exceeds due amount",
            "Account fee record not found",
        ];

        if (knownErrors.some(e => error.message?.includes(e)))
            return sendError(res, 400, error.message);

        return serviceError(res, "makePayment error:", error);
    }
};

// GET PAYMENTS BY ACCOUNT FEE
//
// GET /api/fee/payments/account/:accountFeeId

exports.getPaymentsByAccountFee = async (req, res) => {
    try {
        const { accountFeeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(accountFeeId))
            return sendError(res, 400, "Invalid accountFeeId format");

        const result = await getPaymentsByAccountFee(accountFeeId, req.query);

        return sendSuccess(res, 200, "Payments fetched successfully", result);
    } catch (error) {
        if (error.message?.includes("No payments found"))
            return sendError(res, 404, error.message);

        return serviceError(res, "getPaymentsByAccountFee error:", error);
    }
};