const mongoose = require('mongoose');
const razorpayService = require('../services/razorpayService');
const { processPayment } = require('../services/paymentService');
const Payment = require('../models/Payment');
const StudentFee = require('../models/StudentFee');
const StudentProfile = require('../../people').StudentProfile;
const notificationService = require('../../notifications').notificationService;
const logger = require('../../../core/logging/logger.js'); // BUG-16 FIX: use structured logger, not console.log

// Resolve StudentProfile._id from a userId (User._id)
const resolveProfileId = async (userId) => {
  const p = await StudentProfile.findOne({ userId }).select('_id').lean();
  return p ? p._id.toString() : null;
};

// Helpers

const sendError = (res, status, message) => res.status(status).json({ success: false, message });

const sendSuccess = (res, status, data) => res.status(status).json({ success: true, ...data });

// CREATE ORDER
//
// Step 1 of the Razorpay flow.
// Validates studentFeeId ownership, checks pending balance, creates a Razorpay
// order server-side. Does NOT create a Payment record yet.
//
// POST /api/fee/payments/razorpay/order
// Body: { studentFeeId, amount }
// Auth: student | operator | admin

exports.createOrder = async (req, res) => {
  try {
    const { studentFeeId, amount } = req.body;

    // FIX #1: Robustly extract userId — supports all middleware patterns
    // req.user._id  (set by varifyToken as the full User doc)
    // req.userid    (set by varifyToken as backward-compat shorthand)
    // req.user.id   (plain-string alias on some JWT libs)
    const userId = req.user?._id || req.user?.id || req.userid;
    logger.debug(
      '[createOrder] userId resolved | role: %s | studentFeeId: %s',
      req.user?.role,
      studentFeeId
    );

    // Input validation
    // FIX #2: Catch undefined/null studentFeeId early, before Razorpay ever sees it
    if (!studentFeeId || !amount)
      return sendError(res, 400, 'studentFeeId and amount are required');

    if (!mongoose.Types.ObjectId.isValid(studentFeeId))
      return sendError(res, 400, 'Invalid studentFeeId');

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return sendError(res, 400, 'amount must be a positive number');

    // Fetch & verify StudentFee
    const studentFee = await StudentFee.findById(studentFeeId).lean();
    if (!studentFee) return sendError(res, 404, 'Student fee record not found');

    // Ownership check: students can only pay for themselves
    // studentFee.studentId is StudentProfile._id; userId is User._id — must resolve via profile
    if (req.user?.role === 'student') {
      // FIX #3: Guard against falsy userId before hitting DB
      if (!userId)
        return sendError(res, 401, 'Authentication required: userId could not be resolved');

      const profileId = await resolveProfileId(userId);
      logger.debug(
        '[createOrder] profileId resolved | studentFee.studentId: %s',
        studentFee.studentId
      );

      if (!profileId || String(studentFee.studentId) !== profileId)
        return sendError(res, 403, 'Access denied: not your fee record');
    }

    // Amount guard: Never trust frontend amount
    // Round both to 2dp to avoid floating-point edge cases
    const round = (v) => Math.round(v * 100) / 100;
    const totalDue = round(studentFee.totalDue || 0);

    if (totalDue <= 0) return sendError(res, 400, 'No outstanding dues for this student');

    // Prevent overpaying — cap at actual totalDue
    const safeAmount = round(Math.min(parsedAmount, totalDue));

    // Create Razorpay order
    const order = await razorpayService.createOrder(safeAmount, studentFeeId, {
      studentFeeId: String(studentFeeId),
      studentId: String(studentFee.studentId),
    });

    return sendSuccess(res, 200, {
      orderId: order.id,
      amount: safeAmount,
      amountInPaise: order.amount, // for Razorpay checkout (paise)
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID, // public key — safe to expose
    });
  } catch (error) {
    console.error('razorpay createOrder error:', error);
    return sendError(res, 500, 'Failed to create payment order');
  }
};

