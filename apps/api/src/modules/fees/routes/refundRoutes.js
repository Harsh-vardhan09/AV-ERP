const express = require("express");
const mongoose = require("mongoose");
const {
    requestRefund,
    approveRefund,
    rejectRefund,
    processRefund,
    getRefundsByPayment,
    getRefundsByAccountFee,
} = require("../controllers/refundController");

// Route Factory

module.exports = (auth = {}) => {

    const {
        authenticate = (req, res, next) => next(),
        authorize = () => (req, res, next) => next(),
    } = auth;

    const router = express.Router();

    const validateObjectId = (param) => (req, res, next) => {
        const val = req.params[param] || req.body[param];
        if (!mongoose.Types.ObjectId.isValid(val))
            return res.status(400).json({ success: false, message: `Invalid ${param} format` });
        next();
    };

    // POST / — request a refund
    router.post("/", authenticate, authorize("admin", "operator"), requestRefund);

    // PATCH /:refundId/approve
    router.patch("/:refundId/approve", authenticate, authorize("admin"), validateObjectId("refundId"), approveRefund);

    // PATCH /:refundId/reject
    router.patch("/:refundId/reject", authenticate, authorize("admin"), validateObjectId("refundId"), rejectRefund);

    // PATCH /:refundId/process
    router.patch("/:refundId/process", authenticate, authorize("admin"), validateObjectId("refundId"), processRefund);

    // GET /payment/:paymentId
    router.get("/payment/:paymentId", authenticate, authorize("admin", "operator"), validateObjectId("paymentId"), getRefundsByPayment);

    // GET /account/:accountFeeId
    router.get("/account/:accountFeeId", authenticate, authorize("admin", "operator"), validateObjectId("accountFeeId"), getRefundsByAccountFee);

    return router;
};
