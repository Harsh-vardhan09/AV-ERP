const mongoose = require('mongoose');
const StudentFee = require('../../models/fee/StudentFee');
const ThreeInstallment = require('../../models/fee/ThreeInstallment');
const { FeeReceipt } = require('../../models/fee/FeeReceipt');

const sendError   = (res, status, msg)  => res.status(status).json({ success: false, message: msg });
const sendSuccess = (res, status, msg, data = null) => {
    const r = { success: true, message: msg };
    if (data !== null) r.data = data;
    return res.status(status).json(r);
};

// ─── GET /api/v1/three-installments/:studentFeeId ────────────────────────────
// Returns the 3 installment records with live OVERDUE status computed on-the-fly.

exports.getThreeInstallments = async (req, res) => {
    try {
        const { studentFeeId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentFeeId))
            return sendError(res, 400, 'Invalid studentFeeId');

        const installments = await ThreeInstallment.find({ studentFeeId })
            .sort({ installmentNo: 1 })
            .lean();

        const today = new Date();
        // Compute live OVERDUE status (run on fetch, not cron)
        const enriched = installments.map(inst => {
            let status = inst.status;
            if (status === 'UNPAID' && new Date(inst.dueDate) < today) {
                status = 'OVERDUE';
            }
            return { ...inst, status };
        });

        return sendSuccess(res, 200, 'Three installments fetched', enriched);
    } catch (error) {
        console.error('getThreeInstallments error:', error);
        return sendError(res, 500, 'Internal server error');
    }
};

// ─── POST /api/v1/three-installments/pay ─────────────────────────────────────
// Body: { installmentId, studentFeeId, paymentMode? }

exports.payThreeInstallment = async (req, res) => {
    try {
        const { installmentId, studentFeeId, paymentMode = 'CASH' } = req.body;

        if (!mongoose.Types.ObjectId.isValid(installmentId))
            return sendError(res, 400, 'Invalid installmentId');
        if (!mongoose.Types.ObjectId.isValid(studentFeeId))
            return sendError(res, 400, 'Invalid studentFeeId');

        const installment = await ThreeInstallment.findById(installmentId);
        if (!installment) return sendError(res, 404, 'Installment not found');

        // Verify it belongs to the correct studentFee
        if (installment.studentFeeId.toString() !== studentFeeId)
            return sendError(res, 403, 'This installment does not belong to the provided studentFeeId');

        if (installment.status === 'PAID')
            return sendError(res, 400, 'This installment is already paid');

        // Enforce sequential payment: can't pay #N if #(N-1) is unpaid/overdue
        if (installment.installmentNo > 1) {
            const prevInst = await ThreeInstallment.findOne({
                studentFeeId,
                installmentNo: installment.installmentNo - 1,
            }).lean();
            if (!prevInst || prevInst.status !== 'PAID')
                return sendError(
                    res, 400,
                    `Pay Installment ${installment.installmentNo - 1} first`
                );
        }

        const studentFee = await StudentFee.findById(studentFeeId);
        if (!studentFee) return sendError(res, 404, 'Student fee record not found');

        const receiptNo = await FeeReceipt.generateReceiptNo();

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // Mark installment as paid
            installment.status = 'PAID';
            installment.paidOn = new Date();
            installment.receiptNo = receiptNo;
            installment.paymentMode = paymentMode;
            await installment.save({ session });

            await FeeReceipt.create([{
                receiptNo,
                studentId:      installment.studentId,
                studentFeeId:   installment.studentFeeId,
                feeStructureId: installment.feeStructureId,
                amount:         installment.amount,
                paymentMode,
                paymentType:    'THREE_INSTALLMENT',
                referenceId:    installment._id,
                schoolId:       installment.schoolId,
            }], { session });

            // Update StudentFee totals
            studentFee.totalPaid += installment.amount;
            await studentFee.save({ session });

            await session.commitTransaction();
            session.endSession();

            // How many installments remain unpaid?
            const remaining = await ThreeInstallment.countDocuments({
                studentFeeId,
                status: { $ne: 'PAID' },
            });

            return sendSuccess(res, 200, `Installment ${installment.installmentNo} paid`, {
                receiptNo,
                installmentNo:         installment.installmentNo,
                amountPaid:            installment.amount,
                studentFeeStatus:      studentFee.status,
                remainingInstallments: remaining,
            });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            throw err;
        }
    } catch (error) {
        console.error('payThreeInstallment error:', error);
        return sendError(res, 500, 'Internal server error');
    }
};
