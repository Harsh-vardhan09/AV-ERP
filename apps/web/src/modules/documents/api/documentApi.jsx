import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from '../../../redux/api/authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/documents/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const documentApi = createApi({
  reducerPath: 'documentApi',
  baseQuery,
  tagTypes: ['SchoolDocument'],
  endpoints: (builder) => ({
    getDocument: builder.query({
      query: ({ type, studentId }) => `/${type}/${studentId}`,
      providesTags: (result, error, arg) => [
        { type: 'SchoolDocument', id: `${arg?.type}-${arg?.studentId}` },
      ],
    }),
    createDocument: builder.mutation({
      query: (body) => ({ url: '/', method: 'POST', body }),
      invalidatesTags: (result, error, arg) => {
        if (error) return [];
        const t = arg?.type;
        const s = arg?.studentId;
        if (t && s) return [{ type: 'SchoolDocument', id: `${t}-${s}` }];
        return [{ type: 'SchoolDocument', id: 'LIST' }];
      },
    }),
    updateDocument: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error) => {
        if (error) return [];
        const d = result?.data;
        if (d?.type && d?.studentId) {
          return [{ type: 'SchoolDocument', id: `${d.type}-${d.studentId}` }];
        }
        return [{ type: 'SchoolDocument', id: 'LIST' }];
      },
    }),
    lockDocument: builder.mutation({
      query: (id) => ({ url: `/lock/${id}`, method: 'POST' }),
      invalidatesTags: (result, error) => {
        if (error) return [];
        const d = result?.data;
        if (d?.type && d?.studentId) {
          return [{ type: 'SchoolDocument', id: `${d.type}-${d.studentId}` }];
        }
        return [{ type: 'SchoolDocument', id: 'LIST' }];
      },
    }),
    unlockDocument: builder.mutation({
      query: (id) => ({ url: `/unlock/${id}`, method: 'POST' }),
      invalidatesTags: (result, error) => {
        if (error) return [];
        const d = result?.data;
        if (d?.type && d?.studentId) {
          return [{ type: 'SchoolDocument', id: `${d.type}-${d.studentId}` }];
        }
        return [{ type: 'SchoolDocument', id: 'LIST' }];
      },
    }),
  }),
});

export const {
  useGetDocumentQuery,
  useLazyGetDocumentQuery,
  useCreateDocumentMutation,
  useUpdateDocumentMutation,
  useLockDocumentMutation,
  useUnlockDocumentMutation,
} = documentApi;
