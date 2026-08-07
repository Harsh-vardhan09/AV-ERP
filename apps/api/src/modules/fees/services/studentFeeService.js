const mongoose = require('mongoose');
const StudentProfile = require('../../people').StudentProfile;
const FeeStructure = require('../models/FeeStructure');
const StudentFee = require('../models/StudentFee');
const Installment = require('../models/Installment');
const ThreeInstallment = require('../models/ThreeInstallment');
const LedgerEntry = require('../models/LedgerEntry');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round = (val) => Math.round(val * 100) / 100;

const splitAmount = (total, count) => {
    const base = Math.floor(total / count);
    const remainder = total - base * count;
    return Array.from({ length: count }, (_, i) =>
        i === count - 1 ? base + remainder : base
    );
};

const addMonths = (date, n) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + n);
    d.setHours(0, 0, 0, 0);
    return d;
};

const dateWithDay = (year, month, day) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d;
};

// ─── Installment Plan Generator ───────────────────────────────────────────────

const generateInstallmentPlan = (structure, totalAmount) => {
    const {
        feeCycle = 'CUSTOM',
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
            status: 'pending',
        }));

    switch (feeCycle) {
        case 'MONTHLY': {
            const count = 12;
            const amounts = splitAmount(totalAmount, count);
            const dates = Array.from({ length: count }, (_, i) => {
                const d = addMonths(now, i + 1);
                return dateWithDay(d.getFullYear(), d.getMonth(), dueDayOfMonth);
            });
            return buildDocs(amounts, dates);
        }
        case 'QUARTERLY': {
            const count = 4;
            const amounts = splitAmount(totalAmount, count);
            const dates = Array.from({ length: count }, (_, i) => addMonths(now, (i + 1) * 3));
            return buildDocs(amounts, dates);
        }
        case 'HALF_YEARLY': {
            const count = 2;
            const amounts = splitAmount(totalAmount, count);
            const dates = [addMonths(now, 6), addMonths(now, 12)];
            return buildDocs(amounts, dates);
        }
        case 'YEARLY': {
            return [{
                installmentNo: 1,
                dueDate: addMonths(now, 12),
                amount: totalAmount,
                paidAmount: 0,
                remainingAmount: totalAmount,
                fineAmount: 0,
                status: 'pending',
            }];
        }
        case 'CUSTOM':
        default: {
            if (Array.isArray(customInstallments) && customInstallments.length > 0) {
                return customInstallments.map((ci, i) => ({
                    installmentNo: ci.installmentNo ?? i + 1,
                    dueDate: new Date(ci.dueDate),
                    amount: ci.amount,
                    paidAmount: 0,
                    remainingAmount: ci.amount,
                    fineAmount: 0,
                    status: 'pending',
                }));
            }
            const count = installmentCount || 4;
            const amounts = splitAmount(totalAmount, count);
            const dates = Array.from({ length: count }, (_, i) => addMonths(now, i + 1));
            return buildDocs(amounts, dates);
        }
    }
};

// ─── ASSIGN FEE TO STUDENT ────────────────────────────────────────────────────
//
// studentProfileId: the _id of the StudentProfile document
// (not the User._id)
//
// Callable from:
//   - admissionController.registerStudent (auto on registration)
//   - studentFeeController.assignStudentFee (manual admin trigger)

