const mongoose = require("mongoose");
const { getInstallmentsByStudent } = require("../../services/fee/installmentService");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sendError = (res, status, message) =>
    res.status(status).json({ success: false, message });

const sendSuccess = (res, status, message, data = null) => {
    const response = { success: true, message };
    if (data) response.data = data;
    return res.status(status).json(response);
};

const KNOWN_ERRORS = [
    "Invalid student fee ID",
    "No installments found",
    "status must be one of",
];

const isKnownError = (message) =>
    KNOWN_ERRORS.some((e) => message?.includes(e));

// ─── GET INSTALLMENTS ─────────────────────────────────────────────────────────
// ✅ Fixed: removed duplicate function, use single getInstallmentsByStudent
// ✅ Fixed: was calling getInstallmentsByStudentFee which was not imported

exports.getStudentInstallments = async (req, res) => {
    try {
        const { studentFeeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentFeeId))
            return sendError(res, 400, "Invalid studentFeeId format");

        // ✅ Pass optional status filter
        const filters = {};
        if (req.query.status) filters.status = req.query.status;

        const data = await getInstallmentsByStudent(studentFeeId, filters);

        return sendSuccess(res, 200, "Installments fetched successfully", data);
    } catch (error) {
        if (isKnownError(error.message))
            return sendError(res, 400, error.message);

        console.error("getStudentInstallments error:", error);
        return sendError(res, 500, "Internal server error");
    }
};