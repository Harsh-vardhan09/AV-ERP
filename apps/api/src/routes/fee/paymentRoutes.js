const express = require("express");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const {
    makePayment,
    getPaymentsByAccountFee,
} = require("../../controller/fee/paymentController");
const { downloadReceipt } = require("../../controller/fee/receiptController");
const {
    createOrder,
    verifyPayment,
    handleWebhook,
} = require("../../controller/fee/razorpayController");

// ─── Route Factory ─────────────────────────────────────────────────────────────
module.exports = (auth = {}) => {

    const {
        authenticate = (req, res, next) => next(),
        authorize = () => (req, res, next) => next(),
    } = auth;

    const router = express.Router();

    // ─── Rate Limiters ─────────────────────────────────────────────────────────
    const paymentRateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many payment requests. Please try again after 15 minutes." },
    });

    const razorpayRateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: "Too many Razorpay requests. Please try again later." },
    });

    // ─── Validation Middleware ──────────────────────────────────────────────────
    const validatePaymentBody = (req, res, next) => {
        const { accountFeeId, amount } = req.body;
        const missing = [];
        if (!accountFeeId) missing.push("accountFeeId");
        if (!amount) missing.push("amount");
        if (missing.length > 0)
            return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });
        if (!mongoose.Types.ObjectId.isValid(accountFeeId))
            return res.status(400).json({ success: false, message: "Invalid accountFeeId format" });
        if (isNaN(amount) || Number(amount) <= 0)
            return res.status(400).json({ success: false, message: "Amount must be a positive number" });
        req.body.amount = Number(amount);
        next();
    };

    const validateObjectId = (param) => (req, res, next) => {
        if (!mongoose.Types.ObjectId.isValid(req.params[param]))
            return res.status(400).json({ success: false, message: `Invalid ${param} format` });
        next();
    };

    // ─── Routes ────────────────────────────────────────────────────────────────

    // POST /  — process a manual payment (operator only, rate-limited)
    router.post(
        "/",
        paymentRateLimiter,
        authenticate,
        authorize("operator"),
        validatePaymentBody,
        makePayment
    );

    // GET /  — student payment history (?studentId= required)
    router.get(
        "/",
        authenticate,
        authorize("admin", "operator", "student"),
        async (req, res) => {
            try {
                const Payment = require("../../models/fee/Payment");
                const StudentFee = require("../../models/fee/StudentFee");
                const StudentProfile = require("../../models/StudentProfile");
                const { studentId } = req.query;

                if (!studentId || !mongoose.Types.ObjectId.isValid(studentId))
                    return res.status(400).json({ success: false, message: "Valid studentId query param is required" });

                // Resolve: studentId may be a User._id (from frontend) or a StudentProfile._id
                let profileId = studentId;
                const directProfile = await StudentProfile.findById(studentId).select("_id").lean();
                if (!directProfile) {
                    const byUser = await StudentProfile.findOne({ userId: studentId }).select("_id").lean();
                    if (byUser) profileId = byUser._id.toString();
                }

                // Find all StudentFee records for this student profile
                const studentFees = await StudentFee.find({ studentId: profileId }).select("_id").lean();
                const studentFeeIds = studentFees.map(sf => sf._id);

                // Fetch payments linked to those StudentFee records
                const payments = await Payment.find({ studentFeeId: { $in: studentFeeIds } })
                    .sort({ createdAt: -1 })
                    .lean();

                return res.status(200).json({ success: true, data: payments });
            } catch (err) {
                console.error("GET /payments error:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch payments" });
            }
        }
    );

    // GET /account/:accountFeeId  — all payments for an account fee
    router.get(
        "/account/:accountFeeId",
        authenticate,
        authorize("admin", "operator"),
        validateObjectId("accountFeeId"),
        getPaymentsByAccountFee
    );

    // GET /receipt/:paymentId  — download PDF receipt (student can see own)
    router.get(
        "/receipt/:paymentId",
        authenticate,
        authorize("admin", "operator", "student"),
        validateObjectId("paymentId"),
        downloadReceipt
    );

    // ─── Razorpay Routes ───────────────────────────────────────────────────────

    // POST /razorpay/order  — Step 1: create Razorpay order
    // VERIFIED: authenticate (varifyToken) runs first — sets req.user, req.userid, req.schoolId.
    // If createOrder reports req.user is undefined, the issue is in varifyToken middleware.
    router.post(
        "/razorpay/order",
        razorpayRateLimiter,
        authenticate,          // ← sets req.user + req.userid before controller
        authorize("student", "operator", "admin"),
        createOrder
    );

    // POST /razorpay/verify  — Step 2: verify Razorpay signature & record payment
    // VERIFIED: authenticate runs before verifyPayment — req.user is always available.
    router.post(
        "/razorpay/verify",
        razorpayRateLimiter,
        authenticate,          // ← sets req.user + req.userid before controller
        authorize("student", "operator", "admin"),
        verifyPayment
    );

    // POST /razorpay/webhook  — async Razorpay webhook (NO JWT — HMAC-verified instead)
    // DO NOT add authenticate here — Razorpay calls this without a JWT token.
    // Authenticity is verified via X-Razorpay-Signature HMAC in handleWebhook.
    // express.raw() MUST come first — raw Buffer is required for HMAC to match.
    // Register this URL in Razorpay Dashboard → Settings → Webhooks.
    router.post(
        "/razorpay/webhook",
        express.raw({ type: "application/json" }), // raw body before handleWebhook
        handleWebhook
    );

    return router;
};