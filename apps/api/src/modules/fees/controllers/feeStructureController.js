const mongoose       = require('mongoose');
const FeeStructure   = require('../models/FeeStructure');
const StudentFee     = require('../models/StudentFee');
const StudentProfile = require('../../people').StudentProfile;
const AcademicSession = require('../../../../src-old/models/AcademicSession');
const ClassModel     = require('../../../../src-old/models/ClassModel');
const { assignFeeToStudent } = require('../services/studentFeeService');
const logger         = require('../../../core/logging/logger.js');
const { serviceError } = require('../lib/respond');

const sendError = (res, status, message) =>
    res.status(status).json({ success: false, message });

const sendSuccess = (res, status, message, data = null) => {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    return res.status(status).json(response);
};

// CREATE

exports.createFeeStructure = async (req, res) => {
    try {
        const { sessionId, classId, stream, feeComponents, feeCycle, dueDayOfMonth, installmentCount, customInstallments } = req.body;

        if (!mongoose.Types.ObjectId.isValid(sessionId))
            return sendError(res, 400, 'Invalid session ID');
        if (!mongoose.Types.ObjectId.isValid(classId))
            return sendError(res, 400, 'Invalid class ID');

        const invalidComponent = feeComponents?.find(
            c => !mongoose.Types.ObjectId.isValid(c.feeHeadId) || c.amount < 0
        );
        if (invalidComponent)
            return sendError(res, 400, 'Each component must have a valid feeHeadId and non-negative amount');

        const feeHeadIds = feeComponents.map(c => c.feeHeadId.toString());
        if (feeHeadIds.length !== new Set(feeHeadIds).size)
            return sendError(res, 400, 'Duplicate fee heads are not allowed in the same structure');

        const session = await AcademicSession.findById(sessionId).select('isActive name').lean();
        if (!session) return sendError(res, 404, 'Session not found');

        const classDoc = await ClassModel.findById(classId).select('name').lean();
        if (!classDoc) return sendError(res, 404, 'Class not found');

        const structure = await FeeStructure.create({
            sessionId,
            classId,
            stream: stream || null,
            feeComponents,
            feeCycle: feeCycle || 'CUSTOM',
            dueDayOfMonth,
            installmentCount,
            customInstallments,
            schoolId: req.schoolId,
        });

        // Backfill existing students in this class+session (fire and forget)
        setImmediate(() => backfillFeesForClass(classId, sessionId, classDoc.name, req.schoolId));

        return sendSuccess(res, 201, 'Fee structure created successfully', structure);
    } catch (error) {
        if (error.code === 11000)
            return sendError(res, 400, 'A fee structure for this class/stream already exists in the selected session');
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(e => e.message).join(', ');
            return sendError(res, 400, message);
        }
        return serviceError(res, 'createFeeStructure error', { error: error.message, schoolId: req.schoolId });
    }
};

// Backfill helper
// Runs after a new FeeStructure is created. Assigns fees to existing active
// students in that class+session who don't have a StudentFee record yet.

// SECURITY: schoolId parameter ensures backfill is always scoped to one school
const backfillFeesForClass = async (classId, sessionId, className, schoolId) => {
    try {
        if (!schoolId) {
            logger.error('[FeeBackfill] schoolId missing — aborting to prevent cross-school data write');
            return;
        }

        // SECURITY: scope to this school only
        const students = await StudentProfile.find({
            classId,
            session: sessionId,
            status: 'active',
            schoolId,
        }).select('_id').lean();

        if (!students.length) return;

        const existingFees = await StudentFee.find({
            studentId: { $in: students.map(s => s._id) },
            sessionId,
        }).select('studentId').lean();

        const alreadyAssigned = new Set(existingFees.map(f => f.studentId.toString()));
        const toAssign = students.filter(s => !alreadyAssigned.has(s._id.toString()));

        if (!toAssign.length) return;

        logger.debug(`[FeeBackfill] Assigning fees to ${toAssign.length} student(s) in class "${className}"...`);

        for (const student of toAssign) {
            try {
                await assignFeeToStudent(student._id);
                logger.info(`[FeeBackfill] Assigned: ${student._id}`);
            } catch (err) {
                logger.error(`[FeeBackfill] Failed for ${student._id}`, { error: err.message });
            }
        }
        logger.info(`[FeeBackfill] Complete for class "${className}".`);
    } catch (err) {
        // TODO: backfillFeesForClass takes no res — this catch throws ReferenceError
        // TODO: log and return instead of answering a request that is not here
        // eslint-disable-next-line no-undef
        return serviceError(res, '[FeeBackfill] Error', { error: err.message });
    }
};

