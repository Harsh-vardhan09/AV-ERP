const mongoose = require('mongoose');
const StudentFee = require('../../models/fee/StudentFee');
const FeeStructure = require('../../models/fee/FeeStructure');
const Installment = require('../../models/fee/Installment');
const StudentProfile = require('../../models/StudentProfile');
const AcademicSession = require('../../models/AcademicSession');
const { assignFeeToStudent, getStudentFeeSummary } = require('../../services/fee/studentFeeService');
const logger = require('../../utils/logger');

// ── Phase 2: Notification imports ────────────────────────────────────────────
const { createInAppNotification, sendEmailNotification } = require('../../services/notificationService');
const { feePaymentReceiptTemplate } = require('../../utils/emailTemplates');
const { User } = require('../../models/user');

const sendError = (res, status, message) =>
    res.status(status).json({ success: false, message });

const sendSuccess = (res, status, message, data = null) => {
    const response = { success: true, message };
    if (data !== null) response.data = data;
    return res.status(status).json(response);
};

const KNOWN_ERRORS = [
    'No active fee structure found',
    'Fee structure has invalid total amount',
    'Student profile not found',
    'Fee already assigned',
    'No session found',
    'Student has no class',
];
const isKnownError = (msg) => KNOWN_ERRORS.some(e => msg?.includes(e));

// ─── ASSIGN STUDENT FEE ───────────────────────────────────────────────────────

exports.assignStudentFee = async (req, res) => {
    try {
        const { studentProfileId } = req.body;
        if (!studentProfileId) return sendError(res, 400, 'Missing required field: studentProfileId');
        if (!mongoose.Types.ObjectId.isValid(studentProfileId))
            return sendError(res, 400, 'Invalid studentProfileId format');

        const result = await assignFeeToStudent(studentProfileId);
        return sendSuccess(res, 201, 'Student fee assigned successfully', result);
    } catch (error) {
        if (isKnownError(error.message)) return sendError(res, 400, error.message);
        console.error('assignStudentFee error:', error);
        return sendError(res, 500, 'Internal server error');
    }
};

// ─── GET STUDENT FEE SUMMARY ─────────────────────────────────────────────────

exports.getStudentFeeSummary = async (req, res) => {
    try {
        let { studentProfileId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(studentProfileId))
            return sendError(res, 400, 'Invalid studentProfileId format');

        // The frontend may pass the User._id instead of StudentProfile._id.
        // Try to resolve: if no StudentProfile exists with this _id, look it up by userId.
        let profile = await StudentProfile.findById(studentProfileId).select('_id').lean();
        if (!profile) {
            profile = await StudentProfile.findOne({ userId: studentProfileId }).select('_id').lean();
            if (profile) studentProfileId = profile._id.toString();
        }

        const result = await getStudentFeeSummary(studentProfileId);

        if (result === null) {
            return res.status(200).json({
                success: true,
                message: 'No fee structure assigned to this student yet.',
                data: null,
            });
        }
        return sendSuccess(res, 200, 'Student fee summary fetched successfully', result);
    } catch (error) {
        if (isKnownError(error.message)) return sendError(res, 400, error.message);
        console.error('getStudentFeeSummary error:', error);
        return sendError(res, 500, 'Internal server error');
    }
};

// ─── GET FEE STATUS LIST BY CLASS (for accounts/admin) ────────────────────────
// Lists all students in a class with their fee status.
// For accounts role: only shows per-student pending/paid status (no aggregate totals)

