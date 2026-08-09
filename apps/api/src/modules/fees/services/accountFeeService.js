const mongoose = require("mongoose");
const BillingPeriod = require("../models/BillingPeriod");
const FeeStructure = require("../models/FeeStructure");
const AccountFee = require("../models/AccountFee");
const Installment = require("../models/Installment");
const Ledger = require("../models/LedgerEntry");
const { calculateFine } = require("../lib/fineCalculator");
const { round } = require("../../../shared/helpers.js");

// ─── Dynamic Installment Plan Generator ───────────────────────────────────────
//
// Returns an array of installment documents based on the fee cycle defined
// in the FeeStructure. The caller is responsible for attaching accountFeeId.
//
// feeCycle rules:
//   MONTHLY      → 12 installments, due on `dueDayOfMonth` each month
//   QUARTERLY    → 4 installments, every 3 months
//   HALF_YEARLY  → 2 installments, at 6 and 12 months
//   YEARLY       → 1 installment, 12 months from now
//   CUSTOM (manual) → use customInstallments[] (admin-defined dates + amounts)
//   CUSTOM (auto)   → equal split by installmentCount, monthly spacing

const splitAmount = (total, count) => {
    const base = Math.floor(total / count);
    const remainder = total - base * count;
    return Array.from({ length: count }, (_, i) =>
        i === count - 1 ? base + remainder : base
    );
};

const dateWithDay = (year, month, day) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d;
};

const addMonths = (date, n) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    d.setHours(0, 0, 0, 0);
    return d;
};

const generateInstallmentPlan = (structure, totalAmount) => {
    const {
        feeCycle = "CUSTOM",
        dueDayOfMonth = 10,
        installmentCount,
        customInstallments = [],
    } = structure;

    const now = new Date();

    const buildDocs = (amounts, dates) =>
        amounts.map((amt, i) => ({
            installmentNo: i + 1,
            dueDate: dates[i],
            amount: amt,
            paidAmount: 0,
            remainingAmount: amt,
            fineAmount: 0,
            status: "pending",
        }));

    switch (feeCycle) {

        case "MONTHLY": {
            const count = 12;
            const amounts = splitAmount(totalAmount, count);
            const dates = Array.from({ length: count }, (_, i) => {
                const d = addMonths(now, i + 1);
                return dateWithDay(d.getFullYear(), d.getMonth(), dueDayOfMonth);
            });
            return buildDocs(amounts, dates);
        }

        case "QUARTERLY": {
            const count = 4;
            const amounts = splitAmount(totalAmount, count);
            const dates = Array.from({ length: count }, (_, i) => addMonths(now, (i + 1) * 3));
            return buildDocs(amounts, dates);
        }

        case "HALF_YEARLY": {
            const count = 2;
            const amounts = splitAmount(totalAmount, count);
            const dates = [addMonths(now, 6), addMonths(now, 12)];
            return buildDocs(amounts, dates);
        }

        case "YEARLY": {
            return [{
                installmentNo: 1,
                dueDate: addMonths(now, 12),
                amount: totalAmount,
                paidAmount: 0,
                remainingAmount: totalAmount,
                fineAmount: 0,
                status: "pending",
            }];
        }

        case "CUSTOM":
        default: {
            if (Array.isArray(customInstallments) && customInstallments.length > 0) {
                return customInstallments.map((ci, i) => ({
                    installmentNo: ci.installmentNo ?? i + 1,
                    dueDate: new Date(ci.dueDate),
                    amount: ci.amount,
                    paidAmount: 0,
                    remainingAmount: ci.amount,
                    fineAmount: 0,
                    status: "pending",
                }));
            }
            const count = installmentCount || 4;
            const amounts = splitAmount(totalAmount, count);
            const dates = Array.from({ length: count }, (_, i) => addMonths(now, i + 1));
            return buildDocs(amounts, dates);
        }
    }
};

