import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/admission-templates/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const admissionTemplateApi = createApi({
  reducerPath: 'admissionTemplateApi',
  baseQuery,
  tagTypes: ['AdmissionTemplate', 'AdmissionTemplateList', 'AdmissionTemplateActive'],
  endpoints: (builder) => ({

    // ── CRUD ───────────────────────────────────────────────────────────────────

    createAdmissionTemplate: builder.mutation({
      query: (data) => ({ url: '/', method: 'POST', body: data }),
      invalidatesTags: ['AdmissionTemplateList'],
    }),

    getAdmissionTemplates: builder.query({
      query: ({ page = 1, limit = 50, isActive, isDefault, search, templateStatus } = {}) => {
        const p = new URLSearchParams();
        p.append('page', page);
        p.append('limit', limit);
        if (isActive    !== undefined) p.append('isActive', isActive);
        if (isDefault   !== undefined) p.append('isDefault', isDefault);
        if (search)                    p.append('search', search);
        if (templateStatus)            p.append('templateStatus', templateStatus);
        return `?${p.toString()}`;
      },
      providesTags: ['AdmissionTemplateList'],
    }),

    getAdmissionTemplate: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'AdmissionTemplate', id }],
    }),

    updateAdmissionTemplate: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'AdmissionTemplate', id },
        'AdmissionTemplateList',
      ],
    }),

    deleteAdmissionTemplate: builder.mutation({
      query: (id) => ({ url: `/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdmissionTemplateList'],
    }),

    // ── Actions ────────────────────────────────────────────────────────────────

    setDefaultAdmissionTemplate: builder.mutation({
      query: (id) => ({ url: `/${id}/set-default`, method: 'PUT' }),
      invalidatesTags: ['AdmissionTemplateList', 'AdmissionTemplateActive'],
    }),

    cloneAdmissionTemplate: builder.mutation({
      query: ({ id, newName }) => ({ url: `/${id}/clone`, method: 'POST', body: { newName } }),
      invalidatesTags: ['AdmissionTemplateList'],
    }),

    // ── Field extraction ───────────────────────────────────────────────────────

    extractAdmissionTemplateFields: builder.mutation({
      query: (htmlContent) => ({
        url: '/extract-fields',
        method: 'POST',
        body: { htmlContent },
      }),
    }),

    // ── Preview (POST — returns HTML string) ──────────────────────────────────

    previewAdmissionTemplate: builder.mutation({
      query: ({ htmlContent, cssContent, sampleData, studentId, templateId }) => ({
        url: '/preview',
        method: 'POST',
        body: { htmlContent, cssContent, sampleData, studentId, templateId },
        responseHandler: (response) => response.text(),
      }),
    }),

    // ── GET preview for a saved template (convenience) ────────────────────────

    getAdmissionTemplatePreview: builder.query({
      query: ({ id, studentId } = {}) => {
        let url = `/${id}/preview`;
        if (studentId) url += `?studentId=${studentId}`;
        return { url, responseHandler: (response) => response.text() };
      },
    }),

    // ── PDF Generation ─────────────────────────────────────────────────────────

    generateAdmissionPDF: builder.mutation({
      query: ({ studentId, templateId }) => ({
        url: '/generate',
        method: 'POST',
        body: { studentId, templateId },
      }),
    }),

    // ── Active template (for settings page) ───────────────────────────────────

    getActiveAdmissionTemplate: builder.query({
      query: () => '/active',
      providesTags: ['AdmissionTemplateActive'],
    }),

    // ── Stats ──────────────────────────────────────────────────────────────────

    getAdmissionTemplateStats: builder.query({
      query: () => '/stats',
      providesTags: ['AdmissionTemplateList'],
    }),
  }),
});

export const {
  useCreateAdmissionTemplateMutation,
  useGetAdmissionTemplatesQuery,
  useGetAdmissionTemplateQuery,
  useUpdateAdmissionTemplateMutation,
  useDeleteAdmissionTemplateMutation,
  useSetDefaultAdmissionTemplateMutation,
  useCloneAdmissionTemplateMutation,
  useExtractAdmissionTemplateFieldsMutation,
  usePreviewAdmissionTemplateMutation,
  useGetAdmissionTemplatePreviewQuery,
  useGenerateAdmissionPDFMutation,
  useGetActiveAdmissionTemplateQuery,
  useGetAdmissionTemplateStatsQuery,
} = admissionTemplateApi;
