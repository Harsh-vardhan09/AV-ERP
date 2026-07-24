import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/documents/`;

export const generatedDocumentsApi = createApi({
  reducerPath: 'generatedDocumentsApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, credentials: 'include' }),
  tagTypes: ['GeneratedDocuments'],
  endpoints: (builder) => ({
    getNewDocumentContext: builder.query({
      query: ({ type, studentId }) => `new/${type}/${studentId}`,
    }),
    createGeneratedDocument: builder.mutation({
      query: (body) => ({
        url: 'generated',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['GeneratedDocuments'],
    }),
    getGeneratedDocument: builder.query({
      query: (id) => `generated/${id}`,
      providesTags: (r, e, id) => [{ type: 'GeneratedDocuments', id }],
    }),
  }),
});

export const {
  useGetNewDocumentContextQuery,
  useCreateGeneratedDocumentMutation,
  useGetGeneratedDocumentQuery,
} = generatedDocumentsApi;
