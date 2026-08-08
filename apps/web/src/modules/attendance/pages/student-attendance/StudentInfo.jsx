// // components/attendance/StudentInfo.js
// import React from 'react';
// import { useSelector } from 'react-redux';

// const StudentInfo = ({ studentSemester, setStudentSemester ,studentSemesters}) => {
// const name=  useSelector(state=>state?.user?.user?.user?.name)

//   return (
//     <div className='bg-white shadow-md rounded-lg p-4'>
//       <h2 className='text-lg font-semibold mb-4'>Student Information</h2>
//       <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
//         <div>
//           <label className='mb-2 block'>Student Name</label>
//           <input 
//             type="text" 
//             defaultValue={name}
          

//             className='border-2 border-gray-300 rounded p-2 w-full' 
//             readOnly
//           />
//         </div>
//         <div>
//           <label className='mb-2 block'>Semester</label>
//           <select 
//             className='border-2 border-gray-300 rounded p-2 w-full'
//             onChange={(e) => setStudentSemester(e.target.value)}
//           >
//             {studentSemesters.map((e, index) => (
//               <option key={index} value={e}>{e}</option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label className='mb-2 block'>Course</label>

//           <input className='border-2 border-gray-300 rounded p-2 w-full' defaultValue="B.tech" readOnly />
          
//         </div>
//       </div>
//     </div>
//   );
// };

// export default StudentInfo;


import React from 'react';
import { useSelector } from 'react-redux';

const StudentInfo = ({ studentSemester, setStudentSemester, studentSemesters }) => {
  const name = useSelector(state => state?.user?.user?.user?.firstName);

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
        <h2 className="text-lg font-semibold text-white">Student Profile</h2>
      </div>
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Student Name</label>
            <input 
              type="text" 
              defaultValue={name}
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors" 
              readOnly
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Semester</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded-md text-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              onChange={(e) => setStudentSemester(e.target.value)}
              value={studentSemester}
            >
              {studentSemesters.map((e, index) => (
                <option key={index} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Course</label>
            <input 
              className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700" 
              defaultValue="B.Tech" 
              readOnly 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentInfo;
