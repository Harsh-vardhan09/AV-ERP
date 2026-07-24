import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_URL = `${import.meta.env.VITE_PORT}/api/v1/knowledgecenter/`;

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: 'include', 
  prepareHeaders: (headers) => {
    return headers;
  },
});

export const knowlegecenterapi = createApi({
  reducerPath: 'knowlegecenterapi',
  baseQuery,

  tagTypes: ['knowlegecenter'],
  endpoints: (builder) => ({
    knowlegecentercreate: builder.mutation({
      query: (formData) => ({ 
        url: `/create`,
        method: 'POST',
        body: formData,
      }),
      
    }),
      
    
    getknowlegde: builder.query({
      query: ({ section, semester }) => ({  
        url: `/getall?section=${section}&semester=${semester}`,
        method: 'GET',
      }),
    }),
    
      

   
  }),
});

export const { 
  useKnowlegecentercreateMutation,
  useGetknowlegdeQuery
} = knowlegecenterapi;
