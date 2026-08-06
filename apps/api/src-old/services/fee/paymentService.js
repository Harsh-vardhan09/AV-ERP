const mongoose = require("mongoose");
const AccountFee = require("../../models/fee/AccountFee");
const Installment = require("../../models/fee/Installment");
const Payment = require("../../models/fee/Payment");
const Ledger = require("../../models/fee/LedgerEntry");
const { calculateFine } = require("../../utils/fee/fineCalculator");
const { round, generateReceiptNumber } = require("../../../src/shared/helpers.js");
const config = require("../../config/feeConfig");

const VALID_METHODS = config.payment.validMethods;

// ─── PROCESS PAYMENT ──────────────────────────────────────────────────────────
//
// Accepts accountFeeId (was studentFeeId) — fully generic.
// All school-ERP references removed.
// Transaction: installments → AccountFee → Payment → Ledger

exports.processPayment = async (
    accountFeeId,
    amount,
    method = "cash",
    note = "",
    idempotencyKey = null
) => {

    if (!mongoose.Types.ObjectId.isValid(accountFeeId))
        throw new Error("Invalid account fee ID");

    if (!amount || amount <= 0)
        throw new Error("Payment amount must be greater than zero");

    if (!VALID_METHODS.includes(method))
        throw new Error(`Invalid payment method. Use: ${VALID_METHODS.join(", ")}`);

    // ─── Idempotency Check ────────────────────────────────────────────────────
    if (idempotencyKey) {
        const existingPayment = await Payment.findOne({ idempotencyKey }).lean();
        if (existingPayment) {
            const existingFee = await AccountFee.findById(accountFeeId).lean();
            return {
                payment: existingPayment,
                idempotent: true,
                summary: {
                    totalPaid: existingFee?.totalPaid ?? 0,
                    totalDue: existingFee?.totalDue ?? 0,
                    totalFine: existingFee?.totalFine ?? 0,
                    status: existingFee?.status ?? "pending",
                },
            };
        }
    }

    const dbSession = await mongoose.startSession();

    try {
        const result = await dbSession.withTransaction(async () => {

            const [accountFee, pendingInstallments] = await Promise.all([
                AccountFee.findById(accountFeeId).session(dbSession),
                Installment.find({
                    studentFeeId: accountFeeId,
                    status: { $ne: "paid" },
                })
                    .sort({ installmentNo: 1, dueDate: 1 })
                    .session(dbSession),
            ]);

            if (!accountFee) throw new Error("Account fee record not found");
            if (accountFee.totalDue <= 0) throw new Error("No outstanding due amount for this account");

            const roundedAmount = round(amount);

            if (roundedAmount > round(accountFee.totalDue))
                throw new Error(
                    `Payment ${roundedAmount} exceeds due amount ${round(accountFee.totalDue)}`
                );

            // ─── Settle Installments ──────────────────────────────────────────
            let remaining = roundedAmount;
            let totalFineThisPayment = 0;
            const bulkOps = [];
            const settledInstallmentIds = [];

            for (const installment of pendingInstallments) {
                if (remaining <= 0) break;

                const fine = round(calculateFine(installment.dueDate));
                const effectiveDue = round(installment.amount + fine);

                settledInstallmentIds.push(installment._id);

                if (remaining >= effectiveDue) {
                    // Full payment for this installment
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: installment._id },
                            update: {
                                $set: {
                                    status: "paid",
                                    paidAmount: round((installment.paidAmount || 0) + effectiveDue),
                                    remainingAmount: 0,
                                    fineAmount: fine,
                                },
                            },
                        },
                    });
                    remaining = round(remaining - effectiveDue);
                    totalFineThisPayment = round(totalFineThisPayment + fine);

                } else {
                    // Partial payment for this installment
                    const proportionalFine = round(fine > 0 ? (remaining / effectiveDue) * fine : 0);

                    bulkOps.push({
                        updateOne: {
                            filter: { _id: installment._id },
                            update: {
                                $set: {
                                    status: "partial",
                                    paidAmount: round((installment.paidAmount || 0) + remaining),
                                    remainingAmount: round(effectiveDue - remaining),
                                    fineAmount: round((installment.fineAmount || 0) + proportionalFine),
                                },
                            },
                        },
                    });
                    totalFineThisPayment = round(totalFineThisPayment + proportionalFine);
                    remaining = 0;
                }
            }

            if (bulkOps.length > 0) {
                await Installment.bulkWrite(bulkOps, { session: dbSession });
            }

            // ─── Update AccountFee ────────────────────────────────────────────
            const newTotalPaid = round(accountFee.totalPaid + roundedAmount);
            const newTotalDue = round(accountFee.totalDue - roundedAmount);
            const newTotalFine = round((accountFee.totalFine || 0) + totalFineThisPayment);
            const newStatus =
                newTotalDue <= 0 ? "paid" :
                    newTotalPaid > 0 ? "partial" : "pending";

            await AccountFee.findByIdAndUpdate(
                accountFeeId,
                {
                    $set: {
                        totalPaid: newTotalPaid,
                        totalDue: Math.max(0, newTotalDue),
                        totalFine: newTotalFine,
                        status: newStatus,
                    },
                },
                { session: dbSession }
            );

            // ─── Create Payment Record ────────────────────────────────────────
            let payment = null;
            let attempts = 0;

            while (!payment && attempts < 3) {
                try {
                    [payment] = await Payment.create(
                        [{
                            studentFeeId: accountFeeId,
                            installmentIds: settledInstallmentIds,
                            amount: roundedAmount,
                            fineAmount: totalFineThisPayment,
                            receiptNumber: generateReceiptNumber(),
                            method,
                            note,
                            ...(idempotencyKey && { idempotencyKey }),
                        }],
                        { session: dbSession }
                    );
                } catch (err) {
                    if (err.code === 11000 && err.keyPattern?.receiptNumber) {
                        attempts++;
                    } else {
                        throw err;
                    }
                }
            }

            if (!payment)
                throw new Error("Failed to generate unique receipt number. Please retry.");

            // ─── Create Ledger Entry ──────────────────────────────────────────
            await Ledger.create(
                [{
                    studentFeeId: accountFeeId,
                    type: "credit",
                    amount: roundedAmount,
                    fineAmount: totalFineThisPayment,
                    referenceId: payment._id,
                    referenceModel: "Payment",
                    balance: Math.max(0, newTotalDue),
                    description: `Fee payment received via ${method.toUpperCase()}. Receipt: ${payment.receiptNumber}`,
                }],
                { session: dbSession }
            );

            return {
                payment,
                idempotent: false,
                summary: {
                    totalPaid: newTotalPaid,
                    totalDue: Math.max(0, newTotalDue),
                    totalFine: newTotalFine,
                    status: newStatus,
                    installmentsSettled: settledInstallmentIds.length,
                },
            };

        });

        return result;

    } finally {
        dbSession.endSession();
    }
};

