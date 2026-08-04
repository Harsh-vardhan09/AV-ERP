import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = `${import.meta.env.VITE_PORT}/api/super-admin/`;

/**
 * superAdminApi — RTK Query API slice for the Super Admin panel.
 *
 * ISOLATION:
 *  - Separate reducerPath from authApi (school users)
 *  - Hits /api/super-admin/* endpoints (never /api/v1/*)
 *  - credentials: 'include' sends the superAdminToken cookie automatically
 */
/**
 * Storage key for the super admin JWT.
 *
 * Deliberately NOT 'token' — that belongs to school users. Sharing a key would
 * let a school-user session leak into super-admin requests (and vice versa),
 * breaking the isolation the separate cookie + separate JWT secret exist to
 * enforce.
 */
export const SUPER_ADMIN_TOKEN_KEY = 'superAdminToken';

export const setStoredSuperAdminToken = (token) => {
  try { token ? localStorage.setItem(SUPER_ADMIN_TOKEN_KEY, token)
              : localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY); } catch { /* storage disabled */ }
};

export const superAdminApi = createApi({
  reducerPath: 'superAdminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    // Cookie is still sent — it works same-site (local dev). The Bearer header
    // is what makes this work in production, where the cross-site
    // SameSite=None cookie gets dropped by third-party-cookie blocking.
    credentials: 'include',
    prepareHeaders: (headers) => {
      let token = null;
      try { token = localStorage.getItem(SUPER_ADMIN_TOKEN_KEY); } catch { /* storage disabled */ }
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['SuperAdmin', 'Schools', 'SchoolModules', 'SchoolTemplates', 'SchoolAdmissionTemplates', 'GlobalTemplates'],

  endpoints: (builder) => ({
    // ── GLOBAL REPORT TEMPLATE AUTHORING ────────────────────────────────────
    // Templates shared by every school. Only Super Admins may write these;
    // school admins get read + select via reportTemplateApi.

    getGlobalTemplates: builder.query({
      query: ({ templateType, templateStatus, isActive, search, page = 1, limit = 50 } = {}) => {
        const p = new URLSearchParams({ page, limit });
        if (templateType)   p.set('templateType', templateType);
        if (templateStatus) p.set('templateStatus', templateStatus);
        if (isActive !== undefined) p.set('isActive', isActive);
        if (search) p.set('search', search);
        return `templates?${p.toString()}`;
      },
      providesTags: [{ type: 'GlobalTemplates', id: 'LIST' }],
    }),

    // Full document including htmlContent — used by the editor
    getGlobalTemplate: builder.query({
      query: (id) => `templates/${id}`,
      providesTags: (r, e, id) => [{ type: 'GlobalTemplates', id }],
    }),

    createGlobalTemplate: builder.mutation({
      query: (body) => ({ url: 'templates', method: 'POST', body }),
      invalidatesTags: [{ type: 'GlobalTemplates', id: 'LIST' }],
    }),

    updateGlobalTemplate: builder.mutation({
      query: ({ id, ...body }) => ({ url: `templates/${id}`, method: 'PUT', body }),
      invalidatesTags: (r, e, { id }) => [{ type: 'GlobalTemplates', id }, { type: 'GlobalTemplates', id: 'LIST' }],
    }),

    deleteGlobalTemplate: builder.mutation({
      query: (id) => ({ url: `templates/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'GlobalTemplates', id: 'LIST' }],
    }),

    extractGlobalTemplateFields: builder.mutation({
      query: (htmlContent) => ({ url: 'templates/extract-fields', method: 'POST', body: { htmlContent } }),
    }),

    // Returns rendered HTML (not JSON) for the editor's Preview tab
    previewGlobalTemplate: builder.mutation({
      query: ({ htmlContent, sampleData }) => ({
        url: 'templates/preview',
        method: 'POST',
        body: { htmlContent, sampleData },
        responseHandler: (response) => response.text(),
      }),
    }),

    // ── AUTH ────────────────────────────────────────────────────────────────

    loginSuperAdmin: builder.mutation({
      query: ({ email, password }) => ({
        url: 'auth/login',
        method: 'POST',
        body: { email, password },
      }),
      invalidatesTags: ['SuperAdmin'],
    }),

    logoutSuperAdmin: builder.mutation({
      query: () => ({
        url: 'auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['SuperAdmin', 'Schools'],
    }),

    checkSuperAdminAuth: builder.query({
      query: () => ({
        url: 'auth/check',
        method: 'GET',
      }),
      providesTags: ['SuperAdmin'],
    }),

    // ── SCHOOLS ─────────────────────────────────────────────────────────────

    getAllSchools: builder.query({
      query: (args = {}) => {
        const { search = '', status = 'all', page = 1, limit = 20 } = args;
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (status !== 'all') params.set('status', status);
        params.set('page', String(page));
        params.set('limit', String(limit));
        return `schools?${params.toString()}`;
      },
      providesTags: ['Schools'],
    }),

    getSchoolById: builder.query({
      query: (id) => `schools/${id}`,
      providesTags: ['Schools'],
    }),

    createSchool: builder.mutation({
      query: (schoolData) => ({
        url: 'schools',
        method: 'POST',
        body: schoolData,
      }),
      invalidatesTags: ['Schools'],
    }),

    toggleSchoolStatus: builder.mutation({
      query: ({ id, action, reason }) => ({
        url: `schools/${id}/status`,
        method: 'PATCH',
        body: { action, reason },
      }),
      invalidatesTags: ['Schools'],
    }),

    deleteSchool: builder.mutation({
      query: (id) => ({
        url: `schools/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Schools'],
    }),

    updateSchool: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `schools/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Schools'],
    }),

    // ── MODULE MANAGEMENT ────────────────────────────────────────────────────

    getSchoolModules: builder.query({
      query: (id) => `schools/${id}/modules`,
      providesTags: (result, error, id) => [{ type: 'SchoolModules', id }],
    }),

    updateSchoolModule: builder.mutation({
      query: ({ id, moduleKey, enabled }) => ({
        url: `schools/${id}/modules`,
        method: 'PATCH',
        body: { moduleKey, enabled },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'SchoolModules', id }, 'Schools'],
    }),

    bulkUpdateSchoolModules: builder.mutation({
      query: ({ id, modules }) => ({
        url: `schools/${id}/modules/bulk`,
        method: 'PUT',
        body: { modules },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'SchoolModules', id }, 'Schools'],
    }),

    // ── REPORT TEMPLATE MANAGEMENT ───────────────────────────────────────────

    // List all templates for a specific school
    getSchoolTemplates: builder.query({
      query: ({ schoolId, templateType, templateStatus, isActive, page = 1, limit = 50 } = {}) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (templateType)   params.set('templateType',   templateType);
        if (templateStatus) params.set('templateStatus', templateStatus);
        if (isActive !== undefined) params.set('isActive', String(isActive));
        return `schools/${schoolId}/templates?${params.toString()}`;
      },
      providesTags: (result, error, { schoolId }) => [{ type: 'SchoolTemplates', id: schoolId }],
    }),

    // Upload a new HTML/CSS template for a school
    uploadTemplateForSchool: builder.mutation({
      query: ({ schoolId, ...body }) => ({
        url: `schools/${schoolId}/templates`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { schoolId }) => [{ type: 'SchoolTemplates', id: schoolId }],
    }),

    // Delete a template from a school
    deleteSchoolTemplate: builder.mutation({
      query: ({ schoolId, templateId }) => ({
        url: `schools/${schoolId}/templates/${templateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { schoolId }) => [{ type: 'SchoolTemplates', id: schoolId }],
    }),

    // Update a template's status, class-group targeting, or default flag (no re-upload needed)
    updateSchoolTemplate: builder.mutation({
      query: ({ schoolId, templateId, ...body }) => ({
        url: `schools/${schoolId}/templates/${templateId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { schoolId }) => [{ type: 'SchoolTemplates', id: schoolId }],
    }),

    // ── ADMISSION FORM TEMPLATE MANAGEMENT ──────────────────────────────────

    // List admission templates for a specific school
    getSchoolAdmissionTemplates: builder.query({
      query: ({ schoolId, isActive, page = 1, limit = 50 } = {}) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (isActive !== undefined) params.set('isActive', String(isActive));
        return `schools/${schoolId}/admission-templates?${params.toString()}`;
      },
      providesTags: (result, error, { schoolId }) => [{ type: 'SchoolAdmissionTemplates', id: schoolId }],
    }),

    // Upload a new HTML/CSS admission template for a school
    uploadAdmissionTemplateForSchool: builder.mutation({
      query: ({ schoolId, ...body }) => ({
        url: `schools/${schoolId}/admission-templates`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { schoolId }) => [{ type: 'SchoolAdmissionTemplates', id: schoolId }],
    }),

    // Delete an admission template
    deleteSchoolAdmissionTemplate: builder.mutation({
      query: ({ schoolId, templateId }) => ({
        url: `schools/${schoolId}/admission-templates/${templateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { schoolId }) => [{ type: 'SchoolAdmissionTemplates', id: schoolId }],
    }),

    // Update admission template status / default / active
    updateSchoolAdmissionTemplate: builder.mutation({
      query: ({ schoolId, templateId, ...body }) => ({
        url: `schools/${schoolId}/admission-templates/${templateId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { schoolId }) => [{ type: 'SchoolAdmissionTemplates', id: schoolId }],
    }),
  }),
});

export const {
  useLoginSuperAdminMutation,
  useLogoutSuperAdminMutation,
  useCheckSuperAdminAuthQuery,
  useGetAllSchoolsQuery,
  useGetSchoolByIdQuery,
  useCreateSchoolMutation,
  useToggleSchoolStatusMutation,
  useDeleteSchoolMutation,
  useUpdateSchoolMutation,
  useGetSchoolModulesQuery,
  useUpdateSchoolModuleMutation,
  useBulkUpdateSchoolModulesMutation,
  // ── Global Report Template Authoring ──
  useGetGlobalTemplatesQuery,
  useGetGlobalTemplateQuery,
  useCreateGlobalTemplateMutation,
  useUpdateGlobalTemplateMutation,
  useDeleteGlobalTemplateMutation,
  useExtractGlobalTemplateFieldsMutation,
  usePreviewGlobalTemplateMutation,
  // ── Report Template Management (per-school, legacy) ──
  useGetSchoolTemplatesQuery,
  useUploadTemplateForSchoolMutation,
  useDeleteSchoolTemplateMutation,
  useUpdateSchoolTemplateMutation,
  // ── Admission Form Template Management ──
  useGetSchoolAdmissionTemplatesQuery,
  useUploadAdmissionTemplateForSchoolMutation,
  useDeleteSchoolAdmissionTemplateMutation,
  useUpdateSchoolAdmissionTemplateMutation,
} = superAdminApi;
