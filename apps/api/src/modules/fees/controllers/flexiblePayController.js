const mongoose = require('mongoose');
const StudentFee = require('../models/StudentFee');
const FeeTransaction = require('../models/FeeTransaction');
const { FeeReceipt } = require('../models/FeeReceipt');
const { serviceError } = require('../lib/respond');

const sendError   = (res, status, msg)  => res.status(status).json({ success: false, message: msg });
const sendSuccess = (res, status, msg, data = null) => {
    const r = { success: true, message: msg };
    if (data !== null) r.data = data;
    return res.status(status).json(r);
};

// POST /api/v1/flexible-pay
// Body: { studentFeeId, amount, paymentMode?, note? }

exports.flexiblePay = async (req, res) => {
    try {
        const { studentFeeId, amount, paymentMode = 'CASH', note } = req.body;

        if (!mongoose.Types.ObjectId.isValid(studentFeeId))
            return sendError(res, 400, 'Invalid studentFeeId');

        const parsedAmount = Number(amount);
        if (!parsedAmount || parsedAmount < 1)
            return sendError(res, 400, 'Amount must be at least ₹1');

        const studentFee = await StudentFee.findById(studentFeeId);
        if (!studentFee) return sendError(res, 404, 'Student fee record not found');

        const remaining = Math.max(0, studentFee.totalAssigned - studentFee.totalPaid);
        if (remaining <= 0)
            return sendError(res, 400, 'Fee is already fully paid');
        if (parsedAmount > remaining)
            return sendError(res, 400, `Amount exceeds remaining balance of ₹${remaining}`);

        // Generate receipt
        const receiptNo = await FeeReceipt.generateReceiptNo();

        // Create transaction (session for atomicity)
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const [transaction] = await FeeTransaction.create([{
                studentId:      studentFee.studentId,
                studentFeeId:   studentFee._id,
                feeStructureId: studentFee.feeStructureId,
                amountPaid:     parsedAmount,
                paymentMode,
                receiptNo,
                schoolId:       studentFee.schoolId,
                note,
            }], { session });

            await FeeReceipt.create([{
                receiptNo,
                studentId:      studentFee.studentId,
                studentFeeId:   studentFee._id,
                feeStructureId: studentFee.feeStructureId,
                amount:         parsedAmount,
                paymentMode,
                paymentType:    'FLEXIBLE',
                referenceId:    transaction._id,
                schoolId:       studentFee.schoolId,
                note,
            }], { session });

            // Update totals
            studentFee.totalPaid += parsedAmount;
            await studentFee.save({ session });

            await session.commitTransaction();
            session.endSession();

            const newRemaining = Math.max(0, studentFee.totalAssigned - studentFee.totalPaid);
            return sendSuccess(res, 201, 'Payment recorded successfully', {
                receiptNo,
                amountPaid:       parsedAmount,
                totalPaid:        studentFee.totalPaid,
                remaining:        newRemaining,
                status:           studentFee.status,
                transactionId:    transaction._id,
            });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    } catch (error) {
        return serviceError(res, 'flexiblePay error:', error);
    }
};

// GET /api/v1/flexible-pay/history/:studentFeeId

exports.getFlexibleHistory = async (req, res) => {
    try {
        const { studentFeeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentFeeId))
            return sendError(res, 400, 'Invalid studentFeeId');

        const studentFee = await StudentFee.findById(studentFeeId).lean();
        if (!studentFee) return sendError(res, 404, 'Student fee record not found');

        const transactions = await FeeTransaction.find({ studentFeeId })
            .sort({ createdAt: -1 })
            .lean();

        const totalPaid = transactions.reduce((sum, t) => sum + t.amountPaid, 0);
        const remaining = Math.max(0, studentFee.totalAssigned - totalPaid);

        return sendSuccess(res, 200, 'Flexible payment history fetched', {
            totalFee:     studentFee.totalAssigned,
            totalPaid,
            remaining,
            status:       studentFee.status,
            transactions,
        });
    } catch (error) {
        return serviceError(res, 'getFlexibleHistory error:', error);
    }
};
