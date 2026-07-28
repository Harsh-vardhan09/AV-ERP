import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/student/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
});

export const studentApi = createApi({
  reducerPath: 'studentApi',
  baseQuery,
  tagTypes: ['Profile', 'Attendance', 'Assignment', 'Leave', 'Complaint', 'Material', 'Notice', 'Marks', 'Report'],
  endpoints: (builder) => ({
    // Profile
    getMyProfile: builder.query({
      query: () => '/profile',
      providesTags: ['Profile'],
    }),

    // Attendance
    getMyAttendance: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/attendance?${search}`;
      },
      providesTags: ['Attendance'],
    }),

    // Assignments
    getMyStudentAssignments: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/assignments?${search}`;
      },
      providesTags: ['Assignment'],
    }),
    submitAssignment: builder.mutation({
      query: (formData) => ({ url: '/assignments/submit', method: 'POST', body: formData }),
      invalidatesTags: ['Assignment'],
    }),

    // Leave
    applyStudentLeave: builder.mutation({
      query: (data) => ({ url: '/leave/apply', method: 'POST', body: data }),
      invalidatesTags: ['Leave'],
    }),
    getMyStudentLeaves: builder.query({
      query: () => '/leave/my',
      providesTags: ['Leave'],
    }),

    // Complaints
    submitComplaint: builder.mutation({
      query: (data) => ({ url: '/complaint', method: 'POST', body: data }),
      invalidatesTags: ['Complaint'],
    }),
    getMyComplaints: builder.query({
      query: () => '/complaints',
      providesTags: ['Complaint'],
    }),

    // Knowledge Center
    getStudentMaterials: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/knowledge-center?${search}`;
      },
      providesTags: ['Material'],
    }),
    markMaterialViewed: builder.mutation({
      query: (materialId) => ({ url: `/knowledge-center/${materialId}/view`, method: 'POST' }),
      invalidatesTags: ['Material'],
    }),

    // Notices
    getStudentNotices: builder.query({
      query: () => '/notices',
      providesTags: ['Notice'],
    }),

    // Marks
    getMyStudentMarks: builder.query({
      query: (examId) => examId ? `/marks?examId=${examId}` : '/marks',
      providesTags: ['Marks'],
    }),

    // Performance Report
    getMyReport: builder.query({
      query: () => '/report',
      providesTags: ['Report'],
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useGetMyAttendanceQuery,
  useGetMyStudentAssignmentsQuery, useSubmitAssignmentMutation,
  useApplyStudentLeaveMutation, useGetMyStudentLeavesQuery,
  useSubmitComplaintMutation, useGetMyComplaintsQuery,
  useGetStudentMaterialsQuery, useMarkMaterialViewedMutation,
  useGetStudentNoticesQuery,
  useGetMyStudentMarksQuery,
  useGetMyReportQuery,
} = studentApi;
