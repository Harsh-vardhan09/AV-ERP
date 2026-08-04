import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/documents/`;

export const templateConfigApi = createApi({
  reducerPath: 'templateConfigApi',
  baseQuery: fetchBaseQuery({ baseUrl: API_URL, credentials: 'include', prepareHeaders: prepareAuthHeaders }),
  tagTypes: ['TemplateConfig'],
  endpoints: (builder) => ({
    getFieldLibrary: builder.query({
      query: () => 'template-config/library',
      providesTags: ['TemplateConfig'],
    }),
    getTemplateConfig: builder.query({
      query: (type) => `template-config/${type}`,
      providesTags: (r, e, type) => [{ type: 'TemplateConfig', id: type }],
    }),
    saveTemplateConfig: builder.mutation({
      query: ({ type, fields }) => ({
        url: `template-config/${type}`,
        method: 'PUT',
        body: { fields },
      }),
      invalidatesTags: (r, e, arg) => [{ type: 'TemplateConfig', id: arg.type }],
    }),
  }),
});

export const {
  useGetFieldLibraryQuery,
  useGetTemplateConfigQuery,
  useSaveTemplateConfigMutation,
} = templateConfigApi;
