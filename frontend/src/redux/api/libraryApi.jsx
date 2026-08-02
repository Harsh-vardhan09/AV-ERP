import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_PORT}/api/v1/library/`,
  credentials: 'include',
  prepareHeaders: prepareAuthHeaders,
});

export const libraryApi = createApi({
  reducerPath: 'libraryApi',
  baseQuery,
  tagTypes: ['LibraryBook', 'BookIssue', 'LibraryDashboard', 'Librarian'],

  endpoints: (builder) => ({

    // ── Dashboard ─────────────────────────────────────────────────────────
    getLibraryDashboard: builder.query({
      query: () => 'dashboard',
      providesTags: ['LibraryDashboard'],
    }),

    // ── Books ─────────────────────────────────────────────────────────────
    getBooks: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `books?${qs}` : 'books';
      },
      providesTags: ['LibraryBook'],
    }),

    getBook: builder.query({
      query: (id) => `books/${id}`,
      providesTags: ['LibraryBook'],
    }),

    searchBooks: builder.query({
      query: (q) => `books/search?q=${encodeURIComponent(q)}`,
      providesTags: ['LibraryBook'],
    }),

    createBook: builder.mutation({
      query: (formData) => ({
        url: 'books',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['LibraryBook', 'LibraryDashboard'],
    }),

    updateBook: builder.mutation({
      query: ({ id, formData }) => ({
        url: `books/${id}`,
        method: 'PUT',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['LibraryBook', 'LibraryDashboard'],
    }),

    deleteBook: builder.mutation({
      query: (id) => ({ url: `books/${id}`, method: 'DELETE' }),
      invalidatesTags: ['LibraryBook', 'LibraryDashboard'],
    }),

    // ── Student Search ─────────────────────────────────────────────────────
    searchLibraryStudents: builder.query({
      query: (q) => `students/search?q=${encodeURIComponent(q)}`,
    }),

    // ── Issues ────────────────────────────────────────────────────────────
    getIssues: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `issues?${qs}` : 'issues';
      },
      providesTags: ['BookIssue'],
    }),

    getStudentIssues: builder.query({
      query: ({ studentId, includeReturned = false }) =>
        `issues/student/${studentId}?includeReturned=${includeReturned}`,
      providesTags: ['BookIssue'],
    }),

    issueBook: builder.mutation({
      query: (body) => ({ url: 'issues', method: 'POST', body }),
      invalidatesTags: ['BookIssue', 'LibraryBook', 'LibraryDashboard'],
    }),

    returnBook: builder.mutation({
      query: (id) => ({ url: `issues/${id}/return`, method: 'PUT' }),
      invalidatesTags: ['BookIssue', 'LibraryBook', 'LibraryDashboard'],
    }),

    // ── Student Reminders (student role only) ─────────────────────────────
    getLibraryReminders: builder.query({
      query: () => 'reminders/me',
      providesTags: ['BookIssue'],
    }),

    // ── Librarian Account Management (admin only) ─────────────────────────
    getLibrarians: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return qs ? `librarians?${qs}` : 'librarians';
      },
      providesTags: ['Librarian'],
    }),

    createLibrarian: builder.mutation({
      query: (body) => ({ url: 'librarians', method: 'POST', body }),
      invalidatesTags: ['Librarian'],
    }),

    updateLibrarian: builder.mutation({
      query: ({ id, ...body }) => ({ url: `librarians/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Librarian'],
    }),

    toggleLibrarianStatus: builder.mutation({
      query: ({ id, action }) => ({ url: `librarians/${id}/status`, method: 'PATCH', body: { action } }),
      invalidatesTags: ['Librarian'],
    }),

    resendLibrarianCredentials: builder.mutation({
      query: (id) => ({ url: `librarians/${id}/resend-credentials`, method: 'POST' }),
    }),
  }),
});

export const {
  // Dashboard
  useGetLibraryDashboardQuery,

  // Books
  useGetBooksQuery,
  useGetBookQuery,
  useSearchBooksQuery,
  useCreateBookMutation,
  useUpdateBookMutation,
  useDeleteBookMutation,

  // Student search
  useSearchLibraryStudentsQuery,

  // Issues
  useGetIssuesQuery,
  useGetStudentIssuesQuery,
  useIssueBookMutation,
  useReturnBookMutation,

  // Reminders
  useGetLibraryRemindersQuery,

  // Librarians
  useGetLibrariansQuery,
  useCreateLibrarianMutation,
  useUpdateLibrarianMutation,
  useToggleLibrarianStatusMutation,
  useResendLibrarianCredentialsMutation,
} = libraryApi;