// VERIFY PAYMENT
//
// Step 2 of the Razorpay flow.
// Called by frontend immediately after Razorpay checkout success callback.
//
// 1. Verifies HMAC signature — rejects if invalid (prevents faking success)
// 2. Calls existing processPayment() — all business logic unchanged
// 3. Patches the returned Payment record with gateway fields
//
// POST /api/fee/payments/razorpay/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, studentFeeId, amount }
// Auth: student | operator | admin

exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, studentFeeId, amount } =
      req.body;

    // FIX #1: Same robust userId extraction as createOrder
    const userId = req.user?._id || req.user?.id || req.userid;
    logger.debug(
      '[verifyPayment] userId resolved | role: %s | orderId: %s',
      req.user?.role,
      razorpay_order_id
    );

    // Validate all required fields
    const missing = [
      !razorpay_order_id && 'razorpay_order_id',
      !razorpay_payment_id && 'razorpay_payment_id',
      !razorpay_signature && 'razorpay_signature',
      !studentFeeId && 'studentFeeId',
      !amount && 'amount',
    ].filter(Boolean);

    if (missing.length > 0) return sendError(res, 400, `Missing fields: ${missing.join(', ')}`);

    // Verify HMAC signature
    // If invalid → payment was tampered with — reject immediately
    const isValid = razorpayService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) return sendError(res, 400, 'Payment verification failed: invalid signature');

    // Prevent double-processing same order
    const existingPayment = await Payment.findOne({ gatewayOrderId: razorpay_order_id }).lean();
    if (existingPayment) {
      return sendSuccess(res, 200, {
        message: 'Payment already processed',
        idempotent: true,
        payment: existingPayment,
      });
    }

    // Fetch & verify StudentFee — scoped to this school (MED-5 FIX)
    const studentFee = await StudentFee.findOne({ _id: studentFeeId, schoolId: req.schoolId });
    if (!studentFee) return sendError(res, 404, 'Student fee record not found');

    if (req.user?.role === 'student') {
      // FIX #3: Guard against falsy userId before hitting DB
      if (!userId)
        return sendError(res, 401, 'Authentication required: userId could not be resolved');

      const profileId = await resolveProfileId(userId);
      logger.debug(
        '[verifyPayment] profileId resolved | studentFee.studentId: %s',
        studentFee.studentId
      );

      if (!profileId || String(studentFee.studentId) !== profileId)
        return sendError(res, 403, 'Access denied: not your fee record');
    }

    // MED-2 FIX: Verify captured amount from Razorpay API
    // Do NOT trust the amount sent by the frontend — fetch the real captured amount.
    // Signature check only verifies order+payment IDs, not the amount.
    let capturedAmount;
    try {
      const razorpayInstance = razorpayService.getRazorpayInstance
        ? razorpayService.getRazorpayInstance()
        : null;
      if (razorpayInstance) {
        const paymentDetails = await razorpayInstance.payments.fetch(razorpay_payment_id);
        capturedAmount = paymentDetails.amount / 100; // paise → rupees
      }
    } catch (apiErr) {
      // If Razorpay API call fails, fall back to client-provided amount (log for audit)
      console.error(
        '[verifyPayment] Razorpay API fetch failed — using client amount:',
        apiErr.message
      );
    }

    const parsedAmount = capturedAmount ?? Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return sendError(res, 400, 'Invalid amount');
    if (parsedAmount > studentFee.totalDue)
      return sendError(res, 400, `Amount ₹${parsedAmount} exceeds due ₹${studentFee.totalDue}`);

    // Settle installments
    const Installment = require('../models/Installment');
    const LedgerEntry = require('../models/LedgerEntry');
    const { generateReceiptNumber } = require('../../../shared/helpers.js');
    const round = (v) => Math.round(v * 100) / 100;

    const pendingInstallments = await Installment.find({
      studentFeeId,
      status: { $in: ['pending', 'partial'] },
    }).sort({ installmentNo: 1 });

    let remaining = parsedAmount;
    for (const inst of pendingInstallments) {
      if (remaining <= 0) break;
      const instDue = round(inst.remainingAmount || inst.amount);
      if (remaining >= instDue) {
        inst.paidAmount = round((inst.paidAmount || 0) + instDue);
        inst.remainingAmount = 0;
        inst.status = 'paid';
        remaining = round(remaining - instDue);
      } else {
        inst.paidAmount = round((inst.paidAmount || 0) + remaining);
        inst.remainingAmount = round(instDue - remaining);
        inst.status = 'partial';
        remaining = 0;
      }
      await inst.save();
    }

    // Update StudentFee (pre-save hook sets status + totalDue)
    studentFee.totalPaid = round((studentFee.totalPaid || 0) + parsedAmount);
    await studentFee.save();

    // Create Payment record
    const receiptNumber = generateReceiptNumber();
    const payment = await Payment.create({
      studentFeeId,
      amount: parsedAmount,
      fineAmount: 0,
      receiptNumber,
      method: 'online',
      note: `Razorpay: ${razorpay_payment_id}`,
      idempotencyKey: razorpay_order_id,
      gateway: 'razorpay',
      gatewayOrderId: razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id,
      gatewaySignature: razorpay_signature,
      gatewayStatus: 'captured',
    });

    // Create Ledger entry
    await LedgerEntry.create({
      studentFeeId,
      type: 'credit',
      amount: parsedAmount,
      fineAmount: 0,
      referenceId: payment._id,
      referenceModel: 'Payment',
      balance: Math.max(0, studentFee.totalDue),
      description: `Fee payment via Razorpay. Receipt: ${receiptNumber}`,
    });

    // Fire notification (non-blocking)
    notificationService
      .createNotification({
        userId: String(studentFee.studentId),
        role: 'student',
        type: 'payment_success',
        message: `Payment of ₹${parsedAmount} completed via Razorpay. Receipt: ${receiptNumber}.`,
        metadata: {
          receiptNumber,
          paymentId: String(payment._id),
          gatewayPaymentId: razorpay_payment_id,
        },
      })
      .catch((err) => console.error('Notification error (non-fatal):', err));

    return sendSuccess(res, 201, {
      message: 'Payment verified and recorded',
      idempotent: false,
      payment,
      summary: {
        totalPaid: studentFee.totalPaid,
        totalDue: studentFee.totalDue,
        status: studentFee.status,
      },
    });
  } catch (error) {
    console.error('razorpay verifyPayment error:', error);
    if (error.message?.includes('Payment') || error.message?.includes('due'))
      return sendError(res, 400, error.message);
    return sendError(res, 500, 'Payment verification failed');
  }
};

