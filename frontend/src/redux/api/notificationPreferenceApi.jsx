import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const BASE = `${import.meta.env.VITE_PORT}/api/v1/notification-preferences/`;

export const notificationPreferenceApi = createApi({
  reducerPath: 'notificationPreferenceApi',
  baseQuery:   fetchBaseQuery({ baseUrl: BASE, credentials: 'include', prepareHeaders: prepareAuthHeaders }),
  tagTypes:    ['Preferences', 'SchoolNotifSettings', 'NotifHistory'],

  endpoints: (builder) => ({

    // ── User personal preferences ──────────────────────────────────────────
    getMyPreferences: builder.query({
      query:        () => 'my',
      providesTags: ['Preferences'],
    }),

    updateMyPreferences: builder.mutation({
      query:           (data) => ({ url: 'my', method: 'PATCH', body: data }),
      invalidatesTags: ['Preferences'],
    }),

    resetMyPreferences: builder.mutation({
      query:           () => ({ url: 'my', method: 'DELETE' }),
      invalidatesTags: ['Preferences'],
    }),

    // ── Admin school-wide settings ─────────────────────────────────────────
    getSchoolNotifSettings: builder.query({
      query:        () => 'school',
      providesTags: ['SchoolNotifSettings'],
    }),

    updateSchoolNotifSettings: builder.mutation({
      query:           (data) => ({ url: 'school', method: 'PATCH', body: data }),
      invalidatesTags: ['SchoolNotifSettings'],
    }),

    // ── Admin notification history ─────────────────────────────────────────
    getNotificationHistory: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.type)  q.append('type',  params.type);
        if (params.page)  q.append('page',  params.page);
        if (params.limit) q.append('limit', params.limit);
        return `school/history?${q.toString()}`;
      },
      providesTags: ['NotifHistory'],
    }),

    // ── Admin bulk announcement ────────────────────────────────────────────
    sendBulkAnnouncement: builder.mutation({
      query: (data) => ({
        url:    'school/announcement',
        method: 'POST',
        body:   data,
      }),
    }),

  }),
});

export const {
  useGetMyPreferencesQuery,
  useUpdateMyPreferencesMutation,
  useResetMyPreferencesMutation,
  useGetSchoolNotifSettingsQuery,
  useUpdateSchoolNotifSettingsMutation,
  useGetNotificationHistoryQuery,
  useSendBulkAnnouncementMutation,
} = notificationPreferenceApi;
