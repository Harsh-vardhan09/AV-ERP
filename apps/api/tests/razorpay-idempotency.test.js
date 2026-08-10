const crypto = require('crypto');
const mongoose = require('mongoose');
const request = require('supertest');

const app = require('../src/app');
const { connect, clear, disconnect } = require('./helpers/db');
const { createSchool, createUser, authCookie } = require('./helpers/fixtures');
const LedgerEntry = require('../src/modules/fees/models/LedgerEntry');
const { MODULES } = require('@av-erp/shared');

// fee_management is retired, so checkModuleAccess answers 403 ahead of the whole
// /api/v1/fee router and this flow cannot be exercised. Tied to the registry
// rather than skipped outright, so marking fees available again re-arms it.
const testIfFeesAvailable = MODULES.fee_management.available === false ? test.skip : test;

beforeAll(connect);
afterAll(disconnect);
beforeEach(clear);

const ORDER_ID = 'order_TEST123';
const PAYMENT_ID = 'pay_TEST123';

const sign = (orderId, paymentId) =>
  crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

// Razorpay retries its callback, and users double-click. Without the
// gatewayOrderId guard each delivery writes another credit and the student's
// balance silently drops twice for one payment. Money path — worth a test even
// in a seven-test net.
testIfFeesAvailable(
  'verifying the same razorpay_order_id twice leaves exactly one ledger entry',
  async () => {
    const school = await createSchool('FEESCH');
    const admin = await createUser({ school, role: 'admin', email: 'admin@fee.com' });

    const studentFeeId = new mongoose.Types.ObjectId();
    await mongoose.connection.collection('studentfees').insertOne({
      _id: studentFeeId,
      schoolId: school._id,
      studentId: new mongoose.Types.ObjectId(),
      sessionId: new mongoose.Types.ObjectId(),
      feeStructureId: new mongoose.Types.ObjectId(),
      totalAssigned: 1000,
      totalPaid: 0,
      totalDue: 1000,
      installments: [],
      createdAt: new Date(),
    });

    const body = {
      razorpay_order_id: ORDER_ID,
      razorpay_payment_id: PAYMENT_ID,
      razorpay_signature: sign(ORDER_ID, PAYMENT_ID),
      studentFeeId: studentFeeId.toString(),
      amount: 500,
    };

    const post = () =>
      request(app)
        .post('/api/v1/fee/payments/razorpay/verify')
        .set('Cookie', authCookie(admin))
        .send(body);

    await post();

    // The second delivery must be recognised and short-circuited, not replayed.
    const second = await post();
    expect(second.status).toBe(200);

    // The invariant, asserted on the data rather than the status codes: one
    // payment, one credit, whatever the callers saw. Deliberately not asserting
    // the first response's status — see the note at the bottom of this file.
    const entries = await LedgerEntry.countDocuments({ studentFeeId });
    expect(entries).toBe(1);
  }
);

// KNOWN BUG, left failing-safe rather than patched: on the FIRST verification
// the handler calls notificationService.createNotification, which does not
// exist — the notifications module exports createInAppNotification. Because the
// property is undefined the call throws synchronously, so the `.catch()` that
// was meant to make it non-blocking never runs and the error reaches the outer
// try/catch. The payment and ledger rows are already written by then, so the
// caller gets a 500 for a payment that actually succeeded. Retries hit the
// gatewayOrderId guard above and return 200, which is why the ledger still
// holds exactly one entry. Razorpay code is DO-NOT-TOUCH per CLAUDE.md §7, so
// this is reported, not fixed.
