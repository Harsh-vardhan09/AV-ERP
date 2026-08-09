// ─── Fee Module Configuration ─────────────────────────────────────────────────
//
// All hardcoded values that were previously scattered across services and utils
// are now centralized here. Override via environment variables as needed.
//
// Usage:
//   const config = require("../lib/feeConfig");   // from modules/fees/services/
//   config.fine.perDay      → fine charged per overdue day
//   config.receipt.orgName  → org name printed on PDF receipts

module.exports = {

    // ─── Fine / Penalty Rules ──────────────────────────────────────────────────
    fine: {
        perDay: Number(process.env.FINE_PER_DAY) || 10,          // per-day penalty amount
        maxDays: Number(process.env.FINE_MAX_DAYS) || 365,       // cap fine accumulation at N days
    },

    // ─── Receipt / PDF Configuration ──────────────────────────────────────────
    receipt: {
        orgName: process.env.RECEIPT_ORG_NAME || "Billing System",       // printed in PDF header
        currencySymbol: process.env.RECEIPT_CURRENCY_SYMBOL || "₹",     // symbol for amounts
        currencyLocale: process.env.RECEIPT_CURRENCY_LOCALE || "en-IN",  // locale for number formatting
    },

    // ─── Pagination Defaults ───────────────────────────────────────────────────
    pagination: {
        defaultLimit: Number(process.env.DEFAULT_PAGE_LIMIT) || 20,
        maxLimit: Number(process.env.MAX_PAGE_LIMIT) || 100,
    },

    // ─── Payment ───────────────────────────────────────────────────────────────
    payment: {
        validMethods: [
            "cash", "online", "cheque", "bank_transfer", "upi", "card", "dd",
        ],
    },

};
