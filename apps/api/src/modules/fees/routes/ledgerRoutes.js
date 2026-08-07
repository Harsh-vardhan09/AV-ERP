const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { getStudentLedger } = require("../controllers/ledgerController");
const { varifyToken } = require("../../../core/security/authenticate.js");
const { authorizeRoles } = require("../../../core/security/authorizeRoles.js");

// Middleware

const validateStudentFeeId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.studentFeeId))
    return res.status(400).json({ success: false, message: "Invalid studentFeeId format" });
  next();
};

// Routes

// Admin/operator can see any ledger | student can see their own
router.get(
  "/:studentFeeId",
  varifyToken,
  authorizeRoles("admin", "operator", "student"),
  validateStudentFeeId,
  getStudentLedger
);

module.exports = router;