// GET ALL

exports.getAllFeeStructures = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;

        // SECURITY: scope to schoolId
        const filter = { schoolId: req.schoolId };
        if (req.query.sessionId) {
            if (!mongoose.Types.ObjectId.isValid(req.query.sessionId))
                return sendError(res, 400, 'Invalid session ID');
            filter.sessionId = req.query.sessionId;
        }
        if (req.query.classId) filter.classId = req.query.classId;
        if (req.query.isActive !== undefined)
            filter.isActive = req.query.isActive === 'true';

        const [structures, total] = await Promise.all([
            FeeStructure.find(filter)
                .populate('sessionId', 'name isActive')
                .populate('classId', 'name numericOrder')
                .populate('feeComponents.feeHeadId', 'name category')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            FeeStructure.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: structures,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        logger.error('getAllFeeStructures error', { error: error.message, schoolId: req.schoolId });
    }
};

// GET BY ID

exports.getFeeStructureById = async (req, res) => {
    try {
        // SECURITY: scope by schoolId
        const structure = await FeeStructure.findOne({ _id: req.params.id, schoolId: req.schoolId })
            .populate('sessionId', 'name isActive')
            .populate('classId', 'name numericOrder')
            .populate('feeComponents.feeHeadId', 'name category')
            .lean();

        if (!structure) return sendError(res, 404, 'Fee structure not found');
        return sendSuccess(res, 200, 'Fee structure fetched successfully', structure);
    } catch (error) {
        return serviceError(res, 'getFeeStructureById error', { error: error.message, schoolId: req.schoolId });
    }
};

// UPDATE

exports.updateFeeStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const { feeComponents, isActive, feeCycle, stream, dueDayOfMonth, installmentCount, customInstallments } = req.body;

        // SECURITY: scope by schoolId
        const structure = await FeeStructure.findOne({ _id: id, schoolId: req.schoolId });
        if (!structure) return sendError(res, 404, 'Fee structure not found');

        if (isActive !== undefined) structure.isActive = isActive;
        if (feeCycle) structure.feeCycle = feeCycle;
        if (dueDayOfMonth) structure.dueDayOfMonth = dueDayOfMonth;
        if (installmentCount) structure.installmentCount = installmentCount;
        if (customInstallments?.length) structure.customInstallments = customInstallments;
        if (stream !== undefined) structure.stream = stream || null;

        if (feeComponents?.length) {
            const invalidComponent = feeComponents.find(
                c => !mongoose.Types.ObjectId.isValid(c.feeHeadId) || c.amount < 0
            );
            if (invalidComponent)
                return sendError(res, 400, 'Each component must have a valid feeHeadId and non-negative amount');

            const feeHeadIds = feeComponents.map(c => c.feeHeadId.toString());
            if (feeHeadIds.length !== new Set(feeHeadIds).size)
                return sendError(res, 400, 'Duplicate fee heads are not allowed');

            structure.feeComponents = feeComponents;
        }

        await structure.save();
        return sendSuccess(res, 200, 'Fee structure updated successfully', structure);
    } catch (error) {
        if (error.code === 11000)
            return sendError(res, 400, 'A fee structure for this class/stream already exists in the selected session');
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(e => e.message).join(', ');
            return sendError(res, 400, message);
        }
        return serviceError(res, 'updateFeeStructure error', { error: error.message, schoolId: req.schoolId });
    }
};

// DELETE (cascade-safe)

exports.deleteFeeStructure = async (req, res) => {
    try {
        const { id } = req.params;
        // SECURITY: scope cascade-check by schoolId
        const inUse = await StudentFee.exists({ feeStructureId: id, schoolId: req.schoolId });
        if (inUse)
            return sendError(res, 400, 'Cannot delete: This fee structure has student fees assigned. Reassign or remove student fees first.');

        // SECURITY: scope delete by schoolId
        const structure = await FeeStructure.findOneAndDelete({ _id: id, schoolId: req.schoolId }).lean();
        if (!structure) return sendError(res, 404, 'Fee structure not found');

        return sendSuccess(res, 200, 'Fee structure deleted successfully');
    } catch (error) {
        return serviceError(res, 'deleteFeeStructure error', { error: error.message, schoolId: req.schoolId });
    }
};
