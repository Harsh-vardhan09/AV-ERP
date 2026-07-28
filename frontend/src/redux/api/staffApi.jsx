/**
 * staffApi.jsx
 * RTK Query API slice for school admin staff management.
 * Base: /api/v1/staff/
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/staff/`;

export const staffApi = createApi({
  reducerPath: 'staffApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    credentials: 'include',
  }),
  tagTypes: ['Staff'],
  endpoints: (builder) => ({

    // GET /api/v1/staff?role=&isActive=&search=
    getAllStaff: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.role && params.role !== 'all') q.append('role', params.role);
        if (params.isActive !== undefined && params.isActive !== 'all')
          q.append('isActive', params.isActive);
        if (params.search) q.append('search', params.search);
        const qs = q.toString();
        return qs ? `?${qs}` : '';
      },
      providesTags: ['Staff'],
    }),

    // POST /api/v1/staff
    createStaff: builder.mutation({
      query: (data) => ({ url: '', method: 'POST', body: data }),
      invalidatesTags: ['Staff'],
    }),

    // PUT /api/v1/staff/:id
    updateStaff: builder.mutation({
      query: ({ id, ...data }) => ({ url: `${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Staff'],
    }),

    // PATCH /api/v1/staff/:id/status
    toggleStaffStatus: builder.mutation({
      query: ({ id, action }) => ({
        url: `${id}/status`,
        method: 'PATCH',
        body: { action },
      }),
      invalidatesTags: ['Staff'],
    }),

    // POST /api/v1/staff/:id/resend-credentials
    resendCredentials: builder.mutation({
      query: (id) => ({ url: `${id}/resend-credentials`, method: 'POST' }),
      invalidatesTags: ['Staff'],
    }),

    // DELETE /api/v1/staff/:id → permanently remove account
    deleteStaff: builder.mutation({
      query: (id) => ({ url: `${id}`, method: 'DELETE' }),
      invalidatesTags: ['Staff'],
    }),
  }),
});

export const {
  useGetAllStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useToggleStaffStatusMutation,
  useResendCredentialsMutation,
  useDeleteStaffMutation,
} = staffApi;
