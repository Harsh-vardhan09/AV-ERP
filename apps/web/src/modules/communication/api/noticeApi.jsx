import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from '@shared/lib/authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/notice/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const noticeapi = createApi({
  reducerPath: 'noticeapi',
  baseQuery,
  tagTypes: ['Notice'],
  endpoints: (builder) => ({
    getNotices: builder.query({
      query: () => ({ url: `getall`, method: 'GET' }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((n) => ({ type: 'Notice', id: n._id || n.id })),
              { type: 'Notice', id: 'LIST' },
            ]
          : [{ type: 'Notice', id: 'LIST' }],
    }),

    getNotice: builder.query({
      query: (id) => ({ url: `get/${id}`, method: 'GET' }),
      providesTags: (result, error, id) => [{ type: 'Notice', id }],
    }),

    createNotice: builder.mutation({
      query: (payload) => ({ url: `create`, method: 'POST', body: payload }),
      invalidatesTags: [{ type: 'Notice', id: 'LIST' }],
    }),

    deleteNotice: builder.mutation({
      query: (id) => ({ url: `delete/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => [{ type: 'Notice', id }, { type: 'Notice', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetNoticesQuery,
  useGetNoticeQuery,
  useCreateNoticeMutation,
  useDeleteNoticeMutation,
} = noticeapi;

export default noticeapi;
