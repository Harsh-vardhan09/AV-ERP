import React from 'react'
import { useTeacheruploadassignmentQuery } from '../redux/api/assignmentapi'
import { useSelector } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
// import Assignment from '../../../backend/src/models/assignment';

const Teachersassignment = () => {
const navigate=  useNavigate();
const teacherid=  useSelector(state=>state?.user?.user?.user?._id)
 const {data,error,isLoading}= useTeacheruploadassignmentQuery({teacherid});
 console.log(data?.teacherassignments);
  const assignmenthandle=(id)=>{
    navigate(id);
  }
  return (
    <div>
   <h2>Teachers Assignment Page</h2>
    <div className='flex flex-wrap justify-around'>
      {
        data?.teacherassignments.map(Assignment=>{
          return(
            <div onClick={()=>assignmenthandle(Assignment._id)} className='w-40 h-40 m-5 bg-gray-400'>
              <h1>{Assignment.subject}</h1>
              <h1>{Assignment.title}</h1>
            </div>
          )
        })
      }

    </div>
    
    </div>
  )
}

export default Teachersassignment
