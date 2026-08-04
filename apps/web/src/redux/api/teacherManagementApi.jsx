import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const BASE = `${import.meta.env.VITE_PORT}/api/v1/teacher-management/`;

export const teacherManagementApi = createApi({
  reducerPath: 'teacherManagementApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE, credentials: 'include', prepareHeaders: prepareAuthHeaders }),
  tagTypes: ['AllTeachers', 'DeletedTeachers'],

  endpoints: (builder) => ({

    // All Teachers (paginated + searchable)
    getAllTeachersEnhanced: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') q.append(k, v);
        });
        return `all?${q.toString()}`;
      },
      providesTags: ['AllTeachers'],
    }),

    // Deleted Teachers
    getDeletedTeachers: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams(params);
        return `deleted?${q.toString()}`;
      },
      providesTags: ['DeletedTeachers'],
    }),

    // Soft Delete
    softDeleteTeacher: builder.mutation({
      query: ({ id, ...body }) => ({ url: `${id}/soft-delete`, method: 'PATCH', body }),
      invalidatesTags: ['AllTeachers', 'DeletedTeachers'],
    }),

    // Restore
    restoreTeacher: builder.mutation({
      query: (id) => ({ url: `${id}/restore`, method: 'PATCH' }),
      invalidatesTags: ['AllTeachers', 'DeletedTeachers'],
    }),

    // Toggle Status (active / inactive)
    toggleTeacherStatus: builder.mutation({
      query: ({ id, isActive }) => ({ url: `${id}/toggle-status`, method: 'PATCH', body: { isActive } }),
      invalidatesTags: ['AllTeachers'],
    }),

  }),
});

export const {
  useGetAllTeachersEnhancedQuery,
  useGetDeletedTeachersQuery,
  useSoftDeleteTeacherMutation,
  useRestoreTeacherMutation,
  useToggleTeacherStatusMutation,
} = teacherManagementApi;