// ─── GET PAYMENTS BY ACCOUNT FEE ─────────────────────────────────────────────

exports.getPaymentsByAccountFee = async (accountFeeId, filters = {}) => {

    if (!mongoose.Types.ObjectId.isValid(accountFeeId))
        throw new Error("Invalid account fee ID");

    const query = { studentFeeId: accountFeeId };

    if (filters.method) {
        if (!VALID_METHODS.includes(filters.method))
            throw new Error(`method must be one of: ${VALID_METHODS.join(", ")}`);
        query.method = filters.method;
    }

    if (filters.from || filters.to) {
        query.createdAt = {};
        if (filters.from) {
            if (isNaN(new Date(filters.from))) throw new Error("Invalid from date");
            query.createdAt.$gte = new Date(filters.from);
        }
        if (filters.to) {
            if (isNaN(new Date(filters.to))) throw new Error("Invalid to date");
            query.createdAt.$lte = new Date(filters.to);
        }
    }

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, parseInt(filters.limit) || 20);
    const skip = (page - 1) * limit;

    const [payments, total, summary] = await Promise.all([
        Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Payment.countDocuments(query),
        Payment.aggregate([
            { $match: { studentFeeId: new mongoose.Types.ObjectId(accountFeeId) } },
            {
                $group: {
                    _id: null,
                    totalAmountPaid: { $sum: "$amount" },
                    totalFineCharged: { $sum: "$fineAmount" },
                    totalTransactions: { $sum: 1 },
                    avgPayment: { $avg: "$amount" },
                    cashTotal: { $sum: { $cond: [{ $eq: ["$method", "cash"] }, "$amount", 0] } },
                    onlineTotal: { $sum: { $cond: [{ $eq: ["$method", "online"] }, "$amount", 0] } },
                    chequeTotal: { $sum: { $cond: [{ $eq: ["$method", "cheque"] }, "$amount", 0] } },
                    bankTotal: { $sum: { $cond: [{ $eq: ["$method", "bank_transfer"] }, "$amount", 0] } },
                },
            },
        ]),
    ]);

    if (!payments.length)
        throw new Error("No payments found for this account fee");

    const stats = summary[0] || {
        totalAmountPaid: 0,
        totalFineCharged: 0,
        totalTransactions: 0,
        avgPayment: 0,
        cashTotal: 0,
        onlineTotal: 0,
        chequeTotal: 0,
        bankTotal: 0,
    };

    return {
        payments,
        summary: {
            totalAmountPaid: stats.totalAmountPaid,
            totalFineCharged: stats.totalFineCharged,
            totalTransactions: stats.totalTransactions,
            avgPayment: round(stats.avgPayment),
            byMethod: {
                cash: stats.cashTotal,
                online: stats.onlineTotal,
                cheque: stats.chequeTotal,
                bank_transfer: stats.bankTotal,
            },
        },
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};