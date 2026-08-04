import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { prepareAuthHeaders } from './authHeader';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/chat/`;
const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include', 
  prepareHeaders: prepareAuthHeaders,
});

export const chatapi = createApi({
  reducerPath: 'chatApi',
  baseQuery,

  tagTypes: ['chat'],
  endpoints: (builder) => ({
    assignmetuploaad: builder.mutation({
      query: ({studentid,assignmentid,formData}) => ({ 
        url: `/getchat/${studentid}/${assignmentid}`,
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
    
    getallchat: builder.query({
      query: () => ({  
        url: `getchat`,
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
     useGetallchatQuery
} = chatapi;
