const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const {
  createSession,
  getAllSessions,
  getSessionById,
  activateSession,
  deleteSession,
} = require("../controllers/sessionController");
const { varifyToken } = require("../../../core/security/authenticate.js");
const { authorizeRoles } = require("../../../core/security/authorizeRoles.js");

// Middleware

const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id))
    return res.status(400).json({ success: false, message: "Invalid session ID format" });
  next();
};

const validateSessionBody = (req, res, next) => {
  const { name, startDate, endDate } = req.body;
  const missing = [];

  if (!name) missing.push("name");
  if (!startDate) missing.push("startDate");
  if (!endDate) missing.push("endDate");

  if (missing.length > 0)
    return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(", ")}` });

  if (isNaN(new Date(startDate)) || isNaN(new Date(endDate)))
    return res.status(400).json({ success: false, message: "startDate and endDate must be valid dates" });

  next();
};

// Routes

// Admin only — read sessions
router.get("/", varifyToken, authorizeRoles("admin", "operator"), getAllSessions);

// Admin only — create session
router.post("/", varifyToken, authorizeRoles("admin"), validateSessionBody, createSession);

// Admin only — get/delete single session
router.get("/:id", varifyToken, authorizeRoles("admin", "operator"), validateObjectId, getSessionById);
router.delete("/:id", varifyToken, authorizeRoles("admin"), validateObjectId, deleteSession);

// Admin only — session actions
router.patch("/:id/activate", varifyToken, authorizeRoles("admin"), validateObjectId, activateSession);

module.exports = router;