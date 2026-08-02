import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const BASE = `${import.meta.env.VITE_PORT}/api/v1/student-management/`;

export const studentManagementApi = createApi({
  reducerPath: 'studentManagementApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE, credentials: 'include', prepareHeaders: prepareAuthHeaders }),
  tagTypes: ['AllStudents', 'DeletedStudents', 'PassedStudents', 'DroppedStudents', 'SuspendedStudents'],

  endpoints: (builder) => ({

    // All Students
    getAllStudentsEnhanced: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.append(k, v); });
        return `all?${q.toString()}`;
      },
      providesTags: ['AllStudents']
    }),

    // Bulk Edit
    bulkEditStudents: builder.mutation({
      query: (data) => ({ url: 'bulk-edit', method: 'PATCH', body: data }),
      invalidatesTags: ['AllStudents']
    }),

    // Deleted
    getDeletedStudents: builder.query({
      query: (params = {}) => { const q = new URLSearchParams(params); return `deleted?${q.toString()}`; },
      providesTags: ['DeletedStudents']
    }),
    softDeleteStudent: builder.mutation({
      query: ({ id, ...body }) => ({ url: `${id}/soft-delete`, method: 'PATCH', body }),
      invalidatesTags: ['AllStudents', 'DeletedStudents']
    }),
    restoreStudent: builder.mutation({
      query: (id) => ({ url: `${id}/restore`, method: 'PATCH' }),
      invalidatesTags: ['AllStudents', 'DeletedStudents']
    }),

    // Passed
    getPassedStudents: builder.query({
      query: (params = {}) => { const q = new URLSearchParams(params); return `passed?${q.toString()}`; },
      providesTags: ['PassedStudents']
    }),
    markStudentPassed: builder.mutation({
      query: ({ id, ...body }) => ({ url: `${id}/mark-passed`, method: 'PATCH', body }),
      invalidatesTags: ['AllStudents', 'PassedStudents']
    }),

    // Dropped
    getDroppedStudents: builder.query({
      query: (params = {}) => { const q = new URLSearchParams(params); return `dropped?${q.toString()}`; },
      providesTags: ['DroppedStudents']
    }),
    markStudentDropped: builder.mutation({
      query: ({ id, ...body }) => ({ url: `${id}/mark-dropped`, method: 'PATCH', body }),
      invalidatesTags: ['AllStudents', 'DroppedStudents']
    }),

    // Suspended
    getSuspendedStudents: builder.query({
      query: (params = {}) => { const q = new URLSearchParams(params); return `suspended?${q.toString()}`; },
      providesTags: ['SuspendedStudents']
    }),
    suspendStudent: builder.mutation({
      query: ({ id, ...body }) => ({ url: `${id}/suspend`, method: 'PATCH', body }),
      invalidatesTags: ['AllStudents', 'SuspendedStudents']
    }),
    unsuspendStudent: builder.mutation({
      query: (id) => ({ url: `${id}/unsuspend`, method: 'PATCH' }),
      invalidatesTags: ['AllStudents', 'SuspendedStudents']
    }),

    // Promotion
    getPromotionPreview: builder.query({
      query: (params = {}) => { const q = new URLSearchParams(params); return `promotion-preview?${q.toString()}`; }
    }),
    promoteStudents: builder.mutation({
      query: (data) => ({ url: 'promote', method: 'POST', body: data }),
      invalidatesTags: ['AllStudents']
    }),

    // Re-enroll a dropped student (sets status back to active)
    reenrollDroppedStudent: builder.mutation({
      query: (id) => ({ url: `${id}/unsuspend`, method: 'PATCH' }),
      invalidatesTags: ['AllStudents', 'DroppedStudents']
    }),

    // Export — all students (no pagination), A-Z sorted
    exportStudents: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, v); });
        return `export?${q.toString()}`;
      },
    }),

    // Upload student profile photo (multipart/form-data → Cloudinary)
    uploadStudentPhoto: builder.mutation({
      query: ({ id, formData }) => ({
        url: `${id}/photo`,
        method: 'PUT',
        body: formData,
      }),
      invalidatesTags: ['AllStudents'],
    }),

  })

});

export const {
  useGetAllStudentsEnhancedQuery,
  useBulkEditStudentsMutation,
  useGetDeletedStudentsQuery,
  useSoftDeleteStudentMutation,
  useRestoreStudentMutation,
  useGetPassedStudentsQuery,
  useMarkStudentPassedMutation,
  useGetDroppedStudentsQuery,
  useMarkStudentDroppedMutation,
  useGetSuspendedStudentsQuery,
  useSuspendStudentMutation,
  useUnsuspendStudentMutation,
  useGetPromotionPreviewQuery,
  useLazyGetPromotionPreviewQuery,
  usePromoteStudentsMutation,
  useReenrollDroppedStudentMutation,
  useLazyExportStudentsQuery,
  useUploadStudentPhotoMutation,
} = studentManagementApi;
