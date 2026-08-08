import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from '@shared/lib/authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/documents/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const documentTemplateApi = createApi({
  reducerPath: 'documentTemplateApi',
  baseQuery,
  tagTypes: ['Template', 'Document'],
  endpoints: (builder) => ({

    // ── GET template by type ─────────────────────────────────────────────────
    /** GET /documents/templates/:type */
    getTemplate: builder.query({
      query: (type) => `templates/${type}`,
      providesTags: (result, error, type) => [{ type: 'Template', id: type }],
    }),

    // ── Upload template background image ────────────────────────────────────
    /**
     * POST /documents/templates/upload-image
     * Body: FormData { templateImage: File, type, name }
     */
    uploadTemplateImage: builder.mutation({
      query: (formData) => ({
        url: 'templates/upload-image',
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type; let the browser set multipart boundary
      }),
      invalidatesTags: (result) =>
        result?.data?.type ? [{ type: 'Template', id: result.data.type }] : ['Template'],
    }),

    // ── Save field positions + styles ────────────────────────────────────────
    /** PUT /documents/templates/:id/fields */
    saveTemplateFields: builder.mutation({
      query: ({ id, fields, name }) => ({
        url: `templates/${id}/fields`,
        method: 'PUT',
        body: { fields, name },
      }),
      invalidatesTags: (result) =>
        result?.data?.type ? [{ type: 'Template', id: result.data.type }] : ['Template'],
    }),

    // ── Delete template ──────────────────────────────────────────────────────
    /** DELETE /documents/templates/:id */
    deleteTemplate: builder.mutation({
      query: (id) => ({
        url: `templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Template'],
    }),

    // ── Generate certificate from template ───────────────────────────────────
    /** POST /documents/generate/:studentId/:type */
    generateFromTemplate: builder.mutation({
      query: ({ studentId, type }) => ({
        url: `generate/${studentId}/${type}`,
        method: 'POST',
      }),
      invalidatesTags: ['Document'],
    }),

    // ── Save structured layout (new HTML mode) ───────────────────────────────
    /** PUT /documents/templates/:id/layout */
    saveTemplateLayout: builder.mutation({
      query: ({ id, layout, sections, name }) => ({
        url: `templates/${id}/layout`,
        method: 'PUT',
        body: { layout, sections, name },
      }),
      invalidatesTags: (result) =>
        result?.data?.type ? [{ type: 'Template', id: result.data.type }] : ['Template'],
    }),

    // ── Bulk generate from template ──────────────────────────────────────────
    /** POST /documents/generate-bulk/:type  { studentIds: [] } */
    generateBulkFromTemplate: builder.mutation({
      query: ({ type, studentIds }) => ({
        url: `generate-bulk/${type}`,
        method: 'POST',
        body: { studentIds },
      }),
      invalidatesTags: ['Document'],
    }),
  }),
});

export const {
  useGetTemplateQuery,
  useUploadTemplateImageMutation,
  useSaveTemplateFieldsMutation,
  useDeleteTemplateMutation,
  useGenerateFromTemplateMutation,
  useSaveTemplateLayoutMutation,
  useGenerateBulkFromTemplateMutation,
} = documentTemplateApi;