// ─── ASSIGN FEE TO ACCOUNT HOLDER ─────────────────────────────────────────────
//
// Decoupled from User model — caller now provides:
//   accountHolderId : ObjectId  (host system's entity — student, employee, member)
//   cohortKey       : String    (the group/class/tier — host resolves this)
//   billingPeriodId : ObjectId? (optional — falls back to active BillingPeriod)
//
// All previous school-specific logic (User.findById, academicDetails.grade) removed.

exports.assignFeeToAccountHolder = async ({ accountHolderId, cohortKey, billingPeriodId = null }) => {

    if (!mongoose.Types.ObjectId.isValid(accountHolderId))
        throw new Error("Invalid accountHolderId");

    if (!cohortKey || typeof cohortKey !== "string" || !cohortKey.trim())
        throw new Error("cohortKey is required");

    // 1. Get billing period (active one if not specified)
    let billingPeriod;
    if (billingPeriodId) {
        if (!mongoose.Types.ObjectId.isValid(billingPeriodId))
            throw new Error("Invalid billingPeriodId");
        billingPeriod = await BillingPeriod.findById(billingPeriodId).lean();
        if (!billingPeriod) throw new Error("Billing period not found");
    } else {
        billingPeriod = await BillingPeriod.findOne({ isActive: true }).lean();
        if (!billingPeriod) throw new Error("No active billing period found");
    }

    if (billingPeriod.isLocked)
        throw new Error("Billing period is locked. Cannot assign new fees.");

    // 2. Find matching fee structure
    const structure = await FeeStructure.findOne({
        billingPeriodId: billingPeriod._id,
        cohortKey: cohortKey.trim(),
        isActive: true,
    })
        .select("totalAmount feeComponents feeCycle dueDayOfMonth installmentCount customInstallments _id")
        .lean();

    if (!structure)
        throw new Error(`Fee structure not found for cohort: ${cohortKey} in billing period: ${billingPeriod.name}`);

    const { totalAmount, _id: feeStructureId } = structure;
    if (!totalAmount || totalAmount <= 0)
        throw new Error("Fee structure has invalid total amount");

    // 3. Duplicate check before opening transaction
    const existingFee = await AccountFee.findOne({
        accountHolderId,
        billingPeriodId: billingPeriod._id,
    }).lean();

    if (existingFee)
        throw new Error("Fee already assigned to this account holder for this billing period.");

    // 4. Build installment plan
    const installmentDocs = generateInstallmentPlan(structure, totalAmount);

    // 5. Atomic transaction
    const dbSession = await mongoose.startSession();

    try {
        const result = await dbSession.withTransaction(async () => {

            // Step 1: Create AccountFee
            const [accountFee] = await AccountFee.create(
                [{
                    accountHolderId,
                    billingPeriodId: billingPeriod._id,
                    feeStructureId,
                    totalAssigned: totalAmount,
                    totalPaid: 0,
                    totalDue: totalAmount,
                    totalFine: 0,
                    status: "pending",
                }],
                { session: dbSession }
            );

            // Step 2: Create initial Ledger debit entry
            await Ledger.create(
                [{
                    studentFeeId: accountFee._id,
                    type: "debit",
                    amount: totalAmount,
                    fineAmount: 0,
                    description: `Fee charged for cohort: ${cohortKey} — Billing Period: ${billingPeriod.name}`,
                    balance: totalAmount,
                }],
                { session: dbSession }
            );

            // Step 3: Create Installments
            const installmentsWithId = installmentDocs.map(doc => ({
                ...doc,
                studentFeeId: accountFee._id,
            }));

            const installments = await Installment.insertMany(
                installmentsWithId,
                { session: dbSession, ordered: true }
            );

            return { accountFee, installments };
        });

        return result;

    } finally {
        dbSession.endSession();
    }
};


// ─── GET ACCOUNT FEE SUMMARY ──────────────────────────────────────────────────
//
// Returns financial summary for an account holder — no User model needed.
// Caller may augment the response with display name from their own system.
//
// Returns null if no fee record has been assigned yet (valid 200 state).

