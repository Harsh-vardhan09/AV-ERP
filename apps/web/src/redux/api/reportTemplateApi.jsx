import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/report-templates/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

/**
 * reportTemplateApi — SCHOOL-SIDE, READ + SELECT ONLY.
 *
 * Report card templates are authored by Super Admins and shared globally.
 * A school admin browses them and adopts one; the authoring mutations
 * (create / update / delete / clone / set-default / preview / extract-fields)
 * now live in superAdminApi and hit /api/super-admin/templates/*.
 */
export const reportTemplateApi = createApi({
  reducerPath: 'reportTemplateApi',
  baseQuery,
  tagTypes: ['ReportTemplate', 'ReportTemplateList', 'ReportTemplateStats', 'ReportTemplateSelection'],
  endpoints: (builder) => ({
    // Browse: global templates + this school's own legacy ones
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

    // Single template (read-only — used for the gallery preview)
    getReportTemplate: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'ReportTemplate', id }],
    }),

    // Template statistics
    getReportTemplateStats: builder.query({
      query: () => '/stats',
      providesTags: [{ type: 'ReportTemplateStats' }],
    }),

    // School-wide selection — returns { templates, selectedTemplateId, isStale }
    getTemplateSelection: builder.query({
      query: () => '/selection',
      providesTags: [{ type: 'ReportTemplateSelection' }],
    }),

    // Adopt a template. Writes SchoolSettings.selectedReportTemplateId ONLY —
    // it cannot alter template content. Pass null to clear.
    setTemplateSelection: builder.mutation({
      query: (templateId) => ({
        url: '/selection',
        method: 'PUT',
        body: { templateId: templateId || null },
      }),
      invalidatesTags: [{ type: 'ReportTemplateSelection' }, { type: 'ReportTemplateList' }],
    }),

    // Best-matched template for a class (class-group targeting)
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
  useGetReportTemplatesQuery,
  useGetReportTemplateQuery,
  useGetReportTemplateStatsQuery,
  useGetTemplateSelectionQuery,
  useSetTemplateSelectionMutation,
  useGetTemplateForClassQuery,
} = reportTemplateApi;
