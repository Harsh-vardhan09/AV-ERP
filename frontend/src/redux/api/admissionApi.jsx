import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/admission/`;
const ADMIN_API_URL = `${import.meta.env.VITE_PORT}/api/v1/admin/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include',
});

// Separate baseQuery for admin endpoints (classes, sections)
const adminBaseQuery = fetchBaseQuery({
  baseUrl: ADMIN_API_URL,
  credentials: 'include',
});

export const admissionApi = createApi({
  reducerPath: 'admissionApi',
  baseQuery,
  tagTypes: ['Student', 'Teacher', 'Settings', 'AdmissionFormSettings'],
  endpoints: (builder) => ({
    // Student registration
    registerStudent: builder.mutation({
      query: (data) => ({ url: '/student/register', method: 'POST', body: data }),
      invalidatesTags: ['Student'],
    }),
    getStudentDetails: builder.query({
      query: (id) => `/student/${id}`,
      providesTags: ['Student'],
    }),
    checkDuplicateField: builder.query({
      query: ({ field, value, classId, sectionId }) => {
        let url = `/student/check-duplicate?field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`;
        if (classId) url += `&classId=${encodeURIComponent(classId)}`;
        if (sectionId) url += `&sectionId=${encodeURIComponent(sectionId)}`;
        return url;
      },
    }),
    updateStudentDetails: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/student/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Student'],
    }),
    activateStudent: builder.mutation({
      query: (id) => ({ url: `/student/${id}/activate`, method: 'PUT' }),
      invalidatesTags: ['Student'],
    }),
    deactivateStudent: builder.mutation({
      query: (id) => ({ url: `/student/${id}/deactivate`, method: 'PUT' }),
      invalidatesTags: ['Student'],
    }),
    getAllStudents: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/students?${search}`;
      },
      providesTags: ['Student'],
    }),

    // ── Student photo upload ─────────────────────────────────────────────────
    // Sends multipart/form-data; formData must have key "photo" (File object)
    uploadStudentPhoto: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/students/${id}/photo`,
        method: 'PUT',
        body: formData,
        // RTK Query / fetchBaseQuery will NOT set Content-Type when body is FormData,
        // letting the browser set the correct multipart boundary automatically.
        formData: true,
      }),
      invalidatesTags: ['Student'],
    }),

    // Teacher registration
    registerTeacher: builder.mutation({
      query: (data) => ({ url: '/teacher/register', method: 'POST', body: data }),
      invalidatesTags: ['Teacher'],
    }),
    getTeacherDetails: builder.query({
      query: (id) => `/teacher/${id}`,
      providesTags: ['Teacher'],
    }),
    updateTeacherDetails: builder.mutation({
      query: ({ id, ...data }) => ({ url: `/teacher/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Teacher'],
    }),
    activateTeacher: builder.mutation({
      query: (id) => ({ url: `/teacher/${id}/activate`, method: 'PUT' }),
      invalidatesTags: ['Teacher'],
    }),
    deactivateTeacher: builder.mutation({
      query: (id) => ({ url: `/teacher/${id}/deactivate`, method: 'PUT' }),
      invalidatesTags: ['Teacher'],
    }),
    getAllTeachers: builder.query({
      query: (params = {}) => {
        const search = new URLSearchParams(params).toString();
        return `/teachers?${search}`;
      },
      providesTags: ['Teacher'],
    }),

    // ── Teacher photo upload ─────────────────────────────────────────────────
    uploadTeacherPhoto: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/teachers/${id}/photo`,
        method: 'PUT',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['Teacher'],
    }),

    // School Settings
    getSchoolSettings: builder.query({
      query: () => '/school-settings',
      providesTags: ['Settings'],
    }),
    updateSchoolSettings: builder.mutation({
      query: (data) => ({ url: '/school-settings', method: 'PUT', body: data }),
      invalidatesTags: ['Settings'],
    }),
    // ── Upload school logo / watermark / signature / QR ──────────────────────
    uploadSettingsLogo: builder.mutation({
      query: ({ type, formData }) => ({
        url: `/school-settings/upload-logo?type=${type}`,
        method: 'PUT',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['Settings'],
    }),

    // Email OTP
    sendEmailOtp: builder.mutation({
      query: (data) => ({ url: '/email/send-otp', method: 'POST', body: data }),
    }),
    verifyEmailOtp: builder.mutation({
      query: (data) => ({ url: '/email/verify-otp', method: 'POST', body: data }),
    }),

    // ── Admission Form Settings ──────────────────────────────────────────────
    getAdmissionFormSettings: builder.query({
      query: () => '/form-settings',
      providesTags: ['AdmissionFormSettings'],
    }),
    updateAdmissionFormSettings: builder.mutation({
      query: (data) => ({ url: '/form-settings', method: 'PUT', body: data }),
      invalidatesTags: ['AdmissionFormSettings'],
    }),

    // ── Form Students (paginated, for Print Admission Form page) ─────────────
    getFormStudents: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.append(k, v); });
        return `/form-students?${q.toString()}`;
      },
      providesTags: ['Student'],
    }),

    // ── Export Students as Excel (.xlsx) ─────────────────────────────────────
    // Use lazily: const [trigger, { isLoading }] = useLazyExportStudentsExcelQuery()
    exportStudentsExcel: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.append(k, v); });
        return { url: `/students/export-excel?${q.toString()}`, responseHandler: (r) => r.blob() };
      },
    }),
  }),
});

// ── Admin reference data (classes & sections) — uses admin base URL ─────────
export const admissionRefApi = createApi({
  reducerPath: 'admissionRefApi',
  baseQuery: adminBaseQuery,
  tagTypes: ['Class', 'Section'],
  endpoints: (builder) => ({
    getClasses: builder.query({
      query: () => '/classes',
      providesTags: ['Class'],
    }),
    getSections: builder.query({
      query: (classId) => classId ? `/sections?classId=${classId}` : '/sections',
      providesTags: ['Section'],
    }),
  }),
});

export const { useGetClassesQuery, useGetSectionsQuery } = admissionRefApi;

export const {
  useRegisterStudentMutation, useGetStudentDetailsQuery, useUpdateStudentDetailsMutation,
  useCheckDuplicateFieldQuery,
  useActivateStudentMutation, useDeactivateStudentMutation, useGetAllStudentsQuery,
  useUploadStudentPhotoMutation,
  useRegisterTeacherMutation, useGetTeacherDetailsQuery, useUpdateTeacherDetailsMutation,
  useActivateTeacherMutation, useDeactivateTeacherMutation, useGetAllTeachersQuery,
  useUploadTeacherPhotoMutation,
  useGetSchoolSettingsQuery, useUpdateSchoolSettingsMutation,
  useUploadSettingsLogoMutation,
  useSendEmailOtpMutation, useVerifyEmailOtpMutation,
  // Admission Form module
  useGetAdmissionFormSettingsQuery, useUpdateAdmissionFormSettingsMutation,
  useGetFormStudentsQuery,
  // Excel export
  useLazyExportStudentsExcelQuery,
} = admissionApi;