exports.assignFeeToStudent = async (studentProfileId) => {
    if (!mongoose.Types.ObjectId.isValid(studentProfileId))
        throw new Error('Invalid studentProfileId');

    // 1. Fetch student profile to get classId + session
    const student = await StudentProfile.findById(studentProfileId)
        .populate('classId', 'name numericOrder')
        .lean();
    if (!student) throw new Error('Student profile not found');

    const { classId, session: sessionId } = student;
    if (!classId) throw new Error('Student has no class assigned');
    if (!sessionId) throw new Error('Student has no session assigned');

    // 2. Find active fee structure for this class + session
    const structure = await FeeStructure.findOne({
        classId: classId._id || classId,
        sessionId,
        isActive: true,
    })
        .select('totalAmount feeComponents feeCycle dueDayOfMonth installmentCount customInstallments threeInstallmentDates _id')
        .lean();

    if (!structure)
        throw new Error(`No active fee structure found for class: ${classId.name || classId}`);

    const { totalAmount, _id: feeStructureId } = structure;
    if (!totalAmount || totalAmount <= 0)
        throw new Error('Fee structure has invalid total amount');

    // 3. Duplicate check BEFORE transaction
    const existing = await StudentFee.findOne({ studentId: studentProfileId, sessionId }).lean();
    if (existing) throw new Error('Fee already assigned to this student for this session.');

    // 4. Generate installment plan (skip for FLEXIBLE and THREE_INSTALLMENT)
    const isFlexible        = structure.feeCycle === 'FLEXIBLE';
    const isThreeInstall    = structure.feeCycle === 'THREE_INSTALLMENT';
    const installmentDocs   = (isFlexible || isThreeInstall)
        ? []
        : generateInstallmentPlan(structure, totalAmount);

    // 5. THREE_INSTALLMENT: split amount across 3 dates (extra rupee on installment 1)
    const threeInstallDocs = isThreeInstall
        ? (() => {
            const dates  = structure.threeInstallmentDates || [];
            const base   = Math.floor(totalAmount / 3);
            const extra  = totalAmount - base * 3;
            return [1, 2, 3].map(no => ({
                studentId:      studentProfileId,
                feeStructureId: structure._id,
                installmentNo:  no,
                amount:         no === 1 ? base + extra : base,
                dueDate:        new Date(dates[no - 1]),
                status:         'UNPAID',
            }));
        })()
        : [];

    // 6. Atomic transaction
    const dbSession = await mongoose.startSession();
    try {
        const result = await dbSession.withTransaction(async () => {
            const [studentFee] = await StudentFee.create(
                [{
                    studentId: studentProfileId,
                    sessionId,
                    feeStructureId,
                    totalAssigned: totalAmount,
                    totalPaid: 0,
                    totalDue: totalAmount,
                    totalFine: 0,
                    status: 'pending',
                }],
                { session: dbSession }
            );

            // Initial debit ledger entry
            await LedgerEntry.create(
                [{
                    studentFeeId: studentFee._id,
                    type: 'debit',
                    amount: totalAmount,
                    fineAmount: 0,
                    description: `Fee charged for class ${classId.name || ''} — Session: ${sessionId}`,
                    balance: totalAmount,
                }],
                { session: dbSession }
            );

            // Create standard installments (not for FLEXIBLE or THREE_INSTALLMENT)
            const installments = installmentDocs.length
                ? await Installment.insertMany(
                    installmentDocs.map(doc => ({ ...doc, studentFeeId: studentFee._id })),
                    { session: dbSession, ordered: true }
                )
                : [];

            // Create ThreeInstallment records for THREE_INSTALLMENT cycle
            const threeInstallments = threeInstallDocs.length
                ? await ThreeInstallment.insertMany(
                    threeInstallDocs.map(doc => ({ ...doc, studentFeeId: studentFee._id, schoolId: studentFee.schoolId })),
                    { session: dbSession, ordered: true }
                )
                : [];

            return { studentFee, installments, threeInstallments };
        });
        return result;
    } finally {
        dbSession.endSession();
    }
};

// ─── GET STUDENT FEE SUMMARY ──────────────────────────────────────────────────