// WEBHOOK HANDLER
//
// Receives asynchronous events from Razorpay.
// Used as a safety net when the frontend verify call failed (network issue).
//
// POST /api/fee/payments/razorpay/webhook
// No JWT auth — verified via HMAC of raw body + RAZORPAY_WEBHOOK_SECRET
// Must be registered in Razorpay Dashboard → Webhooks
//
// Events handled:
//   payment.captured → reconcile missed verifyPayment calls
//   payment.failed   → log (optionally notify admin)
//   refund.processed → update gateway status on Payment record

exports.handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    // MUST use raw body (before JSON.parse) — express.raw() middleware required
    const signature = req.headers['x-razorpay-signature'];

    if (!signature)
      return res.status(400).json({ success: false, message: 'Missing webhook signature' });

    const isValid = razorpayService.verifyWebhookSignature(req.body, signature);

    if (!isValid)
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });

    // Parse body after verification
    const event = JSON.parse(req.body.toString());
    const eventType = event.event;
    const payloadPayment = event?.payload?.payment?.entity;
    const payloadRefund = event?.payload?.refund?.entity;

    // Respond to Razorpay IMMEDIATELY (within 5s required)
    // Processing happens async — Razorpay doesn't care about response body
    res.status(200).json({ success: true, received: true });

    // Handle events asynchronously

    if (eventType === 'payment.captured' && payloadPayment) {
      await handlePaymentCaptured(payloadPayment);
    } else if (eventType === 'payment.failed' && payloadPayment) {
      await handlePaymentFailed(payloadPayment);
    } else if (eventType === 'refund.processed' && payloadRefund) {
      await handleRefundProcessed(payloadRefund);
    }
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    // Return 200 even on internal errors — Razorpay retries on non-200
    // Better to ack receipt and log than to trigger retry storms
    res.status(200).json({ success: true, received: true });
  }
};

