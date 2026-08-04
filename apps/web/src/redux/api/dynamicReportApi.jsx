import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/dynamic-reports/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const dynamicReportApi = createApi({
  reducerPath: 'dynamicReportApi',
  baseQuery,
  tagTypes: ['DynamicReport', 'DynamicReportList', 'DynamicReportStats', 'MyReportCard'],
  endpoints: (builder) => ({
    // ── Student self-service ────────────────────────────────────────────
    // The server derives the student from the auth cookie — no id is sent.
    getMyReportCard: builder.query({
      query: ({ examId, session } = {}) => {
        const params = new URLSearchParams();
        if (examId) params.append('examId', examId);
        if (session) params.append('session', session);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return `/my-report-card${suffix}`;
      },
      providesTags: (result, error, arg) => [
        { type: 'MyReportCard', id: `${arg?.examId || 'all'}-${arg?.session || 'current'}` },
      ],
    }),

    // Returns the PDF as a Blob. A mutation, not a query, so the binary is
    // never retained in the redux cache.
    downloadMyReportCard: builder.mutation({
      query: ({ examId, session } = {}) => {
        const params = new URLSearchParams();
        if (examId) params.append('examId', examId);
        if (session) params.append('session', session);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return {
          url: `/my-report-card/download${suffix}`,
          method: 'GET',
          cache: 'no-cache',
          responseHandler: (response) =>
            response.ok ? response.blob() : response.json(),
        };
      },
    }),

    // Generate single report
    generateDynamicReport: builder.mutation({
      query: (data) => ({
        url: '/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'DynamicReportList' }, { type: 'DynamicReportStats' }],
    }),

    // Generate bulk reports
    generateBulkDynamicReports: builder.mutation({
      query: (data) => ({
        url: '/generate-bulk',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'DynamicReportList' }, { type: 'DynamicReportStats' }],
    }),

    // Get preview HTML for a student
    getDynamicReportPreview: builder.query({
      query: ({ studentId, templateId, academicYear, examType }) => {
        const params = new URLSearchParams();
        if (templateId) params.append('templateId', templateId);
        if (academicYear) params.append('academicYear', academicYear);
        if (examType) params.append('examType', examType);
        return `/preview/${studentId}?${params.toString()}`;
      },
      providesTags: (result, error, arg) => [
        { type: 'DynamicReport', id: `preview-${arg?.studentId}` },
      ],
    }),

    // Download report (returns URL)
    getDynamicReportDownloadUrl: builder.query({
      query: (reportId) => `/download/${reportId}`,
    }),

    // Get generated reports list
    getDynamicReports: builder.query({
      query: ({ page = 1, limit = 20, studentId, academicYear, examType } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (studentId) params.append('studentId', studentId);
        if (academicYear) params.append('academicYear', academicYear);
        if (examType) params.append('examType', examType);
        return `?${params.toString()}`;
      },
      providesTags: [{ type: 'DynamicReportList' }],
    }),

    // Delete generated report
    deleteDynamicReport: builder.mutation({
      query: (reportId) => ({
        url: `/${reportId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'DynamicReportList' }, { type: 'DynamicReportStats' }],
    }),

    // Get report statistics
    getDynamicReportStats: builder.query({
      query: () => '/stats',
      providesTags: [{ type: 'DynamicReportStats' }],
    }),
  }),
});

export const {
  useGenerateDynamicReportMutation,
  useGenerateBulkDynamicReportsMutation,
  useGetDynamicReportPreviewQuery,
  useGetDynamicReportDownloadUrlQuery,
  useGetDynamicReportsQuery,
  useDeleteDynamicReportMutation,
  useGetDynamicReportStatsQuery,
  useGetMyReportCardQuery,
  useDownloadMyReportCardMutation,
} = dynamicReportApi;