exports.getStudentFeeSummary = async (studentProfileId) => {
    if (!mongoose.Types.ObjectId.isValid(studentProfileId))
        throw new Error('Invalid studentProfileId');

    // Get the student profile's current session
    const student = await StudentProfile.findById(studentProfileId)
        .populate('session', 'name startDate endDate')
        .lean();
    if (!student) throw new Error('Student profile not found');

    const sessionId = student.session?._id || student.session;
    if (!sessionId) throw new Error('No session found for student');

    const studentFee = await StudentFee.findOne({ studentId: studentProfileId, sessionId })
        .populate({
            path: 'feeStructureId',
            select: 'classId feeComponents totalAmount feeCycle',
            populate: [
                { path: 'classId', model: 'ClassModel', select: 'name' },
                { path: 'feeComponents.feeHeadId', model: 'FeeHead', select: 'name category' },
            ],
        })
        .lean();

    if (!studentFee) return null;

    const installments = await Installment.find({ studentFeeId: studentFee._id })
        .sort({ installmentNo: 1 })
        .lean();

    if (!installments.length) {
        // FIX: Include feeStructure in this early-return path so the frontend can
        // correctly read feeCycle and route FLEXIBLE/THREE_INSTALLMENT students to
        // the right payment UI instead of falling through to the Razorpay modal.
        return {
            _id: studentFee._id,
            studentName: `${student.firstName} ${student.lastName}`,
            className: studentFee.feeStructureId?.classId?.name ?? 'N/A',
            session: student.session?.name ?? 'N/A',
            totalAssigned: studentFee.totalAssigned,
            totalPaid: studentFee.totalPaid,
            totalDue: studentFee.totalDue,
            totalFine: studentFee.totalFine || 0,
            status: studentFee.status,
            feeStructure: studentFee.feeStructureId ? {
                className:     studentFee.feeStructureId.classId?.name,
                totalAmount:   studentFee.feeStructureId.totalAmount,
                feeCycle:      studentFee.feeStructureId.feeCycle,   // \u2190 CRITICAL for frontend routing
                feeComponents: (studentFee.feeStructureId.feeComponents || []).map((comp, i) => ({
                    name:   comp.feeHeadId?.name || `Head ${i + 1}`,
                    amount: comp.amount || 0,
                })),
            } : null,
            installments: { total: 0, paid: 0, partial: 0, pending: 0, overdue: 0 },
            nextDueDate: null,
        };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let paidCount = 0, partialCount = 0, pendingCount = 0, overdueCount = 0;
    let nextDueDate = null;

    for (const inst of installments) {
        if (inst.status === 'paid') paidCount++;
        else if (inst.status === 'partial') partialCount++;
        else pendingCount++;

        const due = new Date(inst.dueDate);
        due.setHours(0, 0, 0, 0);

        if (inst.status !== 'paid' && due < now) overdueCount++;

        if (inst.status !== 'paid' && due >= now) {
            if (!nextDueDate || due < new Date(nextDueDate)) nextDueDate = inst.dueDate;
        }
    }

    const collectionRate = studentFee.totalAssigned > 0
        ? `${((studentFee.totalPaid / studentFee.totalAssigned) * 100).toFixed(1)}%`
        : '0%';

    return {
        _id: studentFee._id,
        studentName: `${student.firstName} ${student.lastName}`,
        className: studentFee.feeStructureId?.classId?.name ?? 'N/A',
        session: student.session?.name ?? 'N/A',
        totalAssigned: studentFee.totalAssigned,
        totalPaid: studentFee.totalPaid,
        totalDue: studentFee.totalDue,
        totalFine: round(studentFee.totalFine || 0),
        status: studentFee.status,
        collectionRate,
        feeStructure: studentFee.feeStructureId ? {
            className: studentFee.feeStructureId.classId?.name,
            totalAmount: studentFee.feeStructureId.totalAmount,
            feeCycle: studentFee.feeStructureId.feeCycle,
            feeComponents: (studentFee.feeStructureId.feeComponents || []).map((comp, i) => ({
                name: comp.feeHeadId?.name || `Head ${i + 1}`,
                amount: comp.amount || 0,
            })),
        } : null,
        installments: {
            total: installments.length,
            paid: paidCount,
            partial: partialCount,
            pending: pendingCount,
            overdue: overdueCount,
            schedule: installments,
        },
        nextDueDate: nextDueDate ?? null,
    };
};
