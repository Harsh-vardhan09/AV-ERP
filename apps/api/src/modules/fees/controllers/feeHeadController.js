const FeeHead     = require('../models/FeeHead');
const FeeStructure = require('../models/FeeStructure');
const logger       = require('../../../core/logging/logger.js');
const { serviceError } = require('../lib/respond');

const sendError = (res, status, message) =>
    res.status(status).json({ success: false, message });

const sendSuccess = (res, status, message, data = null) => {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    return res.status(status).json(response);
};

const ALLOWED_UPDATES = ['name', 'category', 'description', 'isActive'];

// CREATE

exports.createFeeHead = async (req, res) => {
    try {
        // SECURITY: Ensure schoolId is present
        if (!req.schoolId) {
            logger.error('createFeeHead: Missing schoolId in request');
            return sendError(res, 400, 'Authentication required: Missing school context');
        }
        
        const { name, category, description } = req.body;
        
        // DEBUG: Log incoming request
        logger.info('Creating FeeHead', { body: req.body, schoolId: req.schoolId });
        
        // SECURITY: stamp schoolId on creation
        const feeHead = await FeeHead.create({ name, category, description, schoolId: req.schoolId });
        logger.info('FeeHead created successfully', { id: feeHead._id, name: feeHead.name, schoolId: req.schoolId });
        return sendSuccess(res, 201, 'Fee head created successfully', feeHead);
    } catch (error) {
        if (error.code === 11000)
            return sendError(res, 400, 'Fee head with this name already exists in your school');
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(e => e.message).join(', ');
            return serviceError(res, 'createFeeHead validation error', { message, schoolId: req.schoolId });
            return sendError(res, 400, message);
        }
        logger.error('createFeeHead error', { error: error.message, stack: error.stack, schoolId: req.schoolId });
    }
};

// GET ALL

exports.getAllFeeHeads = async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const skip  = (page - 1) * limit;

        // SECURITY: scope to schoolId
        const filter = { schoolId: req.schoolId };
        if (req.query.category) filter.category = req.query.category;
        if (req.query.isActive !== undefined)
            filter.isActive = req.query.isActive === 'true';

        const [feeHeads, total] = await Promise.all([
            FeeHead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            FeeHead.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: feeHeads,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return serviceError(res, 'getAllFeeHeads error', { error: error.message, schoolId: req.schoolId });
    }
};

// UPDATE

exports.updateFeeHead = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = {};
        ALLOWED_UPDATES.forEach(key => {
            if (req.body[key] !== undefined) updates[key] = req.body[key];
        });
        if (Object.keys(updates).length === 0)
            return sendError(res, 400, `No valid fields. Allowed: ${ALLOWED_UPDATES.join(', ')}`);

        // SECURITY: scope by schoolId
        const feeHead = await FeeHead.findOneAndUpdate(
            { _id: id, schoolId: req.schoolId },
            updates,
            { new: true, runValidators: true }
        ).lean();
        if (!feeHead) return sendError(res, 404, 'Fee head not found');

        return sendSuccess(res, 200, 'Fee head updated successfully', feeHead);
    } catch (error) {
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(e => e.message).join(', ');
            return sendError(res, 400, message);
        }
        if (error.code === 11000) return sendError(res, 400, 'Fee head with this name already exists in your school');
        return serviceError(res, 'updateFeeHead error', { error: error.message, schoolId: req.schoolId });
    }
};

// DELETE (cascade-safe)

exports.deleteFeeHead = async (req, res) => {
    try {
        const { id } = req.params;
        // SECURITY: scope cascade-check by schoolId too
        const inUse = await FeeStructure.exists({ 'feeComponents.feeHeadId': id, schoolId: req.schoolId });
        if (inUse)
            return sendError(res, 400, 'Cannot delete: This fee head is used in one or more fee structures. Remove it from those structures first.');

        // SECURITY: scope delete by schoolId
        const feeHead = await FeeHead.findOneAndDelete({ _id: id, schoolId: req.schoolId }).lean();
        if (!feeHead) return sendError(res, 404, 'Fee head not found');

        return sendSuccess(res, 200, 'Fee head deleted successfully');
    } catch (error) {
        return serviceError(res, 'deleteFeeHead error', { error: error.message, schoolId: req.schoolId });
    }
};
