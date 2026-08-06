const mongoose = require("mongoose");
const Payment = require("../../models/fee/Payment");
const AccountFee = require("../../models/fee/AccountFee");
const Installment = require("../../models/fee/Installment");
const Refund = require("../../models/fee/Refund");
const LedgerEntry = require("../../models/fee/LedgerEntry");
const { round } = require("../../../src/shared/helpers.js");

// ─── Optional Event Hooks ──────────────────────────────────────────────────────
//
// The host system can inject notification / audit callbacks without this service
// needing to import User or any notification system.
//
// Usage in host app:
//   refundService.setHooks({
//     onRefundRequested: async ({ refund, payment }) => { ... },
//     onRefundApproved:  async ({ refund }) => { ... },
//     onRefundProcessed: async ({ refund, accountFeeId }) => { ... },
//   });

let _hooks = {};

exports.setHooks = (hooks) => {
    _hooks = hooks || {};
};

// Fire-and-forget hook helper — errors are logged but never propagate to caller
const fireHook = async (name, payload) => {
    if (typeof _hooks[name] !== "function") return;
    try {
        await _hooks[name](payload);
    } catch (err) {
        console.error(`refundService hook "${name}" error:`, err);
    }
};

// ─── REQUEST REFUND ───────────────────────────────────────────────────────────
//
// Rules:
//  - Payment must exist and belong to the stated accountFeeId
//  - Refund amount must not exceed original payment amount
//  - Only one active (requested/approved) refund per payment at a time
//  - Creates Refund doc with status "requested"
//  - Fires onRefundRequested hook (host system handles notifications)

exports.requestRefund = async ({ paymentId, accountFeeId, amount, reason, requestedBy }) => {

    if (!mongoose.Types.ObjectId.isValid(paymentId))
        throw new Error("Invalid paymentId");

    if (!mongoose.Types.ObjectId.isValid(accountFeeId))
        throw new Error("Invalid accountFeeId");

    if (!amount || amount <= 0)
        throw new Error("Refund amount must be greater than zero");

    const payment = await Payment.findOne({
        _id: paymentId,
        studentFeeId: accountFeeId,
    }).lean();

    if (!payment)
        throw new Error("Payment not found or does not belong to this account fee");

    const refundAmount = round(amount);

    if (refundAmount > round(payment.amount))
        throw new Error(
            `Refund amount ${refundAmount} exceeds original payment amount ${payment.amount}`
        );

    // Prevent duplicate active refund for same payment
    const existingActive = await Refund.findOne({
        paymentId,
        status: { $in: ["requested", "approved"] },
    }).lean();

    if (existingActive)
        throw new Error(
            "A refund for this payment is already in progress (status: " +
            existingActive.status + ")"
        );

    const refund = await Refund.create({
        paymentId,
        studentFeeId: accountFeeId,
        amount: refundAmount,
        reason,
        requestedBy,
        status: "requested",
    });

    // Fire hook — non-blocking, host handles notifications
    fireHook("onRefundRequested", { refund, payment }).catch(() => { });

    return refund;
};

// ─── APPROVE REFUND ───────────────────────────────────────────────────────────

exports.approveRefund = async ({ refundId, approvedBy }) => {

    if (!mongoose.Types.ObjectId.isValid(refundId))
        throw new Error("Invalid refundId");

    const refund = await Refund.findById(refundId);

    if (!refund)
        throw new Error("Refund not found");

    if (refund.status !== "requested")
        throw new Error(`Cannot approve a refund with status: ${refund.status}`);

    refund.status = "approved";
    refund.approvedBy = approvedBy;
    await refund.save();

    fireHook("onRefundApproved", { refund }).catch(() => { });

    return refund;
};

// ─── REJECT REFUND ────────────────────────────────────────────────────────────

exports.rejectRefund = async ({ refundId, approvedBy, reason }) => {

    if (!mongoose.Types.ObjectId.isValid(refundId))
        throw new Error("Invalid refundId");

    const refund = await Refund.findById(refundId);

    if (!refund)
        throw new Error("Refund not found");

    if (refund.status !== "requested")
        throw new Error(`Cannot reject a refund with status: ${refund.status}`);

    refund.status = "rejected";
    refund.approvedBy = approvedBy;
    refund.rejectionReason = reason || "No reason provided";
    await refund.save();

    return refund;
};

// ─── PROCESS REFUND ───────────────────────────────────────────────────────────
//
// Moves an "approved" refund to "processed".
// Transaction steps (atomic):
//  1. Verify refund is still "approved"
//  2. Create LedgerEntry debit (reversal)
//  3. Decrement AccountFee.totalPaid, increment AccountFee.totalDue
//  4. Re-open affected installments (newest-first, proportional)
//  5. Mark refund as processed
//  6. Fire onRefundProcessed hook

