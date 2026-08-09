const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const AccountFee = require("../models/AccountFee");
const config = require("../lib/feeConfig");

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date) =>
    new Date(date).toLocaleDateString(config.receipt.currencyLocale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

const formatCurrency = (amount) =>
    `${config.receipt.currencySymbol}${Number(amount || 0).toLocaleString(config.receipt.currencyLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

// ─── GENERATE RECEIPT PDF ─────────────────────────────────────────────────────
//
// Decoupled from User model — display values are passed in via `meta` object.
// The host system resolves account holder name, identifier, etc. and passes them.
//
// Params:
//   paymentId : string    — the payment to generate a receipt for
//   res       : Response  — Express response object (PDF piped directly)
//   meta      : object    — optional display info from the host system:
//     {
//       holderName  : string  (e.g., "John Doe")
//       identifier  : string  (e.g., enrollment number, employee ID)
//       cohortKey   : string  (e.g., class name, batch, tier)
//     }
//   If meta fields are missing, "N/A" is used.

exports.generateReceiptPDF = async (paymentId, res, meta = {}) => {

    if (!mongoose.Types.ObjectId.isValid(paymentId))
        throw new Error("Invalid payment ID");

    const payment = await Payment.findById(paymentId).lean();
    if (!payment) throw new Error("Payment not found");

    const accountFee = await AccountFee.findById(payment.studentFeeId)
        .populate("billingPeriodId", "name startDate endDate")
        .lean();

    if (!accountFee) throw new Error("Account fee record not found");

    // ─── Display values — from meta or fallback to N/A ────────────────────────
    const holderName = meta.holderName || "N/A";
    const identifier = meta.identifier || "N/A";
    const cohortKey = meta.cohortKey || "N/A";
    const billingPeriodName = accountFee.billingPeriodId?.name ?? "N/A";

    // ─── Payment breakdown ─────────────────────────────────────────────────────
    const fineCharged = payment.fineAmount || 0;
    const baseAmount = Math.max(0, payment.amount - fineCharged);

    // ─── PDF Setup ────────────────────────────────────────────────────────────
    const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        info: {
            Title: `Receipt - ${payment.receiptNumber}`,
            Author: config.receipt.orgName,
            Subject: "Fee Payment Receipt",
            Keywords: `receipt, fee, payment, ${payment.receiptNumber}`,
        },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename=receipt-${payment.receiptNumber}.pdf`
    );

    doc.on("error", (err) => {
        console.error("PDF stream error:", err);
        if (!res.headersSent) res.status(500).end();
    });

    doc.pipe(res);

    // ─── Header ───────────────────────────────────────────────────────────────
    doc
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(config.receipt.orgName, { align: "center" });

    doc
        .fontSize(14)
        .font("Helvetica")
        .text("Fee Payment Receipt", { align: "center" });

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.5);

    // ─── Receipt Meta ─────────────────────────────────────────────────────────
    doc.fontSize(11).font("Helvetica-Bold").text("Receipt Details", { underline: true });
    doc.moveDown(0.3);
    doc.font("Helvetica");
    doc.text(`Receipt No      : ${payment.receiptNumber}`);
    doc.text(`Payment Date    : ${formatDate(payment.paymentDate || payment.createdAt)}`);
    doc.text(`Payment Method  : ${payment.method?.toUpperCase() ?? "N/A"}`);
    if (payment.note) doc.text(`Note            : ${payment.note}`);

    doc.moveDown(0.8);

    // ─── Account Holder Information ───────────────────────────────────────────
    doc.font("Helvetica-Bold").text("Account Holder Details", { underline: true });
    doc.moveDown(0.3);
    doc.font("Helvetica");
    doc.text(`Name            : ${holderName}`);
    doc.text(`ID / Reference  : ${identifier}`);
    doc.text(`Cohort / Group  : ${cohortKey}`);
    doc.text(`Billing Period  : ${billingPeriodName}`);

    doc.moveDown(0.8);

    // ─── Payment Breakdown ────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").text("Payment Breakdown", { underline: true });
    doc.moveDown(0.3);
    doc.font("Helvetica");
    doc.text(`Base Amount     : ${formatCurrency(baseAmount)}`);
    if (fineCharged > 0)
        doc.text(`Fine / Penalty  : ${formatCurrency(fineCharged)}`);
    doc.font("Helvetica-Bold").text(`Total Paid      : ${formatCurrency(payment.amount)}`);

    doc.moveDown(0.8);

    // ─── Fee Summary ──────────────────────────────────────────────────────────
    doc.font("Helvetica");
    doc.text(`Total Assigned  : ${formatCurrency(accountFee.totalAssigned)}`);
    doc.text(`Total Paid      : ${formatCurrency(accountFee.totalPaid)}`);
    doc.text(`Balance Due     : ${formatCurrency(accountFee.totalDue)}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown(0.8);

    // ─── Footer ───────────────────────────────────────────────────────────────
    doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Thank you for your payment!", { align: "center" });

    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#888888")
        .text(
            `Generated on ${formatDate(new Date())} — ${config.receipt.orgName}`,
            { align: "center" }
        );

    doc.end();
};