exports.getClassFeeStatus = async (req, res) => {
    try {
        const { classId, sessionId } = req.query;
        if (!classId || !sessionId)
            return sendError(res, 400, 'classId and sessionId are required');

        // SECURITY: scope to current school — prevents cross-tenant student data leak
        const students = await StudentProfile.find({
            classId,
            session: sessionId,
            status: 'active',
            schoolId: req.schoolId,
        })
            .populate('userId', 'firstName lastName')
            .select('firstName lastName rollNo scholarNo admissionNumber classId session userId')
            .lean();

        const studentIds = students.map(s => s._id);

        const fees = await StudentFee.find({
            studentId: { $in: studentIds },
            sessionId,
        }).select('studentId totalAssigned totalPaid totalDue status').lean();

        const feeMap = {};
        fees.forEach(f => { feeMap[f.studentId.toString()] = f; });

        const result = students.map(s => {
            const fee = feeMap[s._id.toString()];
            return {
                studentProfileId: s._id,
                name: `${s.firstName} ${s.lastName}`,
                rollNo: s.rollNo,
                scholarNo: s.scholarNo,
                admissionNumber: s.admissionNumber,
                feeStatus: fee ? {
                    totalAssigned: fee.totalAssigned,
                    totalPaid: fee.totalPaid,
                    totalDue: fee.totalDue,
                    status: fee.status,
                } : null,
                feeAssigned: !!fee,
            };
        });

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('getClassFeeStatus error:', error);
        return sendError(res, 500, 'Internal server error');
    }
};

// ─── RECORD PAYMENT ──────────────────────────────────────────────────────────
// Simple payment collection: mark installment(s) as paid and update StudentFee totals.

exports.collectPayment = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const { studentProfileId, installmentId, amountPaid, paymentMode, note } = req.body;

        if (!studentProfileId || !installmentId || !amountPaid)
            return sendError(res, 400, 'studentProfileId, installmentId, and amountPaid are required');

        let payment;
        let studentFee;

        await session.withTransaction(async () => {
            const installment = await Installment.findById(installmentId).session(session);
            if (!installment) throw Object.assign(new Error('Installment not found'), { statusCode: 404 });

            // FIX HIGH-7 + MED-5: scope fee to this school to prevent cross-tenant access
            studentFee = await StudentFee.findOne({
                _id: installment.studentFeeId,
                schoolId: req.schoolId,
            }).session(session);
            if (!studentFee) throw Object.assign(new Error('Student fee record not found'), { statusCode: 404 });

            // Verify student ownership
            if (studentFee.studentId.toString() !== studentProfileId)
                throw Object.assign(new Error('Installment does not belong to this student'), { statusCode: 403 });

            payment = Math.min(amountPaid, installment.remainingAmount);
            installment.paidAmount      = (installment.paidAmount || 0) + payment;
            installment.remainingAmount = Math.max(0, installment.amount - installment.paidAmount);
            installment.status          = installment.remainingAmount <= 0 ? 'paid' : 'partial';
            await installment.save({ session });

            studentFee.totalPaid = (studentFee.totalPaid || 0) + payment;
            await studentFee.save({ session }); // pre-save hook updates totalDue + status
        });

        // ── NOTIFICATION BLOCK — non-blocking (CRIT-4 FIX: moved before return) ─
        ;(async () => {
          try {
            const studentProfileDoc = await StudentProfile.findById(studentProfileId)
              .populate('userId', 'firstName lastName email').lean();
            if (!studentProfileDoc?.userId) return;

            const studentUser = studentProfileDoc.userId;
            const studentName = `${studentUser.firstName} ${studentUser.lastName}`;
            const schoolId    = studentProfileDoc.schoolId;
            if (!schoolId) return;

            const loginUrl  = process.env.CLIENT_URL || 'https://campus-nexus.nexisparkx.com';
            const School    = require('../../models/School');
            const school    = await School.findById(schoolId).select('name').lean();
            const schoolName = school?.name || 'School';

            const paymentDate = new Date().toLocaleDateString('en-IN');
            const receiptNo   = `RCP-${Date.now()}`;

            await createInAppNotification({
              userId:   studentUser._id,
              schoolId,
              type:     'fee',
              title:    `Payment Received — ₹${payment}`,
              message:  `Your payment of ₹${payment} has been recorded. Remaining due: ₹${studentFee.totalDue}.`,
              link:     '/student/fees',
              metadata: { amount: payment, receiptNo, paymentDate },
            });

            if (studentUser.email) {
              const { subject, html } = feePaymentReceiptTemplate({
                studentName, amount: payment, receiptNo, paymentDate, schoolName, loginUrl,
              });
              await sendEmailNotification({ to: studentUser.email, subject, html });
            }
          } catch (notifErr) {
            logger.warn('[Notif] Fee payment notification failed', { error: notifErr.message });
          }
        })();
        // ── END NOTIFICATION BLOCK ─────────────────────────────────────────────

        return sendSuccess(res, 200, 'Payment recorded successfully', {
            installment: {
                paidAmount:      studentFee.totalPaid,
                remainingAmount: studentFee.totalDue,
            },
            studentFee: {
                status:    studentFee.status,
                totalPaid: studentFee.totalPaid,
                totalDue:  studentFee.totalDue,
            },
        });
    } catch (error) {
        console.error('collectPayment error:', error);
        const status = error.statusCode || 500;
        return sendError(res, status, error.message || 'Internal server error');
    } finally {
        session.endSession();
    }
};