// WEBHOOK EVENT HANDLERS

/**
 * Reconciles a payment that was captured by Razorpay but whose verify endpoint
 * call was lost (network failure, browser crash, etc.).
 *
 * Checks if a Payment record already has this gatewayOrderId — if not,
 * it means processPayment() was never called. We call it now.
 */
async function handlePaymentCaptured(paymentEntity) {
  try {
    const { order_id, id: paymentId, notes } = paymentEntity;
    const studentFeeId = notes?.studentFeeId;

    if (!studentFeeId || !mongoose.Types.ObjectId.isValid(studentFeeId)) {
      console.warn('[webhook] payment.captured: missing or invalid studentFeeId in notes', {
        order_id,
      });
      return;
    }

    // Check if already processed
    const existing = await Payment.findOne({ gatewayOrderId: order_id }).lean();
    if (existing) return; // already handled by verifyPayment

    // Amount from Razorpay is in paise — convert back to rupees
    const amountInRupees = Math.round(paymentEntity.amount) / 100;

    console.log(
      `[webhook] Reconciling missed payment. orderId=${order_id}, amount=₹${amountInRupees}`
    );

    // Call existing payment engine (safe — idempotencyKey prevents duplicates)
    const result = await processPayment(
      studentFeeId,
      amountInRupees,
      'online',
      `Razorpay webhook reconcile: ${paymentId}`,
      order_id // idempotencyKey
    );

    // Patch gateway fields
    if (result.payment && !result.idempotent) {
      await Payment.findByIdAndUpdate(result.payment._id, {
        $set: {
          gateway: 'razorpay',
          gatewayOrderId: order_id,
          gatewayPaymentId: paymentId,
          gatewayStatus: 'captured',
        },
      });
    }
  } catch (err) {
    console.error('[webhook] handlePaymentCaptured error:', err.message);
  }
}

/**
 * Logs failed payment. Can be extended to notify admin or mark a state record.
 */
async function handlePaymentFailed(paymentEntity) {
  try {
    console.warn('[webhook] payment.failed:', {
      orderId: paymentEntity.order_id,
      paymentId: paymentEntity.id,
      reason: paymentEntity.error_description,
    });

    // Update Payment record if it was pre-created (e.g. for retry tracking)
    // In this implementation we don't pre-create, so this is a no-op.
    // Extend here if you add order tracking in the future.
  } catch (err) {
    console.error('[webhook] handlePaymentFailed error:', err.message);
  }
}

/**
 * Marks a Payment's gatewayStatus as "refunded" when Razorpay processes a refund.
 * The actual refund record in our Refund model is created separately via the
 * refund request/approve flow — this just keeps the gateway status in sync.
 */
async function handleRefundProcessed(refundEntity) {
  try {
    const { payment_id, id: refundId } = refundEntity;
    if (!payment_id) return;

    await Payment.findOneAndUpdate(
      { gatewayPaymentId: payment_id },
      {
        $set: {
          gatewayStatus: 'refunded',
        },
      }
    );

    console.log(
      `[webhook] refund.processed: gatewayStatus updated for paymentId=${payment_id}, refundId=${refundId}`
    );
  } catch (err) {
    console.error('[webhook] handleRefundProcessed error:', err.message);
  }
}
