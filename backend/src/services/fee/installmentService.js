const mongoose = require("mongoose");
const Installment = require("../../models/fee/Installment");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round = (val) => Math.round(val * 100) / 100;

// ─── GET INSTALLMENTS BY STUDENT FEE ─────────────────────────────────────────

exports.getInstallmentsByStudentFee = async (studentFeeId, filters = {}) => {

    // Validate before DB hit
    if (!mongoose.Types.ObjectId.isValid(studentFeeId))
        throw new Error("Invalid student fee ID");

    // Build filter — base + optional status filter
    const query = { studentFeeId };

    if (filters.status) {
        const validStatuses = ["pending", "partial", "paid"];
        if (!validStatuses.includes(filters.status))
            throw new Error(`status must be one of: ${validStatuses.join(", ")}`);
        query.status = filters.status;
    }

    const installments = await Installment.find(query)
        .sort({ installmentNo: 1 }) // consistent order
        .lean();                     // plain JS — faster reads

    if (!installments.length)
        throw new Error("No installments found for this student fee");

    // Compute summary stats — useful for caller (controller/receipt)
    const summary = installments.reduce(
        (acc, inst) => {
            acc.totalAmount = round(acc.totalAmount + inst.amount);
            acc.totalPaid = round(acc.totalPaid + (inst.paidAmount || 0));
            acc.totalFine = round(acc.totalFine + (inst.fineAmount || 0));
            acc.totalDue = round(acc.totalDue + inst.amount);

            // count by status
            acc.statusCount[inst.status] = (acc.statusCount[inst.status] || 0) + 1;

            return acc;
        },
        {
            totalAmount: 0,
            totalPaid: 0,
            totalFine: 0,
            totalDue: 0,
            statusCount: {},  // e.g. { paid: 2, partial: 1, pending: 1 }
        }
    );

    // Overall status derived from counts
    const total = installments.length;
    const paid = summary.statusCount.paid || 0;
    const partial = summary.statusCount.partial || 0;

    summary.overallStatus =
        paid === total ? "fully_paid" :
            paid > 0 || partial > 0 ? "partially_paid" : "unpaid";

    return {
        installments,
        summary,
    };
};

const { calculateFine } = require("../../utils/fee/fineCalculator");


// ─── GET INSTALLMENTS BY STUDENT ──────────────────────────────────────────────

exports.getInstallmentsByStudent = async (studentFeeId, filters = {}) => {

    // Validate before DB hit
    if (!mongoose.Types.ObjectId.isValid(studentFeeId))
        throw new Error("Invalid studentFeeId");

    // Build query with optional filters
    const query = { studentFeeId };

    if (filters.status) {
        const validStatuses = ["pending", "partial", "paid"];
        if (!validStatuses.includes(filters.status))
            throw new Error(`status must be one of: ${validStatuses.join(", ")}`);
        query.status = filters.status;
    }

    // Optional date range on dueDate
    if (filters.from || filters.to) {
        query.dueDate = {};
        if (filters.from) {
            if (isNaN(new Date(filters.from)))
                throw new Error("Invalid from date");
            query.dueDate.$gte = new Date(filters.from);
        }
        if (filters.to) {
            if (isNaN(new Date(filters.to)))
                throw new Error("Invalid to date");
            query.dueDate.$lte = new Date(filters.to);
        }
    }

    // Pagination
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, parseInt(filters.limit) || 20);
    const skip = (page - 1) * limit;

    // Parallel fetch — installments + count
    const [installments, total] = await Promise.all([
        Installment.find(query)
            .sort({ installmentNo: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Installment.countDocuments(query),
    ]);

    if (!installments.length)
        throw new Error("No installments found for this student");

    // Enrich each installment with live fine calculation
    const enriched = installments.map(inst => {
        const currentFine = inst.status !== "paid"
            ? round(calculateFine(inst.dueDate))  // ✅ only calculate for unpaid
            : 0;

        return {
            ...inst,
            currentFine,                                    // live fine at this moment
            totalPayable: round(inst.amount + currentFine), // amount + fine
            isOverdue: currentFine > 0,                  // quick overdue flag
        };
    });

    // Summary stats across all installments
    const summary = enriched.reduce(
        (acc, inst) => {
            acc.totalAmount = round(acc.totalAmount + inst.amount);
            acc.totalPaid = round(acc.totalPaid + (inst.paidAmount || 0));
            acc.totalFine = round(acc.totalFine + (inst.currentFine || 0));
            acc.totalPayable = round(acc.totalPayable + inst.totalPayable);
            acc.statusCount[inst.status] = (acc.statusCount[inst.status] || 0) + 1;
            return acc;
        },
        {
            totalAmount: 0,
            totalPaid: 0,
            totalFine: 0,
            totalPayable: 0,
            statusCount: {},
        }
    );

    // Overall status derived from counts
    const totalCount = installments.length;
    const paidCount = summary.statusCount.paid || 0;

    summary.overallStatus =
        paidCount === totalCount ? "fully_paid" :
            paidCount > 0 ? "partially_paid" : "unpaid";

    summary.overdueCount = enriched.filter(i => i.isOverdue).length; // overdue count

    return {
        installments: enriched,
        summary,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};