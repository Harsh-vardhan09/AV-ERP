const BillingPeriod = require("../models/BillingPeriod");
const { serviceError } = require('../lib/respond');

const sendError   = (res, status, message) => res.status(status).json({ success: false, message });
const sendSuccess = (res, status, message, data = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  return res.status(status).json(response);
};

// CREATE
exports.createBillingPeriod = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate)
      return sendError(res, 400, "name, startDate, and endDate are required");
    if (new Date(startDate) >= new Date(endDate))
      return sendError(res, 400, "startDate must be before endDate");

    const period = await BillingPeriod.create({
      name,
      startDate,
      endDate,
      createdBy: req.user?._id,
      schoolId: req.schoolId,    // ── multi-tenancy stamp ──
    });

    return sendSuccess(res, 201, "Billing period created successfully", period);
  } catch (error) {
    if (error.code === 11000)
      return sendError(res, 400, "A billing period with this name already exists in your school");
    return serviceError(res, "createBillingPeriod error", { error: error.message, schoolId: req.schoolId });
  }
};

// GET ALL
exports.getAllBillingPeriods = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    // SECURITY: scope to schoolId
    const filter = { schoolId: req.schoolId };

    const [periods, total] = await Promise.all([
      BillingPeriod.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      BillingPeriod.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: periods,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return serviceError(res, "getAllBillingPeriods error", { error: error.message, schoolId: req.schoolId });
  }
};

// GET BY ID
exports.getBillingPeriodById = async (req, res) => {
  try {
    // SECURITY: scope by schoolId
    const period = await BillingPeriod.findOne({ _id: req.params.id, schoolId: req.schoolId }).lean();
    if (!period) return sendError(res, 404, "Billing period not found");
    return sendSuccess(res, 200, "Billing period fetched successfully", period);
  } catch (error) {
    return serviceError(res, "getBillingPeriodById error", { error: error.message, schoolId: req.schoolId });
  }
};

// ACTIVATE (only one active per school)
exports.activateBillingPeriod = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: scope by schoolId
    const period = await BillingPeriod.findOneAndUpdate(
      { _id: id, schoolId: req.schoolId },
      { isActive: true },
      { new: true }
    ).lean();

    if (!period) return sendError(res, 404, "Billing period not found");

    // Deactivate others within the same school only
    await BillingPeriod.updateMany(
      { _id: { $ne: id }, schoolId: req.schoolId, isActive: true },
      { isActive: false }
    );

    return sendSuccess(res, 200, "Billing period activated successfully", period);
  } catch (error) {
    return serviceError(res, "activateBillingPeriod error", { error: error.message, schoolId: req.schoolId });
  }
};

// LOCK
exports.lockBillingPeriod = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: scope by schoolId
    const period = await BillingPeriod.findOneAndUpdate(
      { _id: id, schoolId: req.schoolId },
      { isLocked: true },
      { new: true }
    ).lean();

    if (!period) return sendError(res, 404, "Billing period not found");
    return sendSuccess(res, 200, "Billing period locked successfully", period);
  } catch (error) {
    return serviceError(res, "lockBillingPeriod error", { error: error.message, schoolId: req.schoolId });
  }
};

// UNLOCK
exports.unlockBillingPeriod = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: scope by schoolId
    const existing = await BillingPeriod.findOne({ _id: id, schoolId: req.schoolId }).lean();
    if (!existing) return sendError(res, 404, "Billing period not found");
    if (!existing.isLocked) return sendError(res, 400, "Billing period is already unlocked");

    const period = await BillingPeriod.findOneAndUpdate(
      { _id: id, schoolId: req.schoolId },
      { isLocked: false },
      { new: true }
    ).lean();

    return sendSuccess(res, 200, "Billing period unlocked successfully", period);
  } catch (error) {
    return serviceError(res, "unlockBillingPeriod error", { error: error.message, schoolId: req.schoolId });
  }
};

// DELETE
exports.deleteBillingPeriod = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: scope by schoolId
    const period = await BillingPeriod.findOne({ _id: id, schoolId: req.schoolId }).lean();
    if (!period) return sendError(res, 404, "Billing period not found");

    if (period.isActive)
      return sendError(res, 400, "Cannot delete an active billing period. Deactivate it first");
    if (period.isLocked)
      return sendError(res, 400, "Cannot delete a locked billing period. Unlock it first");

    await BillingPeriod.findOneAndDelete({ _id: id, schoolId: req.schoolId });
    return sendSuccess(res, 200, "Billing period deleted successfully");
  } catch (error) {
    return serviceError(res, "deleteBillingPeriod error", { error: error.message, schoolId: req.schoolId });
  }
};
