const mongoose = require("mongoose");
const Ledger = require("../models/LedgerEntry");
const { serviceError } = require('../lib/respond');

// Helpers

const sendError = (res, status, message) =>
    res.status(status).json({ success: false, message });

const sendSuccess = (res, status, message, data = null) => {
    const response = { success: true, message };
    if (data) response.data = data;
    return res.status(status).json(response);
};

// GET STUDENT LEDGER

exports.getStudentLedger = async (req, res) => {
    try {
        const { studentFeeId } = req.params;

        // Pagination
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const skip = (page - 1) * limit;

        // Optional filter by type
        const filter = { studentFeeId };
        if (req.query.type) {
            if (!["debit", "credit"].includes(req.query.type))
                return sendError(res, 400, "type must be debit or credit");
            filter.type = req.query.type;
        }

        // Optional date range
        if (req.query.from || req.query.to) {
            filter.createdAt = {};
            if (req.query.from) {
                if (isNaN(new Date(req.query.from)))
                    return sendError(res, 400, "Invalid from date");
                filter.createdAt.$gte = new Date(req.query.from);
            }
            if (req.query.to) {
                if (isNaN(new Date(req.query.to)))
                    return sendError(res, 400, "Invalid to date");
                filter.createdAt.$lte = new Date(req.query.to);
            }
        }

        // Parallel fetch — entries + count + totals
        const [entries, total, summary] = await Promise.all([
            Ledger.find(filter)
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Ledger.countDocuments(filter),

            // Aggregate debit/credit totals in one DB call
            Ledger.aggregate([
                { $match: { studentFeeId: new mongoose.Types.ObjectId(studentFeeId) } },
                {
                    $group: {
                        _id: "$type",
                        totalAmount: { $sum: "$amount" },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        // Running balance computed on paginated slice only
        let runningBalance = 0;
        const enhancedLedger = entries.map(entry => {
            runningBalance = entry.type === "debit"
                ? Math.round((runningBalance + entry.amount) * 100) / 100  // rounded
                : Math.round((runningBalance - entry.amount) * 100) / 100; // rounded

            return { ...entry, balance: runningBalance };
        });

        // Shape summary
        const totals = { debit: 0, credit: 0, debitCount: 0, creditCount: 0 };
        summary.forEach(s => {
            totals[s._id] = s.totalAmount;
            totals[`${s._id}Count`] = s.count;
        });

        const netBalance = Math.round((totals.debit - totals.credit) * 100) / 100;

        return res.status(200).json({
            success: true,
            data: enhancedLedger,
            totals: {
                totalDebited: totals.debit,        // total charges
                totalCredited: totals.credit,       // total payments
                netBalance,                          // debit - credit = actual balance
                debitCount: totals.debitCount,   // number of charges
                creditCount: totals.creditCount,  // number of payments
            },
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        return serviceError(res, "getStudentLedger error:", error);
    }
};

// Helper
const round = (val) => Math.round(val * 100) / 100;