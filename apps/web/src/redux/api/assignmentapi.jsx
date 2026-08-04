import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/assignment/`;
const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include', 
  prepareHeaders: prepareAuthHeaders,
});

export const assignmentApi = createApi({
  reducerPath: 'assignmentApi',
  baseQuery,

  tagTypes: ['Assignment'],
  endpoints: (builder) => ({
    assignmetuploaad: builder.mutation({
      query: ({studentid,assignmentid,semester,formData}) => ({ 
        url: `/upload/${studentid}/${assignmentid}/${semester}`,
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Assignment'],
    }),

    createassignment: builder.mutation({
      query: (assignmentdata) => ({ 
        url: '/create',
        method: 'POST',
        body: assignmentdata,
      }),
      invalidatesTags: ['Assignment'],

    }),
    
    subject: builder.query({
      query: ({section,semester}) => ({  
        url: `/Allsubjects/${section}/${semester}`,
        method: 'GET',
      }),
      providesTags: ['Assignment'],
        }),

    assignmentbyid: builder.query({
      query: ({assignmentid,studentid}) => ({  
        url: `/getassignmentbyid/${assignmentid}/${studentid}`,
        method: 'GET',
      }),
      providesTags: ['Assignment'],
        }),

    assignmnets: builder.query({
        query: ({ subject, section,semester }) => ({
            url: `/subjects/${subject}/${section}/${semester}`,
            method: 'GET',
        }),
        providesTags: ['Assignment'],
          }),

    assignmnetsbyid: builder.query({
        query: ({ assignmentid}) => ({
            url: `/alla/${assignmentid}`, 
            method: 'GET',
        }),
        providesTags: ['Assignment'],
          }),
    

    Expiredassignmnetsbyid: builder.query({
      query: ({ subject,section}) => ({
          url: `/expire/${subject}/${section}`, 
          method: 'GET',
      }),
      providesTags: ['Assignment'],
      }),

  notExpiredassignmnetsbyid: builder.query({
    query: ({ subject,section}) => ({
        url: `/notexpire/${subject}/${section}`, 
        method: 'GET',
    }),
    providesTags: ['Assignment'],
  }),
    



teacheruploadassignment: builder.query({
  query: ({teacherid}) => ({  
    url: `/all/${teacherid}`,
    method: 'GET',
  }),
  providesTags: ['Assignment'],
}),

studentuploadassignment: builder.query({
  query: ({assignmentid}) => ({  
    url: `/Allassignmnetupload/${assignmentid}`,
    method: 'GET',
  }),
  providesTags: ['Assignment'],
}),


studentuploadassignmentcount: builder.query({
  query: ({ids,semester}) => ({  
    url: `/assignmnetcount/${ids}/${semester}`,
    method: 'GET',
  }),
  providesTags: ['Assignment'],
}),
  }),
});

export const { 
  useSubjectQuery,
  useAssignmnetsQuery,
  useAssignmnetsbyidQuery,
  useAssignmetuploaadMutation,
  useAssignmentbyidQuery,
  useExpiredassignmnetsbyidQuery,
  useNotExpiredassignmnetsbyidQuery,
  useCreateassignmentMutation,
  useTeacheruploadassignmentQuery,
  useStudentuploadassignmentQuery,
  useStudentuploadassignmentcountQuery
} = assignmentApi;
