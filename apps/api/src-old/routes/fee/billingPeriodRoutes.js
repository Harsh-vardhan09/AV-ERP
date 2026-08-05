const express = require("express");
const mongoose = require("mongoose");
const {
    createBillingPeriod,
    getAllBillingPeriods,
    getBillingPeriodById,
    activateBillingPeriod,
    lockBillingPeriod,
    unlockBillingPeriod,
    deleteBillingPeriod,
} = require("../../controller/fee/billingPeriodController");

// ─── Route Factory ────────────────────────────────────────────────────────────

module.exports = (auth = {}) => {

    const {
        authenticate = (req, res, next) => next(),
        authorize = () => (req, res, next) => next(),
    } = auth;

    const router = express.Router();

    const validateId = (req, res, next) => {
        if (!mongoose.Types.ObjectId.isValid(req.params.id))
            return res.status(400).json({ success: false, message: "Invalid billing period ID format" });
        next();
    };

    // GET /            — list all billing periods
    router.get("/", authenticate, authorize("admin", "operator"), getAllBillingPeriods);

    // GET /:id         — single billing period
    router.get("/:id", authenticate, authorize("admin", "operator"), validateId, getBillingPeriodById);

    // POST /           — create new billing period
    router.post("/", authenticate, authorize("admin"), createBillingPeriod);

    // PATCH /:id/activate
    router.patch("/:id/activate", authenticate, authorize("admin"), validateId, activateBillingPeriod);

    // PATCH /:id/lock
    router.patch("/:id/lock", authenticate, authorize("admin"), validateId, lockBillingPeriod);

    // PATCH /:id/unlock
    router.patch("/:id/unlock", authenticate, authorize("admin"), validateId, unlockBillingPeriod);

    // DELETE /:id
    router.delete("/:id", authenticate, authorize("admin"), validateId, deleteBillingPeriod);

    return router;
};
