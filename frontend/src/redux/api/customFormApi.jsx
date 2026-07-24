import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const BASE = `${import.meta.env.VITE_PORT}/api/v1/custom-forms/`;

export const customFormApi = createApi({
  reducerPath: 'customFormApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE, credentials: 'include' }),
  tagTypes: ['Forms', 'DeletedForms', 'FormLeads', 'FormDetail'],

  endpoints: (builder) => ({

    // ── All forms (paginated + searchable) ──────────────────────────────────
    getAllForms: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') q.append(k, v);
        });
        return `?${q.toString()}`;
      },
      providesTags: ['Forms'],
    }),

    // ── Deleted forms ────────────────────────────────────────────────────────
    getDeletedForms: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams(params);
        return `deleted?${q.toString()}`;
      },
      providesTags: ['DeletedForms'],
    }),

    // ── Single form ──────────────────────────────────────────────────────────
    getFormById: builder.query({
      query: (id) => `${id}`,
      providesTags: (result, error, id) => [{ type: 'FormDetail', id }],
    }),

    // ── Predefined fields list ────────────────────────────────────────────────
    getPredefinedFields: builder.query({
      query: () => 'predefined-fields',
    }),

    // ── Create form ──────────────────────────────────────────────────────────
    createForm: builder.mutation({
      query: (body) => ({ url: '', method: 'POST', body }),
      invalidatesTags: ['Forms'],
    }),

    // ── Update form ──────────────────────────────────────────────────────────
    updateForm: builder.mutation({
      query: ({ id, ...body }) => ({ url: `${id}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { id }) => ['Forms', { type: 'FormDetail', id }],
    }),

    // ── Toggle status ────────────────────────────────────────────────────────
    toggleFormStatus: builder.mutation({
      query: ({ id, status }) => ({ url: `${id}/toggle-status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Forms'],
    }),

    // ── Soft delete ──────────────────────────────────────────────────────────
    deleteForm: builder.mutation({
      query: (id) => ({ url: `${id}`, method: 'DELETE' }),
      invalidatesTags: ['Forms', 'DeletedForms'],
    }),

    // ── Restore ──────────────────────────────────────────────────────────────
    restoreForm: builder.mutation({
      query: (id) => ({ url: `${id}/restore`, method: 'PATCH' }),
      invalidatesTags: ['Forms', 'DeletedForms'],
    }),

    // ── Leads ────────────────────────────────────────────────────────────────
    getFormLeads: builder.query({
      query: ({ id, ...params }) => {
        const q = new URLSearchParams(params);
        return `${id}/leads?${q.toString()}`;
      },
      providesTags: (result, error, { id }) => [{ type: 'FormLeads', id }],
    }),

  }),
});

export const {
  useGetAllFormsQuery,
  useGetDeletedFormsQuery,
  useGetFormByIdQuery,
  useGetPredefinedFieldsQuery,
  useCreateFormMutation,
  useUpdateFormMutation,
  useToggleFormStatusMutation,
  useDeleteFormMutation,
  useRestoreFormMutation,
  useGetFormLeadsQuery,
} = customFormApi;
