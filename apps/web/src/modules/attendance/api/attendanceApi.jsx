/**
 * Daily attendance API — one record per student per school day.
 *
 * Backed by /api/v1/attendance/*. Marking is restricted server-side to the
 * section's class teacher (ClassTeacherAssignment) plus school admin; the UI
 * mirrors that but the server stays authoritative.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from '@shared/lib/authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/attendance/`;

export const attendanceApi = createApi({
  reducerPath: 'attendanceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    credentials: 'include',
    prepareHeaders: prepareAuthHeaders,
  }),
  tagTypes: ['SectionDay', 'MyAttendance', 'Unassigned'],
  endpoints: (builder) => ({
    getSectionDay: builder.query({
      query: ({ classId, sectionId, session, date }) => {
        const p = new URLSearchParams({ classId, sectionId, date });
        if (session) p.append('session', session);
        return `/section-day?${p.toString()}`;
      },
      providesTags: ['SectionDay'],
    }),

    markAttendance: builder.mutation({
      query: (body) => ({ url: '/mark', method: 'POST', body }),
      // The day just marked, and the student's own view of it
      invalidatesTags: ['SectionDay', 'MyAttendance'],
    }),

    // Identity comes from the token — no studentId is sent or accepted
    getMyAttendance: builder.query({
      query: ({ session, year, month } = {}) => {
        const p = new URLSearchParams();
        if (session) p.append('session', session);
        if (year) p.append('year', year);
        if (month) p.append('month', month);
        const qs = p.toString();
        return `/me${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['MyAttendance'],
    }),

    getStudentAttendance: builder.query({
      query: ({ studentId, session, year, month }) => {
        const p = new URLSearchParams();
        if (session) p.append('session', session);
        if (year) p.append('year', year);
        if (month) p.append('month', month);
        const qs = p.toString();
        return `/student/${studentId}${qs ? `?${qs}` : ''}`;
      },
    }),

    // Sections nobody is assigned to mark — a class going unmarked for weeks
    // must be visible, not silently absent from every report.
    getUnassignedSections: builder.query({
      query: ({ session } = {}) => `/unassigned-sections${session ? `?session=${session}` : ''}`,
      providesTags: ['Unassigned'],
    }),
  }),
});

export const {
  useGetSectionDayQuery,
  useMarkAttendanceMutation,
  useGetMyAttendanceQuery,
  useGetStudentAttendanceQuery,
  useGetUnassignedSectionsQuery,
} = attendanceApi;
