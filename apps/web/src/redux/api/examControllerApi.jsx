/**
 * Exam Controller API Slice
 * ─────────────────────────────────────────────────────────────────────────
 * Connects to /api/v1/exam-controller/* which is guarded by the
 * `exam_controller` role on the backend.
 * - Exam CRUD reuses admin controller functions (no duplication).
 * - Marks functions reuse teacher controller with MARKS_ALL_ACCESS bypass.
 * - All school isolation enforced server-side via req.schoolId.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/exam-controller/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const examControllerApi = createApi({
  reducerPath: 'examControllerApi',
  baseQuery,
  tagTypes: ['ECMarks', 'ECAudit', 'ECExams', 'ECExamSubject', 'ECTemplate'],
  endpoints: (builder) => ({

    // ── Reference data ──────────────────────────────────────────────────────
    getECActiveSession: builder.query({
      query: () => '/session/active',
    }),
    getECSessions: builder.query({
      query: () => '/sessions',
    }),
    getECClasses: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/classes?${search}` : '/classes';
      },
    }),
    getECSections: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/sections?${search}` : '/sections';
      },
    }),

    // ── Report templates (for exam creation / template-linking UI) ───────────
    getECTemplates: builder.query({
      query: () => '/report-templates',
      providesTags: ['ECTemplate'],
    }),

    // ── Exam-scoped subjects (ExamSubjectConfig) ─────────────────────────────
    // Only subjects configured for a specific exam+class — single source of truth
    getECExamSubjects: builder.query({
      query: ({ examId, classId } = {}) => {
        let url = `/exam-subjects/${examId}`;
        if (classId) url += `?classId=${classId}`;
        return url;
      },
      providesTags: ['ECExamSubject'],
    }),
    addECExamSubject: builder.mutation({
      query: (data) => ({ url: '/exam-subject', method: 'POST', body: data }),
      invalidatesTags: ['ECExamSubject'],
    }),
    updateECExamSubject: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/exam-subject/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['ECExamSubject'],
    }),
    removeECExamSubject: builder.mutation({
      query: (id) => ({ url: `/exam-subject/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ECExamSubject'],
    }),

    // ── Exam Management CRUD (same admin controllers, EC-authorised routes) ───
    createECExam: builder.mutation({
      query: (data) => ({ url: '/exam', method: 'POST', body: data }),
      invalidatesTags: ['ECExams'],
    }),
    getECAllExams: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/exams?${search}` : '/exams';
      },
      providesTags: ['ECExams'],
    }),
    getECExam: builder.query({
      query: (id) => `/exam/${id}`,
      providesTags: (result, error, id) => [{ type: 'ECExams', id }],
    }),
    updateECExam: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/exam/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['ECExams'],
    }),
    deleteECExam: builder.mutation({
      query: (id) => ({ url: `/exam/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ECExams'],
    }),
    startECExamEvaluation: builder.mutation({
      query: (id) => ({ url: `/exam/${id}/start-evaluation`, method: 'PATCH' }),
      invalidatesTags: ['ECExams'],
    }),
    completeECExamEvaluation: builder.mutation({
      query: (id) => ({ url: `/exam/${id}/complete-evaluation`, method: 'PATCH' }),
      invalidatesTags: ['ECExams'],
    }),
    linkECTemplateToExam: builder.mutation({
      query: ({ examId, templateId }) => ({
        url: `/exam/${examId}/template`,
        method: 'PATCH',
        body: { templateId },
      }),
      invalidatesTags: ['ECExams'],
    }),

    // ── my-exams: all school exams for EC (no assignment filter) ────────────
    getECExams: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/my-exams?${search}` : '/my-exams';
      },
      providesTags: ['ECExams'],
    }),

    // ── Exam template resolution (dynamic form field generation) ────────────
    getECExamTemplate: builder.query({
      query: ({ examId, classId } = {}) => {
        const params = new URLSearchParams();
        if (examId) params.set('examId', examId);
        if (classId) params.set('classId', classId);
        return `/template?${params.toString()}`;
      },
      providesTags: ['ECMarks'],
    }),

    // ── Students for marks entry ─────────────────────────────────────────────
    getECStudentsForMarks: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/students-for-marks?${search}`;
      },
    }),

    // ── Upload marks (manual) ────────────────────────────────────────────────
    uploadECMarks: builder.mutation({
      query: (data) => ({ url: '/marks', method: 'POST', body: data }),
      invalidatesTags: ['ECMarks', 'ECAudit'],
    }),

    // ── Upload marks (Excel) ─────────────────────────────────────────────────
    uploadECMarksExcel: builder.mutation({
      query: (formData) => ({ url: '/marks/excel', method: 'POST', body: formData }),
      invalidatesTags: ['ECMarks', 'ECAudit'],
    }),

    // ── Read marks ───────────────────────────────────────────────────────────
    getECMarks: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/marks?${search}` : '/marks';
      },
      providesTags: ['ECMarks'],
    }),

    // ── Audit log ────────────────────────────────────────────────────────────
    getECAuditLog: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/marks-audit-log?${search}` : '/marks-audit-log';
      },
      providesTags: ['ECAudit'],
    }),
  }),
});

export const {
  useGetECActiveSessionQuery,
  useGetECSessionsQuery,
  useGetECClassesQuery,
  useGetECSectionsQuery,
  useGetECTemplatesQuery,
  useGetECExamSubjectsQuery,
  useAddECExamSubjectMutation,
  useUpdateECExamSubjectMutation,
  useRemoveECExamSubjectMutation,
  useCreateECExamMutation,
  useGetECAllExamsQuery,
  useGetECExamQuery,
  useUpdateECExamMutation,
  useDeleteECExamMutation,
  useStartECExamEvaluationMutation,
  useCompleteECExamEvaluationMutation,
  useLinkECTemplateToExamMutation,
  useGetECExamsQuery,
  useGetECExamTemplateQuery,
  useGetECStudentsForMarksQuery,
  useUploadECMarksMutation,
  useUploadECMarksExcelMutation,
  useGetECMarksQuery,
  useGetECAuditLogQuery,
} = examControllerApi;
