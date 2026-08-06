const AcademicSession = require("../../models/AcademicSession");
const logger  = require("../../../src/core/logging/logger.js");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sendError   = (res, status, message) => res.status(status).json({ success: false, message });
const sendSuccess = (res, status, message, data = null) => {
  const response = { success: true, message };
  if (data) response.data = data;
  return res.status(status).json(response);
};

// ─── CREATE SESSION ───────────────────────────────────────────────────────────
exports.createSession = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate)
      return sendError(res, 400, "All fields are required");

    if (new Date(startDate) >= new Date(endDate))
      return sendError(res, 400, "startDate must be before endDate");

    const session = await AcademicSession.create({
      name,
      startDate,
      endDate,
      createdBy: req.user?._id,
      schoolId: req.schoolId,      // ── multi-tenancy stamp ──
    });

    return sendSuccess(res, 201, "Session created successfully", session);
  } catch (error) {
    if (error.code === 11000)
      return sendError(res, 400, "Session with this name already exists in your school");
    logger.error("createSession error", { error: error.message, schoolId: req.schoolId });
    return sendError(res, 500, "Internal server error");
  }
};

// ─── GET ALL SESSIONS ─────────────────────────────────────────────────────────
exports.getAllSessions = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    // SECURITY: scope to schoolId
    const filter = { schoolId: req.schoolId };

    const [sessions, total] = await Promise.all([
      AcademicSession.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AcademicSession.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: sessions,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error("getAllSessions error", { error: error.message, schoolId: req.schoolId });
    return sendError(res, 500, "Internal server error");
  }
};

// ─── GET SESSION BY ID ────────────────────────────────────────────────────────
exports.getSessionById = async (req, res) => {
  try {
    // SECURITY: scope by schoolId
    const session = await AcademicSession.findOne({ _id: req.params.id, schoolId: req.schoolId }).lean();
    if (!session) return sendError(res, 404, "Session not found");
    return sendSuccess(res, 200, "Session fetched successfully", session);
  } catch (error) {
    logger.error("getSessionById error", { error: error.message, schoolId: req.schoolId });
    return sendError(res, 500, "Internal server error");
  }
};

// ─── ACTIVATE SESSION (only one active at a time within a school) ─────────────
exports.activateSession = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: scope by schoolId before update
    const session = await AcademicSession.findOneAndUpdate(
      { _id: id, schoolId: req.schoolId },
      { isActive: true },
      { new: true }
    ).lean();

    if (!session) return sendError(res, 404, "Session not found");

    // Deactivate only other sessions within the same school
    await AcademicSession.updateMany(
      { _id: { $ne: id }, schoolId: req.schoolId, isActive: true },
      { isActive: false }
    );

    return sendSuccess(res, 200, "Session activated successfully", session);
  } catch (error) {
    logger.error("activateSession error", { error: error.message, schoolId: req.schoolId });
    return sendError(res, 500, "Internal server error");
  }
};

// ─── DELETE SESSION ───────────────────────────────────────────────────────────
exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: scope by schoolId
    const session = await AcademicSession.findOne({ _id: id, schoolId: req.schoolId }).lean();
    if (!session) return sendError(res, 404, "Session not found");

    if (session.isActive)
      return sendError(res, 400, "Cannot delete an active session. Deactivate it first");

    await AcademicSession.findOneAndDelete({ _id: id, schoolId: req.schoolId });
    return sendSuccess(res, 200, "Session deleted successfully");
  } catch (error) {
    logger.error("deleteSession error", { error: error.message, schoolId: req.schoolId });
    return sendError(res, 500, "Internal server error");
  }
};