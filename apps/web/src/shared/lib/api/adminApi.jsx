import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from '@shared/lib/authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/admin/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery,
  tagTypes: ['Session', 'Class', 'Section', 'Subject', 'ClassSubject', 'TeacherAssignment', 'ClassTeacher', 'Exam', 'ExamSubject', 'Dashboard', 'TeacherLeave', 'Template', 'Student', 'Teacher', 'Marks'],
  endpoints: (builder) => ({
    // === SESSIONS ===
    createSession: builder.mutation({
      query: (data) => ({ url: '/session', method: 'POST', body: data }),
      invalidatesTags: ['Session', 'Dashboard'],
    }),
    getSessions: builder.query({
      query: () => '/sessions',
      providesTags: ['Session'],
    }),
    getActiveSession: builder.query({
      query: () => '/session/active',
      providesTags: ['Session'],
    }),
    updateSession: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/session/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Session'],
    }),
    deleteSession: builder.mutation({
      query: (id) => ({ url: `/session/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Session'],
    }),
    copyClassesToSession: builder.mutation({
      query: ({ id, fromSessionId }) => ({
        url: `/session/${id}/copy-classes`,
        method: 'POST',
        body: fromSessionId ? { fromSessionId } : {},
      }),
      invalidatesTags: ['Class', 'Section', 'Dashboard'],
    }),
    syncStudentSessions: builder.mutation({
      query: (id) => ({ url: `/session/${id}/sync-students`, method: 'POST', body: {} }),
      invalidatesTags: ['Student', 'Dashboard'],
    }),
    copySubjectMapsToSession: builder.mutation({
      query: ({ id, fromSessionId }) => ({
        url: `/session/${id}/copy-subject-maps`,
        method: 'POST',
        body: fromSessionId ? { fromSessionId } : {},
      }),
      invalidatesTags: ['Session'],
    }),
    copyTeacherAssignmentsToSession: builder.mutation({
      query: ({ id, fromSessionId }) => ({
        url: `/session/${id}/copy-teacher-assignments`,
        method: 'POST',
        body: fromSessionId ? { fromSessionId } : {},
      }),
      invalidatesTags: ['Session'],
    }),

    // === CLASSES ===
    createClass: builder.mutation({
      query: (data) => ({ url: '/class', method: 'POST', body: data }),
      invalidatesTags: ['Class', 'Dashboard'],
    }),
    getClasses: builder.query({
      query: (session) => session ? `/classes?session=${session}` : '/classes',
      providesTags: ['Class'],
    }),
    updateClass: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/class/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Class'],
    }),
    deleteClass: builder.mutation({
      query: (id) => ({ url: `/class/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Class'],
    }),

    // === SECTIONS ===
    createSection: builder.mutation({
      query: (data) => ({ url: '/section', method: 'POST', body: data }),
      invalidatesTags: ['Section'],
    }),
    createBulkSections: builder.mutation({
      query: (data) => ({ url: '/sections/bulk', method: 'POST', body: data }),
      invalidatesTags: ['Section'],
    }),
    getSections: builder.query({
      query: ({ classId, session } = {}) => {
        const params = new URLSearchParams();
        if (classId) params.append('classId', classId);
        if (session) params.append('session', session);
        return `/sections?${params.toString()}`;
      },
      providesTags: ['Section'],
    }),
    updateSection: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/section/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Section'],
    }),
    deleteSection: builder.mutation({
      query: (id) => ({ url: `/section/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Section'],
    }),

    // === SUBJECTS ===
    createSubject: builder.mutation({
      query: (data) => ({ url: '/subject', method: 'POST', body: data }),
      invalidatesTags: ['Subject', 'Dashboard'],
    }),
    getSubjects: builder.query({
      query: () => '/subjects',
      providesTags: ['Subject'],
    }),
    updateSubject: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/subject/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Subject'],
    }),
    deleteSubject: builder.mutation({
      query: (id) => ({ url: `/subject/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Subject'],
    }),

    // === CLASS-SUBJECT MAPPING ===
    mapSubjectToClass: builder.mutation({
      query: (data) => ({ url: '/class-subject-map', method: 'POST', body: data }),
      invalidatesTags: ['ClassSubject'],
    }),
    getClassSubjects: builder.query({
      query: ({ classId, session } = {}) => {
        const params = new URLSearchParams();
        if (classId) params.append('classId', classId);
        if (session) params.append('session', session);
        return `/class-subjects?${params.toString()}`;
      },
      providesTags: ['ClassSubject'],
    }),
    removeClassSubjectMapping: builder.mutation({
      query: (id) => ({ url: `/class-subject-map/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ClassSubject'],
    }),

    // === TEACHER-SUBJECT ASSIGNMENT ===
    assignTeacherToSubject: builder.mutation({
      query: (data) => ({ url: '/teacher-assignment', method: 'POST', body: data }),
      invalidatesTags: ['TeacherAssignment'],
    }),
    getTeacherAssignments: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/teacher-assignments?${search}`;
      },
      providesTags: ['TeacherAssignment'],
    }),
    removeTeacherAssignment: builder.mutation({
      query: (id) => ({ url: `/teacher-assignment/${id}`, method: 'DELETE' }),
      invalidatesTags: ['TeacherAssignment'],
    }),
    updateTeacherAssignment: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/teacher-assignment/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['TeacherAssignment'],
    }),

    // === CLASS TEACHER ASSIGNMENT ===
    assignClassTeacher: builder.mutation({
      query: (data) => ({ url: '/class-teacher', method: 'POST', body: data }),
      invalidatesTags: ['ClassTeacher'],
    }),
    getClassTeachers: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/class-teachers?${search}`;
      },
      providesTags: ['ClassTeacher'],
    }),
    removeClassTeacher: builder.mutation({
      query: (id) => ({ url: `/class-teacher/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ClassTeacher'],
    }),
    updateClassTeacher: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/class-teacher/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['ClassTeacher'],
    }),

    // === EXAM MANAGEMENT ===
    createExam: builder.mutation({
      query: (data) => ({ url: '/exam', method: 'POST', body: data }),
      invalidatesTags: ['Exam'],
    }),
    getExams: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/exams?${search}`;
      },
      providesTags: ['Exam'],
    }),
    getExam: builder.query({
      query: (id) => `/exam/${id}`,
      providesTags: (result, error, id) => [{ type: 'Exam', id }],
    }),
    updateExam: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/exam/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Exam'],
    }),
    // confirmDeleteMarks must equal the server's current count — the server
    // refuses a bare delete when marks exist rather than destroying them.
    deleteExam: builder.mutation({
      query: (arg) => {
        const { id, confirmDeleteMarks } = typeof arg === 'object' ? arg : { id: arg };
        return {
          url: `/exam/${id}`,
          method: 'DELETE',
          params: confirmDeleteMarks != null ? { confirmDeleteMarks } : undefined,
        };
      },
      invalidatesTags: ['Exam', 'Marks'],
    }),
    archiveExam: builder.mutation({
      query: (id) => ({ url: `/exam/${id}/archive`, method: 'PATCH' }),
      invalidatesTags: ['Exam', 'Marks'],
    }),
    restoreExam: builder.mutation({
      query: (id) => ({ url: `/exam/${id}/restore`, method: 'PATCH' }),
      invalidatesTags: ['Exam', 'Marks'],
    }),
    unlockExam: builder.mutation({
      query: (id) => ({ url: `/exam/${id}/unlock`, method: 'PATCH' }),
      invalidatesTags: ['Exam'],
    }),
    startExamEvaluation: builder.mutation({
      query: (id) => ({ url: `/exam/${id}/start-evaluation`, method: 'PATCH' }),
      invalidatesTags: ['Exam'],
    }),
    completeExamEvaluation: builder.mutation({
      query: (id) => ({ url: `/exam/${id}/complete-evaluation`, method: 'PATCH' }),
      invalidatesTags: ['Exam'],
    }),
    // Link / unlink a report template to an exam
    linkTemplateToExam: builder.mutation({
      query: ({ examId, templateId }) => ({
        url: `/exam/${examId}/template`,
        method: 'PATCH',
        body: { templateId },
      }),
      invalidatesTags: ['Exam'],
    }),

    // Fetch school's report templates (for admin exam-template linking UI)
    getAdminTemplates: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/report-templates?${search}` : '/report-templates';
      },
      providesTags: ['Template'],
    }),

    // === EXAM SUBJECT CONFIG ===
    addExamSubject: builder.mutation({
      query: (data) => ({ url: '/exam-subject', method: 'POST', body: data }),
      invalidatesTags: ['ExamSubject'],
    }),
    getExamSubjects: builder.query({
      query: ({ examId, classId } = {}) => {
        let url = `/exam-subjects/${examId}`;
        if (classId) url += `?classId=${classId}`;
        return url;
      },
      providesTags: ['ExamSubject'],
    }),
    updateExamSubject: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/exam-subject/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['ExamSubject'],
    }),
    removeExamSubject: builder.mutation({
      query: (id) => ({ url: `/exam-subject/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ExamSubject'],
    }),

    // === MARKS AUDIT LOG ===
    getMarksAuditLog: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/marks-audit-log?${search}`;
      },
      providesTags: ['Marks'],
    }),

    // === TEACHER LEAVE ===
    getTeacherLeaves: builder.query({
      query: (status) => status ? `/teacher-leaves?status=${status}` : '/teacher-leaves',
      providesTags: ['TeacherLeave'],
    }),
    approveTeacherLeave: builder.mutation({
      query: ({ id, status }) => ({
        url: `/teacher-leave/${id}`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['TeacherLeave', 'Dashboard'],
    }),

    // === DASHBOARD ===
    getDashboardStats: builder.query({
      query: () => '/dashboard',
      providesTags: ['Dashboard'],
    }),
    getAdminKnowledgeMaterials: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/knowledge-center?${search}`;
      },
      providesTags: ['Material'],
    }),
    getAdminStudents: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/students?${search}`;
      },
      providesTags: ['Student'],
    }),
    getAdminStudentDetail: builder.query({
      query: (id) => `/students/${id}`,
      providesTags: ['Student'],
    }),
    getAdminTeachers: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/teachers?${search}`;
      },
      providesTags: ['Teacher'],
    }),
    getAdminTeacherDetail: builder.query({
      query: (id) => `/teachers/${id}`,
      providesTags: ['Teacher'],
    }),

    // === DASHBOARD DETAIL (card click-through) ===
    getAllStudentsAdmin: builder.query({
      query: () => '/all-students',
      providesTags: ['Student'],
    }),
    getAllTeachersAdmin: builder.query({
      query: () => '/all-teachers',
      providesTags: ['Teacher'],
    }),
    getAllClassesAdmin: builder.query({
      query: () => '/all-classes',
      providesTags: ['Class'],
    }),
    getAllSubjectsAdmin: builder.query({
      query: () => '/all-subjects',
      providesTags: ['Subject'],
    }),
    // === DASHBOARD ===
    getDashboardAnalytics: builder.query({
      query: () => '/dashboard/analytics',
      providesTags: ['Dashboard'],
    }),
  }),
});

export const {
  useCreateSessionMutation, useGetSessionsQuery, useGetActiveSessionQuery, useUpdateSessionMutation, useDeleteSessionMutation,
  useCopyClassesToSessionMutation, useSyncStudentSessionsMutation,
  useCopySubjectMapsToSessionMutation, useCopyTeacherAssignmentsToSessionMutation,
  useCreateClassMutation, useGetClassesQuery, useUpdateClassMutation, useDeleteClassMutation,
  useCreateSectionMutation, useCreateBulkSectionsMutation, useGetSectionsQuery, useUpdateSectionMutation, useDeleteSectionMutation,
  useCreateSubjectMutation, useGetSubjectsQuery, useUpdateSubjectMutation, useDeleteSubjectMutation,
  useMapSubjectToClassMutation, useGetClassSubjectsQuery, useRemoveClassSubjectMappingMutation,
  useAssignTeacherToSubjectMutation, useGetTeacherAssignmentsQuery, useRemoveTeacherAssignmentMutation, useUpdateTeacherAssignmentMutation,
  useAssignClassTeacherMutation, useGetClassTeachersQuery, useRemoveClassTeacherMutation, useUpdateClassTeacherMutation,
  useCreateExamMutation, useGetExamsQuery, useGetExamQuery, useUpdateExamMutation, useDeleteExamMutation, useStartExamEvaluationMutation, useCompleteExamEvaluationMutation,
  useArchiveExamMutation, useRestoreExamMutation, useUnlockExamMutation,
  useLinkTemplateToExamMutation, useGetAdminTemplatesQuery,
  useAddExamSubjectMutation, useGetExamSubjectsQuery, useUpdateExamSubjectMutation, useRemoveExamSubjectMutation,
  useGetMarksAuditLogQuery,
  useGetTeacherLeavesQuery, useApproveTeacherLeaveMutation,
  useGetDashboardStatsQuery,
  useGetDashboardAnalyticsQuery,
  useGetAdminKnowledgeMaterialsQuery,
  useGetAdminStudentsQuery, useGetAdminStudentDetailQuery,
  useGetAdminTeachersQuery, useGetAdminTeacherDetailQuery,
  useGetAllStudentsAdminQuery, useLazyGetAllStudentsAdminQuery,
  useGetAllTeachersAdminQuery, useLazyGetAllTeachersAdminQuery,
  useGetAllClassesAdminQuery, useLazyGetAllClassesAdminQuery,
  useGetAllSubjectsAdminQuery, useLazyGetAllSubjectsAdminQuery,
} = adminApi;
