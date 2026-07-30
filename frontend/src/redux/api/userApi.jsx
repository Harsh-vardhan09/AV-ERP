import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Base API URL from environment variables
const BASE_URL = import.meta.env.VITE_PORT || import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_URL = `${BASE_URL}/api/v1/user/`;
const SCHOOL_API_URL = `${BASE_URL}/api/v1/school/`;

// Configuring the base query
const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include', // Include credentials for cookies
  prepareHeaders: (headers) => {
    // Customize headers if needed (e.g., add auth tokens)
    return headers;
  },
});

// Define the API slice
export const authApi = createApi({
  reducerPath: 'authApi', // Unique name for the slice
  baseQuery,
  tagTypes: ['user'], // Define tags for cache management
  endpoints: (builder) => ({
    // Signup mutation
    signup: builder.mutation({
      query: (userData) => ({
        url: '/signup',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['user'], // Invalidate cached user data
    }),

    // Verify email ID mutation
    varifyemailid: builder.mutation({
      query: (code) => ({
        url: '/varify-email',
        method: 'POST',
        body: code,
      }),
      invalidatesTags: ['user'],
    }),

    // Check authentication query
    cheak_auth: builder.query({
      query: () => ({
        url: '/cheak-auth',
        method: 'GET',
      }),
      providesTags: ['user'], // Provide cache tags for this query
    }),

    // Login mutation
    login: builder.mutation({
      query: (formData) => ({
        url: '/login',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['user'], // Invalidate user cache
    }),

    // Logout mutation
    logout: builder.mutation({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
      invalidatesTags: ['user'],
    }),

    // Change password mutation
    changepassword: builder.mutation({
      query: (userData) => ({
        url: '/reset-password',
        method: 'POST',
        body: userData,
      }),
    }),

    // Confirm password mutation
    conformpassword: builder.mutation({
      query: ({ token, ...userData }) => ({
        url: `/reset-password/${token}`,
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['user'], // Invalidate user cache
    }),

    // Refetch data for the user (custom refetch logic)
    refetchUser: builder.query({
      query: () => ({
        url: '/refetch-user',
        method: 'GET',
      }),
      providesTags: ['user'],
    }),

    // Force first-login password change (for admin-created staff)
    changeFirstPassword: builder.mutation({
      query: (data) => ({
        url: '/change-first-password',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['user'],
    }),
  }),
});

// Export hooks for the endpoints
export const {
  useSignupMutation,
  useVarifyemailidMutation,
  useCheak_authQuery,
  useLoginMutation,
  useLogoutMutation,
  useChangepasswordMutation,
  useConformpasswordMutation,
  useRefetchUserQuery,
  useChangeFirstPasswordMutation,
} = authApi;

// ── School Info API (separate slice — fetches school name/logo for topbar) ────
export const schoolApi = createApi({
  reducerPath: 'schoolApi',
  baseQuery: fetchBaseQuery({ baseUrl: SCHOOL_API_URL, credentials: 'include' }),
  tagTypes: ['School'],
  endpoints: (builder) => ({
    getMySchool: builder.query({
      query: () => 'me',
      providesTags: ['School'],
    }),
  }),
});

export const { useGetMySchoolQuery } = schoolApi;
