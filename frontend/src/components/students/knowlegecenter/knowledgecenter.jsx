// export function KnowlegedgeCenter(){


//     const details=[{
//         subjectName: "Theory Of computation",
//         TeacherName: "Mr.Atul Barve",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     },{
//         subjectName: "IWT",
//         TeacherName: "Ms.Yakutta Tayebi",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     },{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     }
//     ,{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     }
//     ,{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     }
//     ,{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     }
//     ,{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     }
//     ,{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     },{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     },{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     },{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     },{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     },{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     },{
//         subjectName: "Cyber Security",
//         TeacherName: "Mr.Ritesh Jain",
//         Unit:"Unit 1",
//         date: "7 Dec 2024"
//     }
//     ]

  
//     return(
//         <>
//         <div className="bg-[#d1d0d0]">
//         <div className="min-[300px]: h-[15vh] py-9 pl-2 text-black text-wrap bg-[#5c4e4e] fixed w-[100%] z-[99999] shadow-md">
//             <h2 className="f">KONWLEDGE CENTER</h2></div>

      
//         <div className=" md:flex md:justify-stretch flex flex-wrap px-7 pt-[15vh] ">
//       {
//         details.map((e)=>{
//             return  <div className="h-max p-2 bg-[#fff] m-3 rounded-md sm:flex relative   max-md:h-15 max-md:w-[100vw] md:h-[32vh] md:w-[30vw]  ">
//               <div className="p-2 "> 
//                <h2 className="min-[300px]:text-3xl sm:text-4xl md:text-wrap min-[439]:bg-slate-900 text-black">{e.subjectName}</h2>
    
//                <div className="md:absolute md:bottom-[4vh] md:left-0 md:ml-3">


    
//                <h5 className="md: text-xl">{e.TeacherName}</h5>

//                <h5 className="">{e.Unit}</h5>

//                <h5 className="">{e.date}</h5>
//                </div>
    
//                <button className= " m-2 pb-2  absolute bottom-0 right-0  bg-black text-white  rounded-xl min-[200px]:bg-red md:w-[10vw] md:m-6 md:font-bold">Download</button>
//                </div>
//                 </div>
            
//       }
//       )
//       }
//           </div>
//           </div>
//      </>
//     )
// }

import React, { useState } from 'react';

export function KnowledgeCenter() {
const [details,setdetails] =  useState([]);
useEffect(() => {
    const fetchdata = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_PORT}/api/v1/knowledgecenter/getall`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        setdetails(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchdata();
  }, []); 
  console.log(details);
  // const details = [
  //   {
  //     subjectName: "Theory Of Computation",
  //     teacherName: "Mr. Atul Barve",
  //     unit: "Unit 1",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "IWT",
  //     teacherName: "Ms. Yakutta Tayebi",
  //     unit: "Unit 1",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Cyber Security",
  //     teacherName: "Mr. Ritesh Jain",
  //     unit: "Unit 1",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Data Analytics",
  //     teacherName: "Mr. Ritesh Jain",
  //     unit: "Unit 1",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Machine Learning",
  //     teacherName: "Dr. Amit Shah",
  //     unit: "Unit 1",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Cloud Computing",
  //     teacherName: "Mrs. Priya Desai",
  //     unit: "Unit 2",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Database Systems",
  //     teacherName: "Mr. Sanjay Kumar",
  //     unit: "Unit 3",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Software Engineering",
  //     teacherName: "Ms. Deepa Gupta",
  //     unit: "Unit 1",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Network Security",
  //     teacherName: "Dr. Rohit Verma",
  //     unit: "Unit 2",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Web Development",
  //     teacherName: "Mr. Karan Mehta",
  //     unit: "Unit 1",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Operating Systems",
  //     teacherName: "Dr. Neha Sharma",
  //     unit: "Unit 3",
  //     date: "7 Dec 2024"
  //   },
  //   {
  //     subjectName: "Artificial Intelligence",
  //     teacherName: "Prof. Rahul Mishra",
  //     unit: "Unit 2",
  //     date: "7 Dec 2024"
  //   }
  // ];

  return (
    <div className="bg-gray-100 min-h-screen pb-8">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg fixed w-full z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-wider">KNOWLEDGE CENTER</h1>
          <p className="text-blue-200 text-sm md:text-base">Access course materials and resources</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 pt-24 md:pt-28">
        {/* Search and Filter (optional) */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="relative mb-4 md:mb-0 md:w-1/3">
            <input
              type="text"
              placeholder="Search subjects..."
              className="w-full py-2 px-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-3 top-2.5">🔍</span>
          </div>
          <div className="flex space-x-2">
            <select className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Units</option>
              <option value="Unit 1">Unit 1</option>
              <option value="Unit 2">Unit 2</option>
              <option value="Unit 3">Unit 3</option>
            </select>
            <select className="px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Teachers</option>
              <option value="Mr. Atul Barve">Mr. Atul Barve</option>
              <option value="Ms. Yakutta Tayebi">Ms. Yakutta Tayebi</option>
              <option value="Mr. Ritesh Jain">Mr. Ritesh Jain</option>
            </select>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {details.map((item, index) => (
            <div 
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold text-gray-800 mb-2">{item.subjectName}</h2>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{item.unit}</span>
                </div>
                
                <div className="mt-4 text-gray-600">
                  <div className="flex items-center mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    <p>{item.teacherName}</p>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p>{item.date}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 flex justify-end">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-300 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}