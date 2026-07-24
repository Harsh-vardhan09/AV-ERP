const express = require("express");
const {
    getPendingAccounts,
    getFullyPaidAccounts,
    getDailyCollection,
    getBillingPeriodSummary,
    getFeeDashboard,
} = require("../../controller/fee/reportController");

// ─── Route Factory ────────────────────────────────────────────────────────────
//
// Note: sendFeeReminder endpoint has been REMOVED from this module.
// Sending reminders is host-system responsibility (uses host's notification system).
// Host system should wire refundService hooks or call its own notification layer.

module.exports = (auth = {}) => {

    const {
        authenticate = (req, res, next) => next(),
        authorize = () => (req, res, next) => next(),
    } = auth;

    const router = express.Router();

    // GET /dashboard                              — overall KPIs
    router.get("/dashboard", authenticate, authorize("admin", "operator"), getFeeDashboard);

    // GET /pending                                — accounts with outstanding dues
    // ?cohortKey= &billingPeriodId= &minDue= &page= &limit=
    router.get("/pending", authenticate, authorize("admin", "operator"), getPendingAccounts);

    // GET /paid                                   — fully paid accounts
    // ?cohortKey= &billingPeriodId= &page= &limit=
    router.get("/paid", authenticate, authorize("admin", "operator"), getFullyPaidAccounts);

    // GET /collection                             — daily/range collection
    // ?date= OR ?from= &to= &method= &page= &limit=
    router.get("/collection", authenticate, authorize("admin", "operator"), getDailyCollection);

    // GET /billing-period-summary                 — aggregated stats for one period
    // ?billingPeriodId=
    router.get("/billing-period-summary", authenticate, authorize("admin", "operator"), getBillingPeriodSummary);

    return router;
};
