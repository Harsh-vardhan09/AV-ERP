const express = require("express");
const mongoose = require("mongoose");
const {
    createFeeStructure,
    getAllFeeStructures,
    getFeeStructureById,
    updateFeeStructure,
    deleteFeeStructure,
} = require("../controllers/feeStructureController");

// Route Factory

module.exports = (auth = {}) => {

    const {
        authenticate = (req, res, next) => next(),
        authorize = () => (req, res, next) => next(),
    } = auth;

    const router = express.Router();

    const validateId = (req, res, next) => {
        if (!mongoose.Types.ObjectId.isValid(req.params.id))
            return res.status(400).json({ success: false, message: "Invalid fee structure ID format" });
        next();
    };

    // GET /                — list all (filter by billingPeriodId, cohortKey, isActive)
    router.get("/", authenticate, authorize("admin", "operator"), getAllFeeStructures);

    // GET /:id             — single fee structure
    router.get("/:id", authenticate, authorize("admin", "operator"), validateId, getFeeStructureById);

    // POST /               — create fee structure
    router.post("/", authenticate, authorize("admin"), createFeeStructure);

    // PATCH /:id           — update (cohortKey, feeComponents, isActive)
    router.patch("/:id", authenticate, authorize("admin"), validateId, updateFeeStructure);

    // DELETE /:id          — delete (guarded: not if AccountFee references exist)
    router.delete("/:id", authenticate, authorize("admin"), validateId, deleteFeeStructure);

    return router;
};