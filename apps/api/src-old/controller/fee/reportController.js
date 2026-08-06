const mongoose = require("mongoose");
const AccountFee = require("../../models/fee/AccountFee");
const StudentFee = require("../../models/fee/StudentFee");
const FeeStructure = require("../../models/fee/FeeStructure");
const Payment = require("../../models/fee/Payment");
const { sendError } = require("../../../src/shared/helpers.js");
const config = require("../../config/feeConfig");

const VALID_METHODS = config.payment.validMethods;

const startOfDay = (d) => { const date = new Date(d); date.setHours(0, 0, 0, 0); return date; };
const endOfDay = (d) => { const date = new Date(d); date.setHours(23, 59, 59, 999); return date; };

// ─── GET PENDING ACCOUNTS ─────────────────────────────────────────────────────
//
// GET /api/fee/reports/pending
// ?cohortKey=:key &billingPeriodId=:id &minDue=:n &page=:n &limit=:n
//
// Returns all AccountFee + StudentFee records with outstanding balance.
// No User model required — returns accountHolderId, host resolves display.

exports.getPendingAccounts = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;

        // SECURITY: scope to current school
        // AccountFee has no schoolId field — filter via BillingPeriod which does
        const schoolBillingPeriods = await require('../../models/fee/BillingPeriod')
            .find({ schoolId: req.schoolId }).select('_id').lean();
        const schoolBillingPeriodIds = schoolBillingPeriods.map(b => b._id);

        const filter = { totalDue: { $gt: 0 }, billingPeriodId: { $in: schoolBillingPeriodIds } };

        // Filter by cohortKey — resolve via FeeStructure scoped to this school
        if (req.query.cohortKey) {
            const structures = await FeeStructure
                .find({ cohortKey: req.query.cohortKey.trim(), schoolId: req.schoolId })
                .select("_id").lean();
            if (!structures.length) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    stats: { totalOutstanding: 0, totalAssigned: 0, totalCollected: 0, collectionRate: "0%" },
                    pagination: { total: 0, page, limit, totalPages: 0 },
                });
            }
            filter.feeStructureId = { $in: structures.map(s => s._id) };
        }

        if (req.query.billingPeriodId) {
            if (!mongoose.Types.ObjectId.isValid(req.query.billingPeriodId))
                return sendError(res, 400, "Invalid billingPeriodId format");
            filter.billingPeriodId = new mongoose.Types.ObjectId(req.query.billingPeriodId);
        }

        if (req.query.minDue) {
            const minDue = Number(req.query.minDue);
            if (isNaN(minDue) || minDue < 0)
                return sendError(res, 400, "minDue must be a positive number");
            filter.totalDue = { $gte: minDue };
        }

        // StudentFee uses studentId — already has schoolId, filter directly
        const sfFilter = { totalDue: filter.totalDue || { $gt: 0 }, schoolId: req.schoolId };
        if (filter.feeStructureId) sfFilter.feeStructureId = filter.feeStructureId;

        const [afPending, afTotal, afSummary, sfPending, sfTotal, sfSummary] = await Promise.all([
            AccountFee.find(filter)
                .select("accountHolderId totalAssigned totalPaid totalDue status billingPeriodId feeStructureId")
                .sort({ totalDue: -1 })
                .lean(),
            AccountFee.countDocuments(filter),
            AccountFee.aggregate([
                { $match: filter },
                { $group: { _id: null, totalOutstanding: { $sum: "$totalDue" }, totalAssigned: { $sum: "$totalAssigned" }, totalCollected: { $sum: "$totalPaid" } } },
            ]),
            StudentFee.find(sfFilter)
                .select("studentId totalAssigned totalPaid totalDue status feeStructureId")
                .sort({ totalDue: -1 })
                .lean(),
            StudentFee.countDocuments(sfFilter),
            StudentFee.aggregate([
                { $match: sfFilter },
                { $group: { _id: null, totalOutstanding: { $sum: "$totalDue" }, totalAssigned: { $sum: "$totalAssigned" }, totalCollected: { $sum: "$totalPaid" } } },
            ]),
        ]);

        // Normalise StudentFee rows to match AccountFee shape
        const sfNormalised = sfPending.map(r => ({
            ...r,
            accountHolderId: r.studentId,
        }));

        // Merge both sources and re-sort by totalDue desc, then paginate
        const allPending = [...afPending, ...sfNormalised]
            .sort((a, b) => b.totalDue - a.totalDue);
        const pending = allPending.slice(skip, skip + limit);
        const total   = afTotal + sfTotal;

        const afStats = afSummary[0] || { totalOutstanding: 0, totalAssigned: 0, totalCollected: 0 };
        const sfStats = sfSummary[0] || { totalOutstanding: 0, totalAssigned: 0, totalCollected: 0 };
        const stats = {
            totalOutstanding: afStats.totalOutstanding + sfStats.totalOutstanding,
            totalAssigned:    afStats.totalAssigned    + sfStats.totalAssigned,
            totalCollected:   afStats.totalCollected   + sfStats.totalCollected,
        };

        return res.status(200).json({
            success: true,
            data: pending,
            stats: {
                totalOutstanding: stats.totalOutstanding,
                totalAssigned: stats.totalAssigned,
                totalCollected: stats.totalCollected,
                collectionRate: stats.totalAssigned > 0
                    ? `${((stats.totalCollected / stats.totalAssigned) * 100).toFixed(1)}%`
                    : "0%",
            },
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("getPendingAccounts error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── GET FULLY PAID ACCOUNTS ──────────────────────────────────────────────────

exports.getFullyPaidAccounts = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;
        // SECURITY: scope to current school via BillingPeriod (AccountFee has no schoolId field)
        const schoolBillingPeriods2 = await require('../../models/fee/BillingPeriod')
            .find({ schoolId: req.schoolId }).select('_id').lean();
        const schoolBillingPeriodIds2 = schoolBillingPeriods2.map(b => b._id);

        const filter = { status: "paid", billingPeriodId: { $in: schoolBillingPeriodIds2 } };

        if (req.query.cohortKey) {
            const structures = await FeeStructure
                .find({ cohortKey: req.query.cohortKey.trim(), schoolId: req.schoolId })
                .select("_id").lean();
            if (!structures.length) {
                return res.status(200).json({
                    success: true, data: [],
                    stats: { totalAccounts: 0, totalCollected: 0, totalAssigned: 0, avgFeePaid: 0 },
                    pagination: { total: 0, page, limit, totalPages: 0 },
                });
            }
            filter.feeStructureId = { $in: structures.map(s => s._id) };
        }

        if (req.query.billingPeriodId) {
            if (!mongoose.Types.ObjectId.isValid(req.query.billingPeriodId))
                return sendError(res, 400, "Invalid billingPeriodId format");
            filter.billingPeriodId = new mongoose.Types.ObjectId(req.query.billingPeriodId);
        }

        // StudentFee uses studentId — already has schoolId, filter directly
        const sfFilter = { status: "paid", schoolId: req.schoolId };
        if (filter.feeStructureId) sfFilter.feeStructureId = filter.feeStructureId;

        const [afPaid, afTotal, afSummary, sfPaid, sfTotal, sfSummary] = await Promise.all([
            AccountFee.find(filter)
                .select("accountHolderId totalAssigned totalPaid totalDue status billingPeriodId")
                .sort({ totalPaid: -1 })
                .lean(),
            AccountFee.countDocuments(filter),
            AccountFee.aggregate([
                { $match: filter },
                { $group: { _id: null, totalCollected: { $sum: "$totalPaid" }, totalAssigned: { $sum: "$totalAssigned" }, avgFeePaid: { $avg: "$totalPaid" } } },
            ]),
            StudentFee.find(sfFilter)
                .select("studentId totalAssigned totalPaid totalDue status feeStructureId")
                .sort({ totalPaid: -1 })
                .lean(),
            StudentFee.countDocuments(sfFilter),
            StudentFee.aggregate([
                { $match: sfFilter },
                { $group: { _id: null, totalCollected: { $sum: "$totalPaid" }, totalAssigned: { $sum: "$totalAssigned" }, avgFeePaid: { $avg: "$totalPaid" } } },
            ]),
        ]);

        // Normalise StudentFee rows to match AccountFee shape
        const sfNormalised = sfPaid.map(r => ({
            ...r,
            accountHolderId: r.studentId,
        }));

        // Merge both sources, re-sort by totalPaid desc, then paginate
        const allPaid = [...afPaid, ...sfNormalised].sort((a, b) => b.totalPaid - a.totalPaid);
        const paid    = allPaid.slice(skip, skip + limit);
        const total   = afTotal + sfTotal;

        const afStats = afSummary[0] || { totalCollected: 0, totalAssigned: 0, avgFeePaid: 0 };
        const sfStats = sfSummary[0] || { totalCollected: 0, totalAssigned: 0, avgFeePaid: 0 };
        const combinedTotalCollected = afStats.totalCollected + sfStats.totalCollected;
        const combinedTotalAssigned  = afStats.totalAssigned  + sfStats.totalAssigned;
        const combinedAvgFeePaid     = total > 0 ? combinedTotalCollected / total : 0;

        return res.status(200).json({
            success: true,
            data: paid,
            stats: {
                totalAccounts: total,
                totalCollected: combinedTotalCollected,
                totalAssigned: combinedTotalAssigned,
                avgFeePaid: Math.round(combinedAvgFeePaid * 100) / 100,
            },
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("getFullyPaidAccounts error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── DAILY COLLECTION REPORT ──────────────────────────────────────────────────

exports.getDailyCollection = async (req, res) => {
    try {
        const { date, from, to, method } = req.query;

        if (method && !VALID_METHODS.includes(method))
            return sendError(res, 400, `method must be one of: ${VALID_METHODS.join(", ")}`);

        if (!date && !(from && to))
            return sendError(res, 400, "Provide either date or both from and to");

        if (date && isNaN(new Date(date).getTime()))
            return sendError(res, 400, "Invalid date format");

        if (from && isNaN(new Date(from).getTime()))
            return sendError(res, 400, "Invalid from date format");

        if (to && isNaN(new Date(to).getTime()))
            return sendError(res, 400, "Invalid to date format");

        if (from && to && new Date(from) > new Date(to))
            return sendError(res, 400, "from date must be before to date");

        // SECURITY: scope to current school
        // Payment has no schoolId — join via StudentFee which has schoolId
        // Step 1: Get all StudentFee IDs belonging to this school
        const StudentFee = require('../../models/fee/StudentFee');
        const schoolStudentFees = await StudentFee.find({ schoolId: req.schoolId }).select('_id').lean();
        const schoolStudentFeeIds = schoolStudentFees.map(sf => sf._id);

        // Step 2: Filter Payment by those StudentFee IDs
        const match = { studentFeeId: { $in: schoolStudentFeeIds } };
        if (date) {
            match.createdAt = { $gte: startOfDay(date), $lte: endOfDay(date) };
        } else {
            match.createdAt = { $gte: startOfDay(from), $lte: endOfDay(to) };
        }
        if (method) match.method = method;

        const [overall, rawPayments] = await Promise.all([
            Payment.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalCollection: { $sum: "$amount" },
                        totalFine: { $sum: "$fineAmount" },
                        totalTransactions: { $sum: 1 },
                        avgTransaction: { $avg: "$amount" },
                        cashTotal: { $sum: { $cond: [{ $eq: ["$method", "cash"] }, "$amount", 0] } },
                        onlineTotal: { $sum: { $cond: [{ $eq: ["$method", "online"] }, "$amount", 0] } },
                        chequeTotal: { $sum: { $cond: [{ $eq: ["$method", "cheque"] }, "$amount", 0] } },
                        bankTotal: { $sum: { $cond: [{ $eq: ["$method", "bank_transfer"] }, "$amount", 0] } },
                    },
                },
            ]),
            // Returns raw payments — no User population, accountHolderId is included
            Payment.find(match)
                .populate({
                    path: "studentFeeId",
                    select: "accountHolderId",
                })
                .sort({ createdAt: -1 })
                .limit(200)
                .lean(),
        ]);

        // Shape payments — host resolves accountHolderId to display name
        const shapedPayments = rawPayments.map((p) => ({
            _id: p._id,
            method: p.method,
            amount: p.amount,
            fineAmount: p.fineAmount || 0,
            receiptNumber: p.receiptNumber,
            createdAt: p.createdAt,
            accountHolderId: p.studentFeeId?.accountHolderId ?? null,
            accountFeeId: p.studentFeeId?._id ?? null,
        }));

        const s = overall[0] || {
            totalCollection: 0, totalFine: 0, totalTransactions: 0,
            avgTransaction: 0, cashTotal: 0, onlineTotal: 0, chequeTotal: 0, bankTotal: 0,
        };
        s.avgTransaction = Math.round((s.avgTransaction || 0) * 100) / 100;

        return res.status(200).json({
            success: true,
            payments: shapedPayments,
            summary: {
                totalCollection: s.totalCollection,
                totalFine: s.totalFine,
                totalTransactions: s.totalTransactions,
                avgTransaction: s.avgTransaction,
                byMethod: {
                    cash: s.cashTotal, online: s.onlineTotal,
                    cheque: s.chequeTotal, bank_transfer: s.bankTotal,
                },
            },
        });
    } catch (error) {
        console.error("getDailyCollection error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── BILLING PERIOD SUMMARY ───────────────────────────────────────────────────

exports.getBillingPeriodSummary = async (req, res) => {
    try {
        const { billingPeriodId } = req.query;

        if (!billingPeriodId)
            return sendError(res, 400, "billingPeriodId is required");

        if (!mongoose.Types.ObjectId.isValid(billingPeriodId))
            return sendError(res, 400, "Invalid billingPeriodId format");

        const periodObjectId = new mongoose.Types.ObjectId(billingPeriodId);

        // SECURITY: scope to current school
        // AccountFee has no schoolId — scope via BillingPeriod $lookup (which has schoolId)
        // Payment has no schoolId — scope via StudentFee IDs for this school
        const schoolObjId = new mongoose.Types.ObjectId(req.schoolId);

        // Pre-fetch this school's StudentFee IDs for Payment scoping
        const schoolSFDocs = await StudentFee.find({ schoolId: req.schoolId }).select('_id').lean();
        const schoolSFIds = schoolSFDocs.map(sf => sf._id);

        const [feeSummary, fineSummary, statusBreakdown] = await Promise.all([
            // AccountFee scoped via billingPeriodId + BillingPeriod.schoolId lookup
            AccountFee.aggregate([
                { $match: { billingPeriodId: periodObjectId } },
                {
                    $lookup: {
                        from: 'billingperiods',
                        localField: 'billingPeriodId',
                        foreignField: '_id',
                        as: 'period',
                    },
                },
                { $unwind: '$period' },
                { $match: { 'period.schoolId': schoolObjId } },
                {
                    $group: {
                        _id: null,
                        totalAssigned: { $sum: "$totalAssigned" },
                        totalCollected: { $sum: "$totalPaid" },
                        totalOutstanding: { $sum: "$totalDue" },
                        totalAccounts: { $sum: 1 },
                        avgFee: { $avg: "$totalAssigned" },
                    },
                },
            ]),
            // Payment scoped via StudentFee IDs for this school
            Payment.aggregate([
                { $match: { studentFeeId: { $in: schoolSFIds } } },
                {
                    $lookup: {
                        from: "accountfees",
                        localField: "studentFeeId",
                        foreignField: "_id",
                        as: "accountFee",
                    },
                },
                { $unwind: "$accountFee" },
                { $match: { "accountFee.billingPeriodId": periodObjectId } },
                {
                    $group: {
                        _id: null,
                        totalFineCollected: { $sum: "$fineAmount" },
                        totalTransactions: { $sum: 1 },
                        totalAmountPaid: { $sum: "$amount" },
                    },
                },
            ]),
            // AccountFee status breakdown — same BillingPeriod scope
            AccountFee.aggregate([
                { $match: { billingPeriodId: periodObjectId } },
                {
                    $lookup: {
                        from: 'billingperiods',
                        localField: 'billingPeriodId',
                        foreignField: '_id',
                        as: 'period',
                    },
                },
                { $unwind: '$period' },
                { $match: { 'period.schoolId': schoolObjId } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
        ]);

        const feeStats = feeSummary[0] || { totalAssigned: 0, totalCollected: 0, totalOutstanding: 0, totalAccounts: 0, avgFee: 0 };
        const fineStats = fineSummary[0] || { totalFineCollected: 0, totalTransactions: 0, totalAmountPaid: 0 };

        const statusStats = { paid: 0, partial: 0, pending: 0 };
        statusBreakdown.forEach(s => { if (s._id) statusStats[s._id] = s.count; });

        const collectionRate = feeStats.totalAssigned > 0
            ? `${((feeStats.totalCollected / feeStats.totalAssigned) * 100).toFixed(1)}%`
            : "0%";

        return res.status(200).json({
            success: true,
            summary: {
                totalAccounts: feeStats.totalAccounts,
                totalAssigned: feeStats.totalAssigned,
                totalCollected: feeStats.totalCollected,
                totalOutstanding: feeStats.totalOutstanding,
                totalFineCollected: fineStats.totalFineCollected,
                totalTransactions: fineStats.totalTransactions,
                avgFee: Math.round(feeStats.avgFee * 100) / 100,
                collectionRate,
                accountStatus: statusStats,
            },
        });
    } catch (error) {
        console.error("getBillingPeriodSummary error:", error);
        return sendError(res, 500, "Internal server error");
    }
};

// ─── FEE DASHBOARD ────────────────────────────────────────────────────────────

exports.getFeeDashboard = async (req, res) => {
    try {
        // SECURITY: scope ALL aggregations to this school only
        // StudentFee has schoolId — filter directly
        // AccountFee has no schoolId — filter via BillingPeriod which does
        // Payment has no schoolId — filter via StudentFee IDs
        const schoolObjId = new mongoose.Types.ObjectId(req.schoolId);
        const schoolMatch = { schoolId: schoolObjId };

        // Pre-fetch school-scoped BillingPeriod IDs for AccountFee scoping
        const schoolBPs = await require('../../models/fee/BillingPeriod')
            .find({ schoolId: req.schoolId }).select('_id').lean();
        const schoolBPIds = schoolBPs.map(b => b._id);
        const afSchoolMatch = { billingPeriodId: { $in: schoolBPIds } };

        // Pre-fetch school StudentFee IDs for Payment scoping
        const schoolSFIds = await StudentFee.find({ schoolId: req.schoolId }).select('_id').lean();
        const sfIdsForPayment = schoolSFIds.map(sf => sf._id);
        const paymentSchoolMatch = { studentFeeId: { $in: sfIdsForPayment } };

        const [studentFeeSummary, studentFeeStatus, accountFeeSummary, accountFeeStatus, monthlyTrend] = await Promise.all([
            // StudentFee totals — scoped to this school via schoolId
            StudentFee.aggregate([
                { $match: schoolMatch },
                {
                    $group: {
                        _id: null,
                        totalAssigned: { $sum: "$totalAssigned" },
                        totalCollected: { $sum: "$totalPaid" },
                        totalOutstanding: { $sum: "$totalDue" },
                        totalAccounts: { $sum: 1 },
                    },
                },
            ]),
            // StudentFee status breakdown — scoped to this school
            StudentFee.aggregate([
                { $match: schoolMatch },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            // AccountFee totals — scoped via BillingPeriod (AccountFee has no schoolId)
            AccountFee.aggregate([
                { $match: afSchoolMatch },
                {
                    $group: {
                        _id: null,
                        totalAssigned: { $sum: "$totalAssigned" },
                        totalCollected: { $sum: "$totalPaid" },
                        totalOutstanding: { $sum: "$totalDue" },
                        totalAccounts: { $sum: 1 },
                    },
                },
            ]),
            // AccountFee status breakdown — scoped via BillingPeriod
            AccountFee.aggregate([
                { $match: afSchoolMatch },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            // Monthly collection trend — scoped via StudentFee IDs (Payment has no schoolId)
            Payment.aggregate([
                { $match: paymentSchoolMatch },
                {
                    $group: {
                        _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                        totalCollection: { $sum: "$amount" },
                        totalTransactions: { $sum: 1 },
                    },
                },
                { $sort: { "_id.year": -1, "_id.month": -1 } },
                { $limit: 6 },
                { $project: { _id: 0, month: "$_id.month", year: "$_id.year", totalCollection: 1, totalTransactions: 1 } },
            ]),
        ]);

        // Merge StudentFee + AccountFee stats
        const sf = studentFeeSummary[0] || { totalAssigned: 0, totalCollected: 0, totalOutstanding: 0, totalAccounts: 0 };
        const af = accountFeeSummary[0] || { totalAssigned: 0, totalCollected: 0, totalOutstanding: 0, totalAccounts: 0 };

        const totalAssigned    = sf.totalAssigned    + af.totalAssigned;
        const totalCollected   = sf.totalCollected   + af.totalCollected;
        const totalOutstanding = sf.totalOutstanding + af.totalOutstanding;
        const totalAccounts    = sf.totalAccounts    + af.totalAccounts;

        // Merge status breakdowns
        const statusStats = { paid: 0, partial: 0, pending: 0 };
        studentFeeStatus.forEach(s => { if (s._id) statusStats[s._id] = (statusStats[s._id] || 0) + s.count; });
        accountFeeStatus.forEach(s => { if (s._id) statusStats[s._id] = (statusStats[s._id] || 0) + s.count; });

        const collectionRate = totalAssigned > 0
            ? parseFloat(((totalCollected / totalAssigned) * 100).toFixed(1))
            : 0;

        return res.status(200).json({
            success: true,
            data: {
                totalAssigned,
                totalCollected,
                totalOutstanding,
                collectionRate,
                totalAccounts,
                pendingAccounts: statusStats.pending,
                partialAccounts: statusStats.partial,
                fullyPaidAccounts: statusStats.paid,
                monthlyCollectionTrend: monthlyTrend,
            },
        });
    } catch (error) {
        console.error("getFeeDashboard error:", error);
        return sendError(res, 500, "Internal server error");
    }
};