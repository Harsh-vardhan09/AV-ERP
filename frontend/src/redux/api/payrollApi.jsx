import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import toast from 'react-hot-toast';
import { prepareAuthHeaders } from './authHeader';

const BASE = `${import.meta.env.VITE_PORT}/api/v1/payroll`;

const baseQuery = fetchBaseQuery({ baseUrl: BASE, credentials: 'include', prepareHeaders: prepareAuthHeaders });

const baseQueryWithToast = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error) {
    const msg = result.error?.data?.message || 'Something went wrong';
    if (result.error.status === 401) toast.error('Session expired. Please login again.');
    else if (result.error.status === 403) toast.error('Access denied.');
    else toast.error(msg);
  }
  return result;
};

export const payrollApi = createApi({
  reducerPath: 'payrollApi',
  baseQuery: baseQueryWithToast,
  tagTypes: ['PayrollRun', 'Payslip', 'SalaryComponent', 'SalaryStructure',
    'EmployeeSalary', 'TaxConfig', 'Attendance', 'PaymentBatch', 'Report'],

  endpoints: (builder) => ({

    // ── Payroll Runs ──────────────────────────────────────────────────────
    getPayrollRuns: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/runs?${qs}` : '/runs';
      },
      providesTags: ['PayrollRun'],
    }),
    getPayrollRunById: builder.query({
      query: (id) => `/runs/${id}`,
      providesTags: ['PayrollRun'],
    }),
    getPayrollStatus: builder.query({
      query: (id) => `/runs/${id}/status`,
      providesTags: ['PayrollRun'],
    }),
    createPayrollRun: builder.mutation({
      query: (body) => ({ url: '/runs', method: 'POST', body }),
      invalidatesTags: ['PayrollRun'],
    }),
    processPayroll: builder.mutation({
      query: (id) => ({ url: `/runs/${id}/process`, method: 'POST' }),
      invalidatesTags: ['PayrollRun', 'Payslip'],
    }),
    approvePayroll: builder.mutation({
      query: (id) => ({ url: `/runs/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['PayrollRun'],
    }),
    lockPayroll: builder.mutation({
      query: (id) => ({ url: `/runs/${id}/lock`, method: 'POST' }),
      invalidatesTags: ['PayrollRun'],
    }),
    cancelPayroll: builder.mutation({
      query: (id) => ({ url: `/runs/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['PayrollRun'],
    }),
    unlockPayroll: builder.mutation({
      query: (id) => ({ url: `/runs/${id}/unlock`, method: 'POST' }),
      invalidatesTags: ['PayrollRun'],
    }),

    // ── Academic Sessions (reads from admin API) ──────────────────────────
    getAcademicSessions: builder.query({
      queryFn: async () => {
        try {
          const resp = await fetch(
            `${import.meta.env.VITE_PORT}/api/v1/admin/sessions`,
            { credentials: 'include' }
          );
          const data = await resp.json();
          return { data };
        } catch (e) {
          return { error: { status: 'FETCH_ERROR', error: e.message } };
        }
      },
    }),

    // ── Auto-mark attendance ───────────────────────────────────────────────
    autoMarkAttendance: builder.mutation({
      query: (body) => ({ url: '/attendance/auto-mark-monthly', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),

    // ── Payslips ──────────────────────────────────────────────────────────
    getPayslips: builder.query({
      query: (params = {}) => {
        if (typeof params === 'string') return `/payslips?payrollId=${params}`;
        const qs = new URLSearchParams(params).toString();
        return qs ? `/payslips?${qs}` : '/payslips';
      },
      providesTags: ['Payslip'],
    }),
    getPayslipById: builder.query({
      query: (id) => `/payslips/${id}`,
      providesTags: ['Payslip'],
    }),
    getMyPayslips: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/payslips/mine?${qs}` : '/payslips/mine';
      },
      providesTags: ['Payslip'],
    }),
    resendPayslip: builder.mutation({
      query: (id) => ({ url: `/payslips/${id}/resend-email`, method: 'POST' }),
    }),
    downloadPayslip: builder.query({
      query: (id) => `/payslips/${id}/download`,
    }),

    // ── Salary Components ─────────────────────────────────────────────────
    getComponents: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/components?${qs}` : '/components';
      },
      providesTags: ['SalaryComponent'],
    }),
    createComponent: builder.mutation({
      query: (body) => ({ url: '/components', method: 'POST', body }),
      invalidatesTags: ['SalaryComponent'],
    }),
    updateComponent: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/components/${id}`, method: 'PUT', body }),
      invalidatesTags: ['SalaryComponent'],
    }),
    toggleComponent: builder.mutation({
      query: (id) => ({ url: `/components/${id}/toggle`, method: 'PATCH' }),
      invalidatesTags: ['SalaryComponent'],
    }),
    seedComponents: builder.mutation({
      query: () => ({ url: '/components/seed', method: 'POST' }),
      invalidatesTags: ['SalaryComponent'],
    }),

    // ── Salary Structures ─────────────────────────────────────────────────
    getStructures: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/structures?${qs}` : '/structures';
      },
      providesTags: ['SalaryStructure'],
    }),
    getSalaryStructureById: builder.query({
      query: (id) => `/structures/${id}`,
      providesTags: ['SalaryStructure'],
    }),
    createStructure: builder.mutation({
      query: (body) => ({ url: '/structures', method: 'POST', body }),
      invalidatesTags: ['SalaryStructure'],
    }),
    updateStructure: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/structures/${id}`, method: 'PUT', body }),
      invalidatesTags: ['SalaryStructure'],
    }),
    cloneStructure: builder.mutation({
      query: (id) => ({ url: `/structures/${id}/clone`, method: 'POST' }),
      invalidatesTags: ['SalaryStructure'],
    }),
    deleteStructure: builder.mutation({
      query: (id) => ({ url: `/structures/${id}`, method: 'DELETE' }),
      invalidatesTags: ['SalaryStructure'],
    }),

    // ── Employee Salaries ─────────────────────────────────────────────────
    getEmployeeSalaries: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/employee-salaries?${qs}` : '/employee-salaries';
      },
      providesTags: ['EmployeeSalary'],
    }),
    getUnassignedEmployees: builder.query({
      query: () => '/employee-salaries/unassigned',
      providesTags: ['EmployeeSalary'],
    }),
    getSalaryHistory: builder.query({
      query: (teacherId) => `/employee-salaries/${teacherId}/history`,
      providesTags: ['EmployeeSalary'],
    }),
    getEmployeeSalaryById: builder.query({
      query: (id) => `/employee-salaries/${id}`,
      providesTags: ['EmployeeSalary'],
    }),
    assignEmployeeSalary: builder.mutation({
      query: (body) => ({ url: '/employee-salaries', method: 'POST', body }),
      invalidatesTags: ['EmployeeSalary'],
    }),
    // alias used by EmployeeSalaryManager
    createEmployeeSalary: builder.mutation({
      query: (body) => ({ url: '/employee-salaries', method: 'POST', body }),
      invalidatesTags: ['EmployeeSalary'],
    }),
    reviseEmployeeSalary: builder.mutation({
      query: (body) => ({ url: '/employee-salaries/revise', method: 'POST', body }),
      invalidatesTags: ['EmployeeSalary'],
    }),
    updateEmployeeSalary: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/employee-salaries/${id}`, method: 'PUT', body }),
      invalidatesTags: ['EmployeeSalary'],
    }),
    deleteEmployeeSalary: builder.mutation({
      query: (id) => ({ url: `/employee-salaries/${id}`, method: 'DELETE' }),
      invalidatesTags: ['EmployeeSalary'],
    }),

    // ── Tax Config ────────────────────────────────────────────────────────
    getTaxConfigs: builder.query({
      query: () => '/tax-config',
      providesTags: ['TaxConfig'],
    }),
    getTaxTemplate: builder.query({
      query: () => '/tax-config/template',
      providesTags: ['TaxConfig'],
    }),
    createTaxConfig: builder.mutation({
      query: (body) => ({ url: '/tax-config', method: 'POST', body }),
      invalidatesTags: ['TaxConfig'],
    }),
    updateTaxConfig: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/tax-config/${id}`, method: 'PUT', body }),
      invalidatesTags: ['TaxConfig'],
    }),
    toggleTaxConfig: builder.mutation({
      query: (id) => ({ url: `/tax-config/${id}/activate`, method: 'POST' }),
      invalidatesTags: ['TaxConfig'],
    }),
    deleteTaxConfig: builder.mutation({
      query: (id) => ({ url: `/tax-config/${id}`, method: 'DELETE' }),
      invalidatesTags: ['TaxConfig'],
    }),

    // ── Attendance ────────────────────────────────────────────────────────
    getAttendance: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/attendance?${qs}` : '/attendance';
      },
      providesTags: ['Attendance'],
    }),
    getAttendanceSummary: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/attendance/summary?${qs}` : '/attendance/summary';
      },
      providesTags: ['Attendance'],
    }),
    markAttendance: builder.mutation({
      query: (body) => ({ url: '/attendance', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),
    bulkAttendance: builder.mutation({
      query: (body) => ({ url: '/attendance/bulk', method: 'POST', body }),
      invalidatesTags: ['Attendance'],
    }),

    // ── Payment Batches ───────────────────────────────────────────────────
    getPaymentBatch: builder.query({
      query: (runId) => `/payment-batches/by-run/${runId}`,
      providesTags: ['PaymentBatch'],
    }),
    getPaymentBatches: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/payment-batches?${qs}` : '/payment-batches';
      },
      providesTags: ['PaymentBatch'],
    }),
    createPaymentBatch: builder.mutation({
      query: (body) => ({ url: '/payment-batches', method: 'POST', body }),
      invalidatesTags: ['PaymentBatch', 'Payslip'],
    }),

    // ── Reports ───────────────────────────────────────────────────────────
    getPayrollReport: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/reports/payroll?${qs}` : '/reports/payroll';
      },
    }),
    getTdsReport: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/reports/tds?${qs}` : '/reports/tds';
      },
    }),
    getPfReport: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/reports/pf?${qs}` : '/reports/pf';
      },
    }),
    getEsiReport: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `/reports/esi?${qs}` : '/reports/esi';
      },
    }),
  }),
});

export const {
  // Payroll Runs
  useGetPayrollRunsQuery,
  useGetPayrollRunByIdQuery,
  useGetPayrollStatusQuery,
  useCreatePayrollRunMutation,
  useProcessPayrollMutation,
  useApprovePayrollMutation,
  useLockPayrollMutation,
  useCancelPayrollMutation,
  useUnlockPayrollMutation,
  // Academic Sessions
  useGetAcademicSessionsQuery,
  // Auto-mark
  useAutoMarkAttendanceMutation,
  // Payslips
  useGetPayslipsQuery,
  useGetPayslipByIdQuery,
  useGetMyPayslipsQuery,
  useResendPayslipMutation,
  useDownloadPayslipQuery,
  // alias for pages that use useDownloadPayslipMutation
  // Components
  useGetComponentsQuery,
  useCreateComponentMutation,
  useUpdateComponentMutation,
  useToggleComponentMutation,
  useSeedComponentsMutation,
  // Structures
  useGetStructuresQuery,
  useGetSalaryStructureByIdQuery,
  useCreateStructureMutation,
  useUpdateStructureMutation,
  useCloneStructureMutation,
  useDeleteStructureMutation,
  // Employee Salaries
  useGetEmployeeSalariesQuery,
  useGetUnassignedEmployeesQuery,
  useGetSalaryHistoryQuery,
  useGetEmployeeSalaryByIdQuery,
  useAssignEmployeeSalaryMutation,
  useCreateEmployeeSalaryMutation,
  useReviseEmployeeSalaryMutation,
  useUpdateEmployeeSalaryMutation,
  useDeleteEmployeeSalaryMutation,
  // Tax Config
  useGetTaxConfigsQuery,
  useGetTaxTemplateQuery,
  useCreateTaxConfigMutation,
  useUpdateTaxConfigMutation,
  useToggleTaxConfigMutation,
  useDeleteTaxConfigMutation,
  // Attendance
  useGetAttendanceQuery,
  useGetAttendanceSummaryQuery,
  useMarkAttendanceMutation,
  useBulkAttendanceMutation,
  // Payment Batches
  useGetPaymentBatchQuery,
  useGetPaymentBatchesQuery,
  useCreatePaymentBatchMutation,
  // Reports
  useGetPayrollReportQuery,
  useGetTdsReportQuery,
  useGetPfReportQuery,
  useGetEsiReportQuery,
} = payrollApi;
