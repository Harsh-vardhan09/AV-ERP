const Razorpay = require("razorpay");
const crypto = require("crypto");

// ─── Razorpay Instance ────────────────────────────────────────────────────────
// Lazily initialised so the server still boots if keys are missing in dev.
let _razorpay = null;

const getRazorpay = () => {
    if (!_razorpay) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new Error(
                "Razorpay credentials missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
            );
        }
        // Warn only once if keys have leading/trailing whitespace (common .env corruption)
        if (process.env.RAZORPAY_KEY_ID !== process.env.RAZORPAY_KEY_ID?.trim()) {
            console.error('[razorpayService] CRITICAL: RAZORPAY_KEY_ID has whitespace — this WILL cause auth failures!');
        }
        if (process.env.RAZORPAY_KEY_SECRET !== process.env.RAZORPAY_KEY_SECRET?.trim()) {
            console.error('[razorpayService] CRITICAL: RAZORPAY_KEY_SECRET has whitespace — this WILL cause auth failures!');
        }
        _razorpay = new Razorpay({
            key_id:     process.env.RAZORPAY_KEY_ID.trim(),
            key_secret: process.env.RAZORPAY_KEY_SECRET.trim(),
        });
    }
    return _razorpay;
};

// ─── Create Order ─────────────────────────────────────────────────────────────
//
// @param {number}  amountInRupees  - Amount in INR (will be converted to paise)
// @param {string}  receiptId       - Used as receipt field (usually studentFeeId)
// @param {object}  notes           - Key-value metadata stored on the order
// @returns {object} Razorpay order object
//
exports.createOrder = async (amountInRupees, receiptId, notes = {}) => {
    const razorpay = getRazorpay();

    // FIX: Convert to paise — Razorpay requires integer, never a float
    const amountInPaise = Math.round(amountInRupees * 100);

    // FIX: Ensure receipt is always a non-empty string (Razorpay rejects blank/undefined)
    const safeReceipt = String(receiptId || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'receipt';

    // FIX: Strip undefined/null values from notes — Razorpay rejects malformed notes objects
    // and can return SERVER_ERROR if any value is undefined
    const safeNotes = Object.fromEntries(
        Object.entries(notes)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)])  // all values must be plain strings
    );

    console.log('[razorpayService] createOrder → amountInPaise:', amountInPaise, '| receipt:', safeReceipt, '| notes:', safeNotes);

    const order = await razorpay.orders.create({
        amount:   amountInPaise,
        currency: "INR",
        receipt:  safeReceipt,
        notes:    safeNotes,
    });

    console.log('[razorpayService] Razorpay order created → id:', order.id, '| amount:', order.amount, '| status:', order.status);

    return order;
};

// ─── Verify Payment Signature ─────────────────────────────────────────────────
//
// Verifies that the payment was actually made through Razorpay and not forged.
// Uses HMAC-SHA256: key_secret signs (orderId + "|" + paymentId)
//
// @returns {boolean}
//
exports.verifySignature = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    try {
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) return false;

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expected = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");

        return expected === razorpay_signature;
    } catch {
        return false;
    }
};

// ─── Verify Webhook Signature ─────────────────────────────────────────────────
//
// Verifies Razorpay webhook payload using RAZORPAY_WEBHOOK_SECRET.
// rawBody must be the raw Buffer (use express.raw() middleware before this).
//
// @param {Buffer|string} rawBody
// @param {string}        signature  - X-Razorpay-Signature header
// @returns {boolean}
//
exports.verifyWebhookSignature = (rawBody, signature) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            // SECURITY: Fail CLOSED — reject all webhooks if secret is not configured.
            // Set RAZORPAY_WEBHOOK_SECRET in your environment to enable webhook processing.
            console.error('[razorpayService] RAZORPAY_WEBHOOK_SECRET not set — rejecting webhook (fail-closed).');
            return false;
        }

        const expected = crypto
            .createHmac('sha256', secret)
            .update(rawBody)
            .digest('hex');

        return expected === signature;
    } catch {
        return false;
    }
};

// Expose internal instance getter for controllers that need direct Razorpay API access
exports.getRazorpayInstance = getRazorpay;

