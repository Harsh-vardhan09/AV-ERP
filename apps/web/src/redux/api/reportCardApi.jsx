import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/report-card/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const reportCardApi = createApi({
  reducerPath: 'reportCardApi',
  baseQuery,
  tagTypes: ['ReportCard', 'ReportCardList', 'ReportCardExams', 'ReportCardReadiness'],
  endpoints: (builder) => ({
    getReportCard: builder.query({
      query: ({ studentId, session } = {}) => {
        const params = new URLSearchParams();
        if (session) params.append('session', session);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return `/${studentId}${suffix}`;
      },
      providesTags: (result, error, arg) => [
        { type: 'ReportCard', id: arg?.studentId },
      ],
    }),

    // Fetch the exam list for a class — used by ReportCardEditor to build dynamic columns
    getReportCardExams: builder.query({
      query: ({ classId, session } = {}) => {
        const params = new URLSearchParams();
        if (classId) params.append('classId', classId);
        if (session) params.append('session', session);
        return `/exams?${params.toString()}`;
      },
      providesTags: (result, error, arg) => [
        { type: 'ReportCardExams', id: `${arg?.classId}-${arg?.session}` },
      ],
    }),

    // Per-subject marks submission status for a class+exam.
    // Omit examId to get readiness for every exam in the session.
    getMarksReadiness: builder.query({
      query: ({ classId, examId, sectionId, session } = {}) => {
        const params = new URLSearchParams();
        if (classId) params.append('classId', classId);
        if (examId) params.append('examId', examId);
        if (sectionId) params.append('sectionId', sectionId);
        if (session) params.append('session', session);
        return `/readiness?${params.toString()}`;
      },
      providesTags: (result, error, arg) => [
        { type: 'ReportCardReadiness', id: `${arg?.classId}-${arg?.examId || 'all'}` },
      ],
    }),

    updateReportCard: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error) => {
        if (error) return [];
        const studentId = result?.data?.student?._id;
        if (!studentId) {
          return [{ type: 'ReportCardList', id: 'CLASS' }];
        }
        return [
          { type: 'ReportCard', id: String(studentId) },
          { type: 'ReportCard', id: 'me' },
          { type: 'ReportCardList', id: 'CLASS' },
        ];
      },
    }),

    generateReportCards: builder.mutation({
      query: (data) => ({
        url: '/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'ReportCardList', id: 'CLASS' }],
    }),

    finalizeReportCard: builder.mutation({
      query: (id) => ({
        url: `/finalize/${id}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error) =>
        error ? [] : [{ type: 'ReportCard' }, { type: 'ReportCardList', id: 'CLASS' }],
    }),

    unlockReportCard: builder.mutation({
      query: (id) => ({
        url: `/unlock/${id}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error) =>
        error ? [] : [{ type: 'ReportCard' }, { type: 'ReportCardList', id: 'CLASS' }],
    }),

    getClassReportCards: builder.query({
      query: ({ classId, sectionId, session, search } = {}) => {
        const params = new URLSearchParams();
        if (sectionId) params.append('sectionId', sectionId);
        if (session) params.append('session', session);
        if (search) params.append('search', search);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        return `/class/${classId}${suffix}`;
      },
      providesTags: [{ type: 'ReportCardList', id: 'CLASS' }],
    }),
  }),
});

export const {
  useGetReportCardQuery,
  useGetReportCardExamsQuery,
  useUpdateReportCardMutation,
  useGenerateReportCardsMutation,
  useFinalizeReportCardMutation,
  useUnlockReportCardMutation,
  useGetClassReportCardsQuery,
  useGetMarksReadinessQuery,
} = reportCardApi;
