import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/notifications/`;

export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    credentials: 'include',
    prepareHeaders: prepareAuthHeaders,
  }),
  tagTypes: ['Notifications', 'UnreadCount'],

  endpoints: (builder) => ({

    // GET /api/v1/notifications?page=1&limit=20&type=fee&isRead=false
    getNotifications: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.page)              q.append('page',   params.page);
        if (params.limit)             q.append('limit',  params.limit);
        if (params.type)              q.append('type',   params.type);
        if (params.isRead !== undefined) q.append('isRead', params.isRead);
        return `?${q.toString()}`;
      },
      providesTags: ['Notifications'],
    }),

    // GET /api/v1/notifications/unread-count
    getUnreadCount: builder.query({
      query: () => 'unread-count',
      providesTags: ['UnreadCount'],
      // Poll every 60 seconds as fallback if socket misses an event
      pollingInterval: 60000,
    }),

    // PATCH /api/v1/notifications/:id/read
    markAsRead: builder.mutation({
      query: (id) => ({
        url: `${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notifications', 'UnreadCount'],
    }),

    // PATCH /api/v1/notifications/read-all
    markAllRead: builder.mutation({
      query: () => ({ url: 'read-all', method: 'PATCH' }),
      invalidatesTags: ['Notifications', 'UnreadCount'],
    }),

    // DELETE /api/v1/notifications/:id
    deleteNotification: builder.mutation({
      query: (id) => ({ url: id, method: 'DELETE' }),
      invalidatesTags: ['Notifications', 'UnreadCount'],
    }),

    // DELETE /api/v1/notifications/clear-all
    clearAllNotifications: builder.mutation({
      query: () => ({ url: 'clear-all', method: 'DELETE' }),
      invalidatesTags: ['Notifications', 'UnreadCount'],
    }),

  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation,
} = notificationApi;