exports.getAccountFeeSummary = async (accountHolderId, billingPeriodId = null) => {

    if (!mongoose.Types.ObjectId.isValid(accountHolderId))
        throw new Error("Invalid accountHolderId");

    // Resolve billing period
    let activePeriod;
    if (billingPeriodId) {
        if (!mongoose.Types.ObjectId.isValid(billingPeriodId))
            throw new Error("Invalid billingPeriodId");
        activePeriod = await BillingPeriod.findById(billingPeriodId).lean();
    } else {
        activePeriod = await BillingPeriod.findOne({ isActive: true }).lean();
    }

    if (!activePeriod) throw new Error("No active billing period found");

    // Fetch AccountFee with populated details
    const accountFee = await AccountFee.findOne({
        accountHolderId,
        billingPeriodId: activePeriod._id,
    })
        .populate("billingPeriodId", "name startDate endDate")
        .populate({
            path: "feeStructureId",
            select: "cohortKey feeComponents totalAmount feeCycle",
            populate: {
                path: "feeComponents.feeHeadId",
                model: "FeeHead",
                select: "name category",
            },
        })
        .lean();

    if (!accountFee) return null;

    // Fetch installments sorted by installmentNo
    const installments = await Installment.find({ studentFeeId: accountFee._id })
        .sort({ installmentNo: 1 })
        .lean();

    if (!installments.length) {
        return {
            _id: accountFee._id,
            accountHolderId: accountFee.accountHolderId,
            billingPeriod: accountFee.billingPeriodId?.name ?? "N/A",
            cohortKey: accountFee.feeStructureId?.cohortKey ?? "N/A",
            totalAssigned: accountFee.totalAssigned,
            totalPaid: accountFee.totalPaid,
            totalDue: accountFee.totalDue,
            totalFine: accountFee.totalFine || 0,
            status: accountFee.status,
            collectionRate: "0%",
            installments: { total: 0, paid: 0, partial: 0, pending: 0, overdue: 0 },
            nextDueDate: null,
        };
    }

    // ─── Installment Analysis ──────────────────────────────────────────────────
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let paidCount = 0, partialCount = 0, pendingCount = 0, overdueCount = 0, totalFine = 0;
    let nextDueDate = null;

    for (const inst of installments) {
        if (inst.status === "paid") paidCount++;
        else if (inst.status === "partial") partialCount++;
        else pendingCount++;

        const due = new Date(inst.dueDate);
        due.setHours(0, 0, 0, 0);

        if (inst.status !== "paid" && due < now) {
            overdueCount++;
            totalFine = round(totalFine + calculateFine(inst.dueDate));
        }

        if (inst.status !== "paid" && due >= now) {
            if (!nextDueDate || due < new Date(nextDueDate))
                nextDueDate = inst.dueDate;
        }
    }

    const collectionRate =
        accountFee.totalAssigned > 0
            ? `${((accountFee.totalPaid / accountFee.totalAssigned) * 100).toFixed(1)}%`
            : "0%";

    return {
        _id: accountFee._id,
        accountHolderId: accountFee.accountHolderId,
        billingPeriod: accountFee.billingPeriodId?.name ?? "N/A",
        cohortKey: accountFee.feeStructureId?.cohortKey ?? "N/A",

        totalAssigned: accountFee.totalAssigned,
        totalPaid: accountFee.totalPaid,
        totalDue: accountFee.totalDue,
        totalFine: round(totalFine),
        status: accountFee.status,
        collectionRate,

        feeStructure: accountFee.feeStructureId
            ? {
                cohortKey: accountFee.feeStructureId.cohortKey,
                totalAmount: accountFee.feeStructureId.totalAmount,
                feeCycle: accountFee.feeStructureId.feeCycle,
                feeComponents: (accountFee.feeStructureId.feeComponents || []).map((comp, i) => ({
                    name: comp.feeHeadId?.name || `Head ${i + 1}`,
                    amount: comp.amount || 0,
                })),
            }
            : null,

        installments: {
            total: installments.length,
            paid: paidCount,
            partial: partialCount,
            pending: pendingCount,
            overdue: overdueCount,
        },

        nextDueDate: nextDueDate ?? null,
    };
};