exports.processRefund = async ({ refundId }) => {

    if (!mongoose.Types.ObjectId.isValid(refundId))
        throw new Error("Invalid refundId");

    const dbSession = await mongoose.startSession();
    let processedRefund;

    try {
        const result = await dbSession.withTransaction(async () => {

            // 1. Lock and verify refund
            const refund = await Refund.findById(refundId).session(dbSession);

            if (!refund) throw new Error("Refund not found");
            if (refund.status !== "approved")
                throw new Error(`Cannot process refund with status: ${refund.status}`);

            const refundAmount = round(refund.amount);

            // 2. Verify original payment
            const payment = await Payment.findById(refund.paymentId).session(dbSession).lean();
            if (!payment) throw new Error("Original payment not found — cannot process refund");

            // 3. Verify AccountFee
            const accountFee = await AccountFee.findById(refund.studentFeeId).session(dbSession);
            if (!accountFee) throw new Error("Account fee record not found");

            // 4. Compute new totals
            const newTotalPaid = round(Math.max(0, accountFee.totalPaid - refundAmount));
            const newTotalDue = round(accountFee.totalDue + refundAmount);

            const newStatus =
                newTotalPaid <= 0 ? "pending" :
                    newTotalPaid >= accountFee.totalAssigned ? "paid" :
                        "partial";

            // 5. Reverse installments (newest-first)
            const paidInstallments = await Installment.find({
                studentFeeId: refund.studentFeeId,
                status: { $in: ["paid", "partial"] },
            })
                .sort({ installmentNo: -1 })
                .session(dbSession);

            let remaining = refundAmount;
            const bulkOps = [];
            let fineAmountToReverse = 0;

            for (const inst of paidInstallments) {
                if (remaining <= 0) break;

                const paidOnInst = round(inst.paidAmount || 0);
                if (paidOnInst <= 0) continue;

                if (remaining >= paidOnInst) {
                    fineAmountToReverse = round(fineAmountToReverse + (inst.fineAmount || 0));
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: inst._id },
                            update: {
                                $set: {
                                    status: "pending",
                                    paidAmount: 0,
                                    remainingAmount: inst.amount,
                                    fineAmount: 0,
                                },
                            },
                        },
                    });
                    remaining = round(remaining - paidOnInst);
                } else {
                    const newPaidAmt = round(paidOnInst - remaining);
                    const newRemainingAmt = round(inst.amount - newPaidAmt);
                    const fineOnInst = round(inst.fineAmount || 0);
                    const proportionalFineReversed = fineOnInst > 0
                        ? round((remaining / paidOnInst) * fineOnInst)
                        : 0;
                    fineAmountToReverse = round(fineAmountToReverse + proportionalFineReversed);
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: inst._id },
                            update: {
                                $set: {
                                    status: newPaidAmt > 0 ? "partial" : "pending",
                                    paidAmount: newPaidAmt,
                                    remainingAmount: newRemainingAmt,
                                    fineAmount: round(fineOnInst - proportionalFineReversed),
                                },
                            },
                        },
                    });
                    remaining = 0;
                }
            }

            if (bulkOps.length > 0) {
                await Installment.bulkWrite(bulkOps, { session: dbSession });
            }

            // 6. Update AccountFee
            const newTotalFine = round(Math.max(0, (accountFee.totalFine || 0) - fineAmountToReverse));

            await AccountFee.findByIdAndUpdate(
                refund.studentFeeId,
                {
                    $set: {
                        totalPaid: newTotalPaid,
                        totalDue: newTotalDue,
                        totalFine: newTotalFine,
                        status: newStatus,
                    },
                },
                { session: dbSession }
            );

            // 7. Create ledger debit (reversal)
            await LedgerEntry.create(
                [{
                    studentFeeId: refund.studentFeeId,
                    type: "debit",
                    amount: refundAmount,
                    fineAmount: 0,
                    referenceId: refund._id,
                    referenceModel: "Refund",
                    balance: newTotalDue,
                    description: `Refund of ${refundAmount} processed. Original payment: ${payment.receiptNumber}`,
                }],
                { session: dbSession }
            );

            // 8. Mark processed
            refund.status = "processed";
            refund.processedAt = new Date();
            await refund.save({ session: dbSession });

            processedRefund = refund;

            return { refund, newTotalPaid, newTotalDue, newStatus };
        });

        // Fire hook — non-blocking
        fireHook("onRefundProcessed", {
            refund: processedRefund,
            accountFeeId: processedRefund.studentFeeId,
        }).catch(() => { });

        return result;

    } finally {
        dbSession.endSession();
    }
};

// ─── GET REFUNDS BY PAYMENT ───────────────────────────────────────────────────

exports.getRefundsByPayment = async (paymentId) => {

    if (!mongoose.Types.ObjectId.isValid(paymentId))
        throw new Error("Invalid paymentId");

    return Refund.find({ paymentId })
        .sort({ createdAt: -1 })
        .lean();
};

// ─── GET REFUNDS BY ACCOUNT FEE ──────────────────────────────────────────────

exports.getRefundsByAccountFee = async (accountFeeId, filters = {}) => {

    if (!mongoose.Types.ObjectId.isValid(accountFeeId))
        throw new Error("Invalid accountFeeId");

    const query = { studentFeeId: accountFeeId };

    if (filters.status) {
        const validStatuses = ["requested", "approved", "rejected", "processed"];
        if (!validStatuses.includes(filters.status))
            throw new Error(`status must be one of: ${validStatuses.join(", ")}`);
        query.status = filters.status;
    }

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, parseInt(filters.limit) || 20);
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
        Refund.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Refund.countDocuments(query),
    ]);

    return {
        refunds,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};
