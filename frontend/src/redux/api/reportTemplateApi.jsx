import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/report-templates/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
});

export const reportTemplateApi = createApi({
  reducerPath: 'reportTemplateApi',
  baseQuery,
  tagTypes: ['ReportTemplate', 'ReportTemplateList', 'ReportTemplateStats'],
  endpoints: (builder) => ({
    // Create new template
    createReportTemplate: builder.mutation({
      query: (data) => ({
        url: '/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'ReportTemplateList' }, { type: 'ReportTemplateStats' }],
    }),

    // Get all templates
    getReportTemplates: builder.query({
      query: ({ page = 1, limit = 20, templateType, isActive, isDefault, search } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (templateType) params.append('templateType', templateType);
        if (isActive !== undefined) params.append('isActive', isActive);
        if (isDefault !== undefined) params.append('isDefault', isDefault);
        if (search) params.append('search', search);
        return `?${params.toString()}`;
      },
      providesTags: [{ type: 'ReportTemplateList' }],
    }),

    // Get single template
    getReportTemplate: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'ReportTemplate', id }],
    }),

    // Update template
    updateReportTemplate: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ReportTemplate', id },
        { type: 'ReportTemplateList' },
      ],
    }),

    // Delete template
    deleteReportTemplate: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'ReportTemplateList' }, { type: 'ReportTemplateStats' }],
    }),

    // Extract fields from template HTML
    extractTemplateFields: builder.mutation({
      query: (htmlContent) => ({
        url: '/extract-fields',
        method: 'POST',
        body: { htmlContent },
      }),
    }),

    // Validate template with sample data
    validateTemplate: builder.mutation({
      query: ({ htmlContent, sampleData }) => ({
        url: '/validate',
        method: 'POST',
        body: { htmlContent, sampleData },
      }),
    }),

    // Preview template (returns HTML)
    previewTemplate: builder.mutation({
      query: ({ htmlContent, cssContent, sampleData }) => ({
        url: '/preview',
        method: 'POST',
        body: { htmlContent, cssContent, sampleData },
        responseHandler: (response) => response.text(),
      }),
    }),

    // Set template as default
    setDefaultTemplate: builder.mutation({
      query: (id) => ({
        url: `/${id}/set-default`,
        method: 'PUT',
      }),
      invalidatesTags: [{ type: 'ReportTemplateList' }],
    }),

    // Clone template
    cloneReportTemplate: builder.mutation({
      query: ({ id, newName }) => ({
        url: `/${id}/clone`,
        method: 'POST',
        body: { newName },
      }),
      invalidatesTags: [{ type: 'ReportTemplateList' }, { type: 'ReportTemplateStats' }],
    }),

    // Get template statistics
    getReportTemplateStats: builder.query({
      query: () => '/stats',
      providesTags: [{ type: 'ReportTemplateStats' }],
    }),

    // Get best-matched template for a given class (class-group targeting)
    // Returns the resolved template with matchReason: 'exact_class' | 'class_range' | 'global_default'
    getTemplateForClass: builder.query({
      query: ({ classId, examType = 'annual' }) =>
        `/for-class?classId=${classId}&examType=${examType}`,
      providesTags: (result) =>
        result?.data?._id
          ? [{ type: 'ReportTemplate', id: result.data._id }]
          : ['ReportTemplate'],
    }),
  }),
});

export const {
  useCreateReportTemplateMutation,
  useGetReportTemplatesQuery,
  useGetReportTemplateQuery,
  useUpdateReportTemplateMutation,
  useDeleteReportTemplateMutation,
  useExtractTemplateFieldsMutation,
  useValidateTemplateMutation,
  usePreviewTemplateMutation,
  useSetDefaultTemplateMutation,
  useCloneReportTemplateMutation,
  useGetReportTemplateStatsQuery,
  useGetTemplateForClassQuery,
} = reportTemplateApi;
