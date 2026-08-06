const mongoose = require("mongoose");
const AccountFee = require("../../models/fee/AccountFee");
const FeeStructure = require("../../models/fee/FeeStructure");
const Payment = require("../../models/fee/Payment");
const { generateReceiptPDF } = require("../../services/fee/receiptService");
const { sendError } = require("../../../src/shared/helpers.js");

// ─── DOWNLOAD RECEIPT PDF ─────────────────────────────────────────────────────
//
// GET /api/fee/payments/receipt/:paymentId
//
// The host system can inject display metadata via query params:
//   ?holderName=John+Doe&identifier=ENR123&cohortKey=ClassX
// If omitted, "N/A" appears on the PDF.

exports.downloadReceipt = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(paymentId))
            return sendError(res, 400, "Invalid payment ID format");

        // Host system can pass display values as query params
        const meta = {
            holderName: req.query.holderName,
            identifier: req.query.identifier,
            cohortKey: req.query.cohortKey,
        };

        await generateReceiptPDF(paymentId, res, meta);
        // PDF pipes directly to res — no explicit return needed
    } catch (error) {
        if (error.message?.includes("not found") || error.message?.includes("Invalid"))
            return sendError(res, 404, error.message);

        console.error("downloadReceipt error:", error);
        if (!res.headersSent) return sendError(res, 500, "Internal server error");
    }
};