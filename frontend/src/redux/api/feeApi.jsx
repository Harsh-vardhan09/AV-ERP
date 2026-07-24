import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_PORT}/api/v1/fee/`,
  credentials: 'include',
});

export const feeApi = createApi({
  reducerPath: 'feeApi',
  baseQuery,
  tagTypes: [
    'FeeHead',
    'FeeStructure',
    'StudentFee',
    'Payment',
    'Installment',
    'Report',
    'Refund',
    'BillingPeriod',
    'Ledger',
    'AccountFee',
    'Session',
    'FlexiblePay',      // NEW
    'ThreeInstallment', // NEW
  ],

  endpoints: (builder) => ({

    // ── Fee Heads ─────────────────────────────────────────────────────────
    getFeeHeads: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `fee-heads?${qs}` : 'fee-heads';
      },
      providesTags: ['FeeHead'],
    }),
    createFeeHead: builder.mutation({
      query: (body) => ({ url: 'fee-heads', method: 'POST', body }),
      invalidatesTags: ['FeeHead'],
    }),
    updateFeeHead: builder.mutation({
      // Backend uses PATCH (not PUT)
      query: ({ id, ...body }) => ({ url: `fee-heads/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['FeeHead'],
    }),
    deleteFeeHead: builder.mutation({
      query: (id) => ({ url: `fee-heads/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FeeHead'],
    }),

    // ── Fee Structures ────────────────────────────────────────────────────
    getFeeStructures: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `fee-structures?${qs}` : 'fee-structures';
      },
      providesTags: ['FeeStructure'],
    }),
    getFeeStructureById: builder.query({
      query: (id) => `fee-structures/${id}`,
      providesTags: ['FeeStructure'],
    }),
    createFeeStructure: builder.mutation({
      query: (body) => ({ url: 'fee-structures', method: 'POST', body }),
      invalidatesTags: ['FeeStructure'],
    }),
    updateFeeStructure: builder.mutation({
      // Backend uses PATCH
      query: ({ id, ...body }) => ({ url: `fee-structures/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['FeeStructure'],
    }),
    deleteFeeStructure: builder.mutation({
      query: (id) => ({ url: `fee-structures/${id}`, method: 'DELETE' }),
      invalidatesTags: ['FeeStructure'],
    }),

    // ── Student Fees ──────────────────────────────────────────────────────
    // GET /student-fees/class?classId=&sessionId= — list by class
    getClassFeeStatus: builder.query({
      query: ({ classId, sessionId }) =>
        `student-fees/class?classId=${classId}&sessionId=${sessionId}`,
      providesTags: ['StudentFee'],
    }),
    // GET /student-fees/summary/student/:studentId
    getStudentFeeSummary: builder.query({
      query: (studentId) => `student-fees/summary/student/${studentId}`,
      providesTags: ['StudentFee'],
    }),
    // POST /student-fees  — assign fee structure to a student
    assignStudentFee: builder.mutation({
      query: (body) => ({ url: 'student-fees', method: 'POST', body }),
      invalidatesTags: ['StudentFee'],
    }),
    // POST /student-fees/backfill — assign missing fees to all students
    backfillStudentFees: builder.mutation({
      query: () => ({ url: 'student-fees/backfill', method: 'POST' }),
      invalidatesTags: ['StudentFee', 'AccountFee'],
    }),

    // ── Payments ──────────────────────────────────────────────────────────
    // POST /payments — collect a payment (body: { accountFeeId, amount, method, note })
    collectPayment: builder.mutation({
      query: (body) => ({ url: 'payments', method: 'POST', body }),
      invalidatesTags: ['Payment', 'StudentFee', 'AccountFee', 'Ledger'],
    }),
    // POST /student-fees/collect — installment-based payment from CollectFee page
    // body: { studentProfileId, installmentId, amountPaid, paymentMode, transactionId?, note? }
    collectStudentPayment: builder.mutation({
      query: (body) => ({ url: 'student-fees/collect', method: 'POST', body }),
      invalidatesTags: ['Payment', 'StudentFee', 'Installment'],
    }),
    // GET /payments/receipt/:paymentId
    getPaymentReceipt: builder.query({
      query: (paymentId) => `payments/receipt/${paymentId}`,
      providesTags: ['Payment'],
    }),

    // ── Installments ──────────────────────────────────────────────────────
    // GET /installments/:studentFeeId
    getInstallments: builder.query({
      query: (studentFeeId) => `installments/${studentFeeId}`,
      providesTags: ['Installment'],
    }),
    // GET /payments?studentId=  — student payment history
    getStudentPayments: builder.query({
      query: (studentId) => `payments?studentId=${studentId}`,
      providesTags: ['Payment'],
    }),
    // POST /payments/razorpay/order  — create Razorpay order
    createRazorpayOrder: builder.mutation({
      query: (body) => ({ url: 'payments/razorpay/order', method: 'POST', body }),
    }),
    // POST /payments/razorpay/verify  — verify & record Razorpay payment
    verifyRazorpayPayment: builder.mutation({
      query: (body) => ({ url: 'payments/razorpay/verify', method: 'POST', body }),
      invalidatesTags: ['StudentFee', 'Payment', 'Installment'],
    }),

    // ── Account Fees ──────────────────────────────────────────────────────
    // POST /account-fees — assign fee to an account holder
    assignAccountFee: builder.mutation({
      query: (body) => ({ url: 'account-fees', method: 'POST', body }),
      invalidatesTags: ['AccountFee'],
    }),
    // GET /account-fees/summary/:accountHolderId
    getAccountFeeSummary: builder.query({
      query: (accountHolderId) => `account-fees/summary/${accountHolderId}`,
      providesTags: ['AccountFee'],
    }),
    // POST /account-fees/bulk-assign
    bulkAssignFees: builder.mutation({
      query: (body) => ({ url: 'account-fees/bulk-assign', method: 'POST', body }),
      invalidatesTags: ['AccountFee', 'StudentFee'],
    }),

    // ── Billing Periods ───────────────────────────────────────────────────
    getBillingPeriods: builder.query({
      query: () => 'billing-periods',
      providesTags: ['BillingPeriod'],
    }),
    createBillingPeriod: builder.mutation({
      query: (body) => ({ url: 'billing-periods', method: 'POST', body }),
      invalidatesTags: ['BillingPeriod'],
    }),

    // ── Ledger ────────────────────────────────────────────────────────────
    // GET /ledger/:studentFeeId?page=&limit=&type=&from=&to=
    getLedger: builder.query({
      query: ({ studentFeeId, ...params } = {}) => {
        if (!studentFeeId) return 'ledger/invalid'; // safe fallback
        const qs = new URLSearchParams(params).toString();
        return qs ? `ledger/${studentFeeId}?${qs}` : `ledger/${studentFeeId}`;
      },
      providesTags: ['Ledger'],
    }),

    // ── Reports ───────────────────────────────────────────────────────────
    // GET /reports/dashboard
    getFeeDashboard: builder.query({
      query: () => 'reports/dashboard',
      providesTags: ['Report'],
    }),
    // GET /reports/collection?date= OR ?from=&to=&method=
    getDailyCollection: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `reports/collection?${qs}` : 'reports/collection';
      },
      providesTags: ['Report'],
    }),
    // GET /reports/pending?cohortKey=&billingPeriodId=&minDue=
    getDefaultersReport: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `reports/pending?${qs}` : 'reports/pending';
      },
      providesTags: ['Report'],
    }),
    // GET /reports/paid?cohortKey=&billingPeriodId=
    getPaidAccountsReport: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `reports/paid?${qs}` : 'reports/paid';
      },
      providesTags: ['Report'],
    }),
    // GET /reports/billing-period-summary?billingPeriodId=
    getBillingPeriodSummary: builder.query({
      query: (billingPeriodId) =>
        billingPeriodId
          ? `reports/billing-period-summary?billingPeriodId=${billingPeriodId}`
          : 'reports/billing-period-summary',
      providesTags: ['Report'],
    }),

    // ── Refunds ───────────────────────────────────────────────────────────
    // POST /refunds — request a refund
    // Body: { paymentId, accountFeeId, amount, reason, requestedBy }
    createRefund: builder.mutation({
      query: (body) => ({ url: 'refunds', method: 'POST', body }),
      invalidatesTags: ['Refund', 'Payment', 'AccountFee'],
    }),
    // GET /refunds/payment/:paymentId
    getRefundsByPayment: builder.query({
      query: (paymentId) => `refunds/payment/${paymentId}`,
      providesTags: ['Refund'],
    }),
    // GET /refunds/account/:accountFeeId
    getRefundsByAccount: builder.query({
      query: (accountFeeId) => `refunds/account/${accountFeeId}`,
      providesTags: ['Refund'],
    }),

    // ── Sessions ──────────────────────────────────────────────────────────
    // GET /sessions — list all sessions (admin/operator)
    getFeeSessions: builder.query({
      query: () => 'sessions',
      providesTags: ['Session'],
    }),

    // ── FLEXIBLE Pay (NEW) ────────────────────────────────────────────────
    // POST /flexible-pay
    flexiblePay: builder.mutation({
      query: (body) => ({ url: 'flexible-pay', method: 'POST', body }),
      invalidatesTags: ['FlexiblePay', 'StudentFee'],
    }),
    // GET /flexible-pay/history/:studentFeeId
    getFlexibleHistory: builder.query({
      query: (studentFeeId) => `flexible-pay/history/${studentFeeId}`,
      providesTags: ['FlexiblePay'],
    }),

    // ── THREE_INSTALLMENT (NEW) ───────────────────────────────────────────
    // GET /three-installments/:studentFeeId
    getThreeInstallments: builder.query({
      query: (studentFeeId) => `three-installments/${studentFeeId}`,
      providesTags: ['ThreeInstallment'],
    }),
    // POST /three-installments/pay
    payThreeInstallment: builder.mutation({
      query: (body) => ({ url: 'three-installments/pay', method: 'POST', body }),
      invalidatesTags: ['ThreeInstallment', 'StudentFee'],
    }),

    // ── Classes (from admin API, re-export for fee pages) ─────────────────
    // This is handled by adminApi — fee pages that need classes import from adminApi directly
  }),
});