// ─── BACKFILL ALL STUDENTS ───────────────────────────────────────────────────

exports.backfillAllStudentFees = async (req, res) => {
    try {
        // Find the active session
        const activeSession = await AcademicSession.findOne({ isActive: true, schoolId: req.schoolId }).lean();
        if (!activeSession) return sendError(res, 404, 'No active session found');

        // Find all active fee structures for this session
        const structures = await FeeStructure.find({ sessionId: activeSession._id, isActive: true, schoolId: req.schoolId })
            .select('classId').lean();
        if (!structures.length)
            return sendError(res, 404, 'No active fee structures found for the current session');

        const validClassIds = structures.map(s => s.classId.toString());

        // Find all active students in those classes — scoped to this school
        const students = await StudentProfile.find({
            classId: { $in: validClassIds },
            session: activeSession._id,
            status: 'active',
            schoolId: req.schoolId,
        }).select('_id classId').lean();

        if (!students.length)
            return sendSuccess(res, 200, 'No students found in classes with active fee structures', {
                assigned: 0, skipped: 0, failed: 0,
            });

        // Find who already has a fee
        const existing = await StudentFee.find({
            studentId: { $in: students.map(s => s._id) },
            sessionId: activeSession._id,
        }).select('studentId').lean();

        const alreadyAssigned = new Set(existing.map(f => f.studentId.toString()));
        const toAssign = students.filter(s => !alreadyAssigned.has(s._id.toString()));

        if (!toAssign.length)
            return sendSuccess(res, 200, 'All students already have fee records', {
                assigned: 0, skipped: students.length, failed: 0,
            });

        let assigned = 0, failed = 0;
        const errors = [];

        for (const student of toAssign) {
            try {
                await assignFeeToStudent(student._id);
                assigned++;
            } catch (err) {
                failed++;
                errors.push({ studentId: student._id, reason: err.message });
            }
        }

        return sendSuccess(res, 200,
            `Backfill complete. Assigned: ${assigned}, Skipped: ${alreadyAssigned.size}, Failed: ${failed}`,
            { assigned, skipped: alreadyAssigned.size, failed, errors: errors.length ? errors : undefined }
        );
    } catch (error) {
        console.error('backfillAllStudentFees error:', error);
        return sendError(res, 500, 'Internal server error');
    }
};

// ─── UPDATE PREVIOUS DUES ─────────────────────────────────────────────────────
// Admin manually enters arrears from previous sessions for a student.

exports.updatePreviousDues = async (req, res) => {
    try {
        const { studentProfileId } = req.params;
        const { previousDues, sessionId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(studentProfileId))
            return sendError(res, 400, 'Invalid studentProfileId');
        if (previousDues === undefined || previousDues < 0)
            return sendError(res, 400, 'previousDues must be a non-negative number');

        // Scope to school
        const studentFee = await StudentFee.findOne({
            studentId: studentProfileId,
            sessionId: sessionId || undefined,
            schoolId: req.schoolId,
        }).sort({ createdAt: -1 });

        if (!studentFee) return sendError(res, 404, 'Student fee record not found');

        studentFee.previousDues = Number(previousDues);
        await studentFee.save(); // pre-save hook recalculates totalDue + status

        return sendSuccess(res, 200, 'Previous dues updated successfully', {
            previousDues: studentFee.previousDues,
            totalDue: studentFee.totalDue,
            status: studentFee.status,
        });
    } catch (error) {
        console.error('updatePreviousDues error:', error);
        return sendError(res, 500, 'Internal server error');
    }
};

