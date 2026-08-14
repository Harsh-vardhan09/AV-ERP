import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from '@shared/lib/authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/teacher/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const teacherApi = createApi({
  reducerPath: 'teacherApi',
  baseQuery,
  tagTypes: ['MyAssignment', 'Attendance', 'TeacherLeave', 'StudentLeave', 'Assignment', 'Material', 'Marks', 'MyStudents', 'Exam', 'CoScholastic'],
  endpoints: (builder) => ({
    // My assignments (what I teach)
    getMyAssignments: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/my-assignments?${search}` : '/my-assignments';
      },
      providesTags: ['MyAssignment'],
    }),
    getMyClassTeacher: builder.query({
      query: () => '/my-class-teacher',
      providesTags: ['MyAssignment'],
    }),

    // Attendance
    takeAttendance: builder.mutation({
      query: (data) => ({ url: '/attendance', method: 'POST', body: data }),
      invalidatesTags: ['Attendance'],
    }),
    getStudentsForAttendance: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/students-for-attendance?${search}`;
      },
      providesTags: ['Attendance'],
    }),
    getAttendanceRecords: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/attendance?${search}`;
      },
      providesTags: ['Attendance'],
    }),


    // Teacher Leave
    applyLeave: builder.mutation({
      query: (data) => ({ url: '/leave/apply', method: 'POST', body: data }),
      invalidatesTags: ['TeacherLeave'],
    }),
    getMyLeaves: builder.query({
      query: () => '/leave/my',
      providesTags: ['TeacherLeave'],
    }),

    // Student Leave (class teacher)
    getStudentLeaves: builder.query({
      query: (status) => status ? `/leave/students?status=${status}` : '/leave/students',
      providesTags: ['StudentLeave'],
    }),
    approveStudentLeave: builder.mutation({
      query: ({ id, status, approvalRemarks }) => ({
        url: `/leave/student/${id}`, method: 'PUT', body: { status, approvalRemarks },
      }),
      invalidatesTags: ['StudentLeave'],
    }),

    // Assignments
    createTeacherAssignment: builder.mutation({
      query: (formData) => ({ url: '/assignment', method: 'POST', body: formData }),
      invalidatesTags: ['Assignment'],
    }),
    getMyCreatedAssignments: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/assignments?${search}`;
      },
      providesTags: ['Assignment'],
    }),
    updateTeacherAssignment: builder.mutation({
      query: ({ assignmentId, formData }) => ({ url: `/assignment/${assignmentId}`, method: 'PUT', body: formData }),
      invalidatesTags: ['Assignment'],
    }),
    deleteTeacherAssignment: builder.mutation({
      query: (assignmentId) => ({ url: `/assignment/${assignmentId}`, method: 'DELETE' }),
      invalidatesTags: ['Assignment'],
    }),
    getAssignmentSubmissions: builder.query({
      query: (assignmentId) => `/assignment-submissions/${assignmentId}`,
      providesTags: ['Assignment'],
    }),
    getNotSubmittedStudents: builder.query({
      query: (assignmentId) => `/assignment-not-submitted/${assignmentId}`,
      providesTags: ['Assignment'],
    }),
    // Knowledge Center
    uploadMaterial: builder.mutation({
      query: (formData) => ({ url: '/material', method: 'POST', body: formData }),
      invalidatesTags: ['Material'],
    }),
    getMyMaterials: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/materials?${search}`;
      },
      providesTags: ['Material'],
    }),
    updateMaterial: builder.mutation({
      query: ({ materialId, formData }) => ({ url: `/material/${materialId}`, method: 'PUT', body: formData }),
      invalidatesTags: ['Material'],
    }),
    deleteMaterial: builder.mutation({
      query: (materialId) => ({ url: `/material/${materialId}`, method: 'DELETE' }),
      invalidatesTags: ['Material'],
    }),

    // Marks
    getStudentsForMarks: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/students-for-marks?${search}`;
      },
    }),
    uploadMarks: builder.mutation({
      query: (data) => ({ url: '/marks', method: 'POST', body: data }),
      invalidatesTags: ['Marks'],
    }),
    uploadMarksExcel: builder.mutation({
      query: (formData) => ({ url: '/marks/excel', method: 'POST', body: formData }),
      invalidatesTags: ['Marks'],
    }),
    getMarks: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/marks?${search}`;
      },
      providesTags: ['Marks'],
    }),

    // ── Template-driven marks form ─────────────────────────────────────
    // GET /api/teacher/template?examId=... → resolves which template this exam uses
    getExamTemplate: builder.query({
      query: ({ examId } = {}) => (examId ? `/template?examId=${examId}` : '/template'),
      providesTags: ['Marks'],
    }),
    // GET /api/report-templates/:templateId/fields?examId=...&classId=...
    // Returns fields grouped by subject for dynamic form generation
    getTemplateFields: builder.query({
      query: ({ templateId, examId, classId } = {}) => {
        const params = new URLSearchParams();
        if (examId)  params.set('examId',  examId);
        if (classId) params.set('classId', classId);
        return { url: `/template-fields/${templateId}?${params}`, baseUrl: '' };
      },
      providesTags: ['Marks'],
    }),

    // Teacher test creation
    createTeacherTest: builder.mutation({
      query: (data) => ({ url: '/test', method: 'POST', body: data }),
      invalidatesTags: ['Exam', 'Marks'],
    }),
    getMyExams: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/my-exams?${search}`;
      },
      providesTags: ['Exam'],
    }),
    // Server restricts these to the teacher's own tests, before marks entry opens
    updateTeacherTest: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/test/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Exam', 'Marks'],
    }),
    deleteTeacherTest: builder.mutation({
      query: (id) => ({ url: `/test/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Exam', 'Marks'],
    }),

    // Class teacher features
    getMyClassStudents: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/my-students?${search}` : '/my-students';
      },
      providesTags: ['MyStudents'],
    }),
    getStudentPerformance: builder.query({
      query: ({ studentId, classId, sectionId, session }) => {
        const params = new URLSearchParams({ classId, sectionId, session }).toString();
        return `/my-students/${studentId}/performance?${params}`;
      },
      providesTags: ['MyStudents'],
    }),
    getClassMarks: builder.query({
      query: (examId) => examId ? `/class-marks?examId=${examId}` : '/class-marks',
      providesTags: ['Marks'],
    }),

    // ── Co-scholastic marks (class teacher) ─────────────────────────────────
    // getCoScholasticTemplates: builder.query({
    //   query: (params = {}) => {
    //     const search = new URLSearchParams(params).toString();
    //     return search ? `/co-scholastic/templates?${search}` : '/co-scholastic/templates';
    //   },
    //   providesTags: ['CoScholastic'],
    // }),
    getCoScholasticSkills: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/co-scholastic/skills?${search}` : '/co-scholastic/skills';
      },
      providesTags: ['CoScholastic'],
    }),
    getCoScholasticMarks: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return search ? `/co-scholastic?${search}` : '/co-scholastic';
      },
      providesTags: ['CoScholastic'],
    }),
    saveCoScholasticMarks: builder.mutation({
      query: (data) => ({ url: '/co-scholastic', method: 'POST', body: data }),
      invalidatesTags: ['CoScholastic'],
    }),
  }),
});

export const {
  useGetMyAssignmentsQuery, useGetMyClassTeacherQuery,
  useTakeAttendanceMutation, useGetStudentsForAttendanceQuery, useGetAttendanceRecordsQuery,
  useApplyLeaveMutation, useGetMyLeavesQuery,
  useGetStudentLeavesQuery, useApproveStudentLeaveMutation,
  useCreateTeacherAssignmentMutation, useGetMyCreatedAssignmentsQuery,
  useUpdateTeacherAssignmentMutation, useDeleteTeacherAssignmentMutation,
  useGetAssignmentSubmissionsQuery,
  useUploadMaterialMutation, useGetMyMaterialsQuery, useUpdateMaterialMutation, useDeleteMaterialMutation,
  useGetStudentsForMarksQuery,
  useUploadMarksMutation, useUploadMarksExcelMutation, useGetMarksQuery,
  useGetExamTemplateQuery, useGetTemplateFieldsQuery,
  useCreateTeacherTestMutation, useGetMyExamsQuery,
  useUpdateTeacherTestMutation, useDeleteTeacherTestMutation,
  useGetMyClassStudentsQuery, useGetClassMarksQuery,
  useGetNotSubmittedStudentsQuery,
  useGetStudentPerformanceQuery,
  // useGetCoScholasticTemplatesQuery — endpoint not yet active
  useGetCoScholasticSkillsQuery,
  useGetCoScholasticMarksQuery,
  useSaveCoScholasticMarksMutation,
} = teacherApi;