export const {
  // Fee Heads
  useGetFeeHeadsQuery,
  useCreateFeeHeadMutation,
  useUpdateFeeHeadMutation,
  useDeleteFeeHeadMutation,

  // Fee Structures
  useGetFeeStructuresQuery,
  useGetFeeStructureByIdQuery,
  useCreateFeeStructureMutation,
  useUpdateFeeStructureMutation,
  useDeleteFeeStructureMutation,

  // Student Fees
  useGetClassFeeStatusQuery,
  useGetStudentFeeSummaryQuery,
  useAssignStudentFeeMutation,
  useBackfillStudentFeesMutation,

  // Payments
  useCollectPaymentMutation,
  useCollectStudentPaymentMutation,
  useGetPaymentReceiptQuery,
  useGetStudentPaymentsQuery,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,

  // Installments
  useGetInstallmentsQuery,

  // Account Fees
  useAssignAccountFeeMutation,
  useGetAccountFeeSummaryQuery,
  useBulkAssignFeesMutation,

  // Billing Periods
  useGetBillingPeriodsQuery,
  useCreateBillingPeriodMutation,

  // Ledger
  useGetLedgerQuery,

  // Reports
  useGetFeeDashboardQuery,
  useGetDailyCollectionQuery,
  useGetDefaultersReportQuery,
  useGetPaidAccountsReportQuery,
  useGetBillingPeriodSummaryQuery,

  // Refunds
  useCreateRefundMutation,
  useGetRefundsByPaymentQuery,
  useGetRefundsByAccountQuery,

  // Sessions
  useGetFeeSessionsQuery,

  // FLEXIBLE Pay (NEW)
  useFlexiblePayMutation,
  useGetFlexibleHistoryQuery,

  // THREE_INSTALLMENT (NEW)
  useGetThreeInstallmentsQuery,
  usePayThreeInstallmentMutation,
} = feeApi;

