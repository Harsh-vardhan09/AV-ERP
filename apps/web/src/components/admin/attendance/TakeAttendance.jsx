// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { toast } from 'react-hot-toast';

// const TakeAttendance = () => {
//   const semesterData = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
//   const sectionData = ["A", "B", "C", "D"];
//   const subjects = ["Digital System", "Data Structures", "Computer Networks", "Operating Systems", "Database Management", "Artificial Intelligence", "Machine Learning", "Cyber Security", "Software Engineering", "Web Development", "Cloud Computing", "Chemistry"];
//   const branches = ["CSE", "ECE", "EE", "ME", "CE", "ARE", "AI-DS", "CSE-cyber security", "CSE-IOT"];
//   const timeSlot = ["10.00-10.50", "10.50-11.40", "11.40-12.30", "12.30-1.20", "1.20-2.10", "2.10-3.50", "3.50-4.40"];
  
//   const studentData = [
//     { studentName: "Harsh Sahu", EnrollementNo: "0863CS221070" },
//     { studentName: "Himanshu Chourasiya", EnrollementNo: "0863CS221072" },
//     { studentName: "Harsh Khandelwal", EnrollementNo: "0863CS221067" },
//     { studentName: "Devendra Singh Sengar", EnrollementNo: "0863CS221054" },
//     { studentName: "Gautam Sutar", EnrollementNo: "0863CS221074" },
//     { studentName: "Garveet Jain", EnrollementNo: "0863CS221063" },
//     { studentName: "Gouransh Pathak", EnrollementNo: "0863CS221066" },
//     { studentName: "abhishek", EnrollementNo: "0863CS221081" },
//     { studentName: "Alisha", EnrollementNo: "0863CS221382" },
//     { studentName: "Harsh ", EnrollementNo: "0863CS223097" },
   
//   ];

//   const date = new Date();
//   const day = String(date.getDate()).padStart(2, '0');
//   const month = String(date.getMonth() + 1).padStart(2, '0');
//   const year = date.getFullYear();

//   const [fieldData, setFieldData] = useState({
//     semester: semesterData[0],
//     branch: branches[0],
//     section: sectionData[0],
//     subject: subjects[0],
//     topic: "Default Topic",
//     timeSlot: timeSlot[0],
//   });

//   const [attendanceStatus, setAttendanceStatus] = useState({});
  
//   useEffect(() => {
//     const initialAttendance = studentData.reduce((acc, student) => {
//       acc[student.EnrollementNo] = 'absent';
//       return acc;
//     }, {});
//     setAttendanceStatus(initialAttendance);
//   }, []);

//   const setData = (e) => {
//     setFieldData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
//   };

//   const updateStatus = (e) => {
//     const [status, enrollementNo] = e.target.value.split("-");
//     setAttendanceStatus((prev) => ({ ...prev, [enrollementNo]: status }));
//   };

//   const counts = {
//     present: Object.values(attendanceStatus).filter((status) => status === 'present').length,
//     absent: Object.values(attendanceStatus).filter((status) => status === 'absent').length,
//     leave: Object.values(attendanceStatus).filter((status) => status === 'leave').length,
//   };

//   const submitHandler = async () => {
//     const finalData = { ...fieldData, attendanceStatus, date: `${day}-${month}-${year}` };
    

//     try {
//       const response = await axios.post(`${import.meta.env.VITE_PORT}/attendancedata`, finalData);
//       console.log('Attendance submitted:', response.data);
//       toast.success("Attendance submitted succesfully");
//     } catch (error) {
//       console.error('Submission error:', error);
//       toast.error("Attendance not submitted");
//     }
//   };

//   return (<>
//     <div className='flex flex-col lg:flex-row justify-between p-2'>
//       {/* Fields Section */}
//       <div className='lg:w-[30%] lg:mr-4 bg-purple-100 shadow-xl flex flex-col justify-around  lg:h-full'>
//         <div className='flex flex-col mb-2'>
//           <label htmlFor="semester">Semester</label>
//           <select id="semester" className='border-[2px] border-solid border-black rounded' value={fieldData.semester} onChange={setData}>
//             {semesterData.map((sem) => <option key={sem} value={sem}>{sem}</option>)}
//           </select>
//         </div>

//         <div className='flex flex-col mb-2'>
//           <label htmlFor="branch">Branch</label>
//           <select id="branch" className='border-[2px] border-solid border-black rounded' value={fieldData.branch} onChange={setData}>
//             {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
//           </select>
//         </div>

//         <div className='flex flex-col mb-2'>
//           <label htmlFor="section">Section</label>
//           <select id="section" className='border-[2px] border-solid border-black rounded' value={fieldData.section} onChange={setData}>
//             {sectionData.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
//           </select>
//         </div>

//         <div className='flex flex-col mb-2'>
//           <label htmlFor="subject">Subject</label>
//           <select id="subject" className='border-[2px] border-solid border-black rounded' value={fieldData.subject} onChange={setData}>
//             {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
//           </select>
//         </div>

//         <div className='flex flex-col mb-2'>
//           <label htmlFor="date">Date</label>
//           <input type="text" value={`${day}-${month}-${year}`} readOnly className='border-[2px] border-solid border-black rounded' />
//         </div>

//         <div className='flex flex-col mb-2'>
//           <label htmlFor="topic">Topic</label>
//           <textarea id="topic" className='resize-none border-[2px] border-solid border-black rounded w-full' value={fieldData.topic} onChange={setData}></textarea>
//         </div>

//         <div className='flex flex-col mb-2'>
//           <label htmlFor="timeSlot">Time</label>
//           <select id="timeSlot" className='border-[2px] border-solid border-black rounded' value={fieldData.timeSlot} onChange={setData}>
//             {timeSlot.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
//           </select>
//         </div>
//       </div>

//       {/* Attendance Table */}
//       <div className='max-h-svh overflow-y-scroll lg:w-[60%] w-full mt-4 lg:mt-0 shadow-xl'>
//         <table className='w-full border-gray-300 border-solid border-[1px] h-[40%]'>
//           <thead className='border-gray-300 border-solid border-[1px]'>
//             <tr>
//               <th className='text-start w-16 border-gray-300 border-solid border-[1px] text-xl'>Sr No</th>
//               <th className='text-start border-gray-300 border-solid border-[1px] text-xl'>Enrollment No</th>
//               <th className='text-start border-gray-300 border-solid border-[1px] text-xl'>Student Name</th>
//               <th className='text-start border-gray-300 border-solid border-[1px] text-xl'>Status</th>
//             </tr>
//           </thead>
//           <tbody>
//             {studentData.map((student, index) => (
//               <tr key={student.EnrollementNo} className='border-gray-300 border-solid border-[1px] h-16'>
//                 <td className='border-gray-300 border-solid border-[1px]'>{index + 1}</td>
//                 <td className='border-gray-300 border-solid border-[1px]'>{student.EnrollementNo}</td>
//                 <td className='border-gray-300 border-solid border-[1px]'>{student.studentName}</td>
//                 <td className='border-gray-300 border-solid border-[1px] '>
//                   <label className='ml-3'>
//                     <input type="radio" value={`present-${student.EnrollementNo}`} checked={attendanceStatus[student.EnrollementNo] === 'present'} onChange={updateStatus} />
//                     Present
//                   </label>
//                   <label className='ml-3'>
//                     <input type="radio" value={`absent-${student.EnrollementNo}`} checked={attendanceStatus[student.EnrollementNo] === 'absent'} onChange={updateStatus} />
//                     Absent
//                   </label>
//                   <label className='ml-3'>
//                     <input type="radio" value={`leave-${student.EnrollementNo}`} checked={attendanceStatus[student.EnrollementNo] === 'leave'} onChange={updateStatus} />
//                      Leave
//                   </label>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Attendance Summary */}
//       <div className='lg:w-[25%] lg:ml-4 bg-purple-100 shadow-xl p-4 mt-4 lg:mt-0'>
//         <h2 className='text-center text-xl font-semibold mb-4'>Attendance Summary</h2>
//         <p><strong>Present:</strong> {counts.present}</p>
//         <p><strong>Absent:</strong> {counts.absent}</p>
//         <p><strong>Leave:</strong> {counts.leave}</p>
//         <p><strong>Total:</strong> {studentData.length}</p>
//         <p><strong>Subject Name:</strong> {fieldData.subject}</p>

//         <button className="mt-8 bg-blue-500 text-white px-4 py-2 rounded " onClick={submitHandler}>Submit Attendance</button>

        
//       </div>
//     </div>

    
//     {/* Responsive Styles */}
//     <style >{`
//       @media (max-width: 1024px) {
//         .flex {
//           flex-direction: column;
//         }

//         .lg\\:w-\\[35%\\], .lg\\:w-\\[60%\\], .lg\\:w-\\[25%\\] {
//           width: 100%;
//         }

//         .lg\\:mr-4, .lg\\:ml-4 {
//           margin-right: 0;
//           margin-left: 0;
//         }

//         .lg\\:mt-0 {
//           margin-top: 1rem;
//         }
//       }
//     `}</style>
//   </>);
// };

// export default TakeAttendance;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const TakeAttendance = () => {
  // Data constants
  const semesterData = ["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
  const sectionData = ["A", "B", "C", "D"];
  const subjects = ["Digital System", "Data Structures", "Computer Networks", "Operating Systems", "Database Management", "Artificial Intelligence", "Machine Learning", "Cyber Security", "Software Engineering", "Web Development", "Cloud Computing", "Chemistry"];
  const branches = ["CSE", "ECE", "EE", "ME", "CE", "ARE", "AI-DS", "CSE-cyber security", "CSE-IOT"];
  const timeSlot = ["10:00-10:50", "10:50-11:40", "11:40-12:30", "12:30-1:20", "1:20-2:10", "2:10-3:50", "3:50-4:40"];
  
  // Sample student data
  const studentData = [
    
    { studentName: "Harsh khandelwal", EnrollementNo: "101" },
    { studentName: "Harsh Sahu", EnrollementNo: "0863CS221070" },
    { studentName: "Himanshu Chourasiya", EnrollementNo: "0863CS221072" },
    { studentName: "Harsh Khandelwal", EnrollementNo: "0863CS221067" },
    { studentName: "Devendra Singh Sengar", EnrollementNo: "0863CS221054" },
    { studentName: "Gautam Sutar", EnrollementNo: "0863CS221074" },
    { studentName: "Garveet Jain", EnrollementNo: "0863CS221063" },
    { studentName: "Gouransh Pathak", EnrollementNo: "0863CS221066" },
    { studentName: "Abhishek", EnrollementNo: "0863CS221081" },
    { studentName: "Alisha", EnrollementNo: "0863CS221382" },
    { studentName: "Harsh", EnrollementNo: "0863CS223097" },

  ];

  // Get current date
  const date = new Date();
  const formattedDate = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;

  // App state
  const [step, setStep] = useState(1); // 1: Quick Setup, 2: Attendance, 3: Review
  const [quickSetupMode, setQuickSetupMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentlyMarked, setRecentlyMarked] = useState(null);
  const [showQuickRecommendations, setShowQuickRecommendations] = useState(false);
  const [savedClasses, setSavedClasses] = useState([
    { id: 1, name: "CSE-V-A Data Structures", subject: "Data Structures", branch: "CSE", semester: "V", section: "A" },
    { id: 2, name: "ECE-III-B Digital System", subject: "Digital System", branch: "ECE", semester: "III", section: "B" }
  ]);
  
  // Form state
  const [fieldData, setFieldData] = useState({
    semester: semesterData[0],
    branch: branches[0],
    section: sectionData[0],
    subject: subjects[0],
    topic: "",
    timeSlot: timeSlot[0],
  });

  // Attendance state
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [swipeMode, setSwipeMode] = useState(false);
  
  // Initialize attendance as absent for all students
  useEffect(() => {
    const initialAttendance = studentData.reduce((acc, student) => {
      acc[student.EnrollementNo] = 'absent';
      return acc;
    }, {});
    setAttendanceStatus(initialAttendance);
  }, []);

  // Handle field changes
  const setData = (e) => {
    setFieldData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  // Select a saved class
  const selectSavedClass = (savedClass) => {
    setFieldData({
      ...fieldData,
      subject: savedClass.subject,
      branch: savedClass.branch,
      semester: savedClass.semester,
      section: savedClass.section
    });
    setStep(2);
  };

  // Toggle attendance status with swipe animation
  const toggleAttendance = (enrollmentNo) => {
    setAttendanceStatus((prev) => {
      const currentStatus = prev[enrollmentNo];
      let newStatus;
      
      if (currentStatus === 'absent') newStatus = 'present';
      else if (currentStatus === 'present') newStatus = 'leave';
      else newStatus = 'absent';
      
      return { ...prev, [enrollmentNo]: newStatus };
    });
    
    // Show recently marked animation
    setRecentlyMarked(enrollmentNo);
    setTimeout(() => setRecentlyMarked(null), 1000);
  };

  // Handle swipe gesture for attendance
  const handleSwipe = (direction, enrollmentNo) => {
    // Implement swipe logic here
    const newStatus = direction === 'right' ? 'present' : 'absent';
    setAttendanceStatus((prev) => ({
      ...prev,
      [enrollmentNo]: newStatus
    }));
    
    // Show recently marked animation
    setRecentlyMarked(enrollmentNo);
    setTimeout(() => setRecentlyMarked(null), 1000);
  };

  // Mark all students as present
  const markAllPresent = () => {
    const allPresent = studentData.reduce((acc, student) => {
      acc[student.EnrollementNo] = 'present';
      return acc;
    }, {});
    setAttendanceStatus(allPresent);
    toast.success("All students marked present");
  };

  // Mark all students as absent
  const markAllAbsent = () => {
    const allAbsent = studentData.reduce((acc, student) => {
      acc[student.EnrollementNo] = 'absent';
      return acc;
    }, {});
    setAttendanceStatus(allAbsent);
    toast.success("All students marked absent");
  };

  // Calculate attendance summary
  const counts = {
    present: Object.values(attendanceStatus).filter((status) => status === 'present').length,
    absent: Object.values(attendanceStatus).filter((status) => status === 'absent').length,
    leave: Object.values(attendanceStatus).filter((status) => status === 'leave').length,
  };

  // Filter students based on search
  const filteredStudents = studentData.filter(student => 
    student.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.EnrollementNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Submit attendance data
  const submitHandler = async () => {
    setIsSubmitting(true);
    const finalData = { 
      ...fieldData, 
      attendanceStatus, 
      date: formattedDate,
    };

    try {
      const response = await axios.post(`${import.meta.env.VITE_PORT}/attendancedata`, finalData);
      toast.success("Attendance submitted successfully");
      // Reset form or navigate to a different page
      setStep(1);
      
      // Reset attendance status
      const initialAttendance = studentData.reduce((acc, student) => {
        acc[student.EnrollementNo] = 'absent';
        return acc;
      }, {});
      setAttendanceStatus(initialAttendance);
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error("Failed to submit attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get class based on time
  const getRecommendedClasses = () => {
    const hour = new Date().getHours();
    // Simple logic to recommend classes based on time of day
    if (hour >= 8 && hour < 10) {
      return savedClasses.filter(c => c.id === 1);
    } else if (hour >= 10 && hour < 12) {
      return savedClasses.filter(c => c.id === 2);
    }
    return savedClasses;
  };

  // Render step content
  const renderStepContent = () => {
    switch(step) {
      case 1: // Quick Setup
        return (
          <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Quick Class Setup</h2>
            
            {/* Quick Recommendations */}
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-2">Suggested Classes</h3>
              <div className="flex overflow-x-auto space-x-2 pb-2">
                {getRecommendedClasses().map(savedClass => (
                  <div 
                    key={savedClass.id}
                    className="flex-shrink-0 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100"
                    onClick={() => selectSavedClass(savedClass)}
                  >
                    <div className="font-medium">{savedClass.name}</div>
                    <div className="text-xs text-gray-500">{savedClass.semester} Sem • {savedClass.section} Section</div>
                  </div>
                ))}
                <div 
                  className="flex-shrink-0 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 flex items-center justify-center"
                  onClick={() => setShowQuickRecommendations(true)}
                >
                  <div className="text-gray-500">+ More</div>
                </div>
              </div>
            </div>
            
            {/* Toggle between quick setup and detailed setup */}
            <div className="mb-4">
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  className={`flex-1 py-2 ${quickSetupMode ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => setQuickSetupMode(true)}
                >
                  Quick Setup
                </button>
                <button
                  className={`flex-1 py-2 ${!quickSetupMode ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                  onClick={() => setQuickSetupMode(false)}
                >
                  Detailed Setup
                </button>
              </div>
            </div>
            
            {quickSetupMode ? (
              // Quick Setup Form
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select 
                    id="subject" 
                    className="w-full p-3 border rounded-lg text-base" 
                    value={fieldData.subject} 
                    onChange={setData}
                  >
                    {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                    <select 
                      id="branch" 
                      className="w-full p-3 border rounded-lg text-base" 
                      value={fieldData.branch} 
                      onChange={setData}
                    >
                      {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select 
                      id="semester" 
                      className="w-full p-3 border rounded-lg text-base" 
                      value={fieldData.semester} 
                      onChange={setData}
                    >
                      {semesterData.map((sem) => <option key={sem} value={sem}>{sem}</option>)}
                    </select>
                  </div>
                </div>
                
                <button
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium text-lg"
                  onClick={() => setStep(2)}
                >
                  Start Taking Attendance
                </button>
              </div>
            ) : (
              // Detailed Setup Form
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select 
                      id="semester" 
                      className="w-full p-2 border rounded text-sm" 
                      value={fieldData.semester} 
                      onChange={setData}
                    >
                      {semesterData.map((sem) => <option key={sem} value={sem}>{sem}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <select 
                      id="section" 
                      className="w-full p-2 border rounded text-sm" 
                      value={fieldData.section} 
                      onChange={setData}
                    >
                      {sectionData.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select 
                    id="branch" 
                    className="w-full p-2 border rounded text-sm" 
                    value={fieldData.branch} 
                    onChange={setData}
                  >
                    {branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select 
                    id="subject" 
                    className="w-full p-2 border rounded text-sm" 
                    value={fieldData.subject} 
                    onChange={setData}
                  >
                    {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
                  <select 
                    id="timeSlot" 
                    className="w-full p-2 border rounded text-sm" 
                    value={fieldData.timeSlot} 
                    onChange={setData}
                  >
                    {timeSlot.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <input
                    type="text"
                    id="topic"
                    placeholder="Enter topic covered"
                    className="w-full p-2 border rounded text-sm"
                    value={fieldData.topic}
                    onChange={setData}
                  />
                </div>
                
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    id="saveClass"
                    className="mr-2"
                  />
                  <label htmlFor="saveClass" className="text-sm text-gray-700">Save this class for future</label>
                </div>
                
                <button
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium mt-2"
                  onClick={() => setStep(2)}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        );
        
      case 2: // Attendance
        return (
          <div className="p-4 pb-24">
            {/* Header */}
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Take Attendance</h2>
                <p className="text-sm text-gray-600">
                  {fieldData.subject} • {fieldData.branch}-{fieldData.semester}-{fieldData.section}
                </p>
              </div>
              <div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={swipeMode}
                    onChange={() => setSwipeMode(!swipeMode)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-sm font-medium text-gray-900">Swipe</span>
                </label>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search students..."
                className="w-full p-3 pl-10 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="absolute top-3 left-3 w-5 h-5 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              {searchTerm && (
                <button 
                  className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchTerm('')}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="flex justify-between mb-4">
              <div className="grid grid-cols-3 gap-2 w-full">
                <button 
                  className="bg-green-500 text-white p-3 rounded-lg text-sm font-medium"
                  onClick={markAllPresent}
                >
                  All Present
                </button>
                <button 
                  className="bg-red-500 text-white p-3 rounded-lg text-sm font-medium"
                  onClick={markAllAbsent}
                >
                  All Absent
                </button>
                <button 
                  className="bg-blue-500 text-white p-3 rounded-lg text-sm font-medium"
                  onClick={() => setStep(3)}
                >
                  Review
                </button>
              </div>
            </div>
            
            {/* Attendance Counter */}
            <div className="bg-white p-3 rounded-lg shadow-sm mb-4">
              <div className="flex justify-between text-sm">
                <div>
                  <span className="font-bold text-green-600">{counts.present}</span> Present
                </div>
                <div>
                  <span className="font-bold text-red-600">{counts.absent}</span> Absent
                </div>
                <div>
                  <span className="font-bold text-yellow-600">{counts.leave}</span> Leave
                </div>
                <div>
                  <span className="font-bold">{studentData.length}</span> Total
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(counts.present / studentData.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            {/* Instructions */}
            {swipeMode && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4 text-sm">
                <p>Swipe right to mark present, left to mark absent</p>
              </div>
            )}
            
            {/* Student List */}
            <div className="space-y-2">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No students found</div>
              ) : (
                filteredStudents.map((student) => {
                  const status = attendanceStatus[student.EnrollementNo];
                  let statusColor = "bg-red-500";
                  let statusText = "Absent";
                  
                  if (status === 'present') {
                    statusColor = "bg-green-500";
                    statusText = "Present";
                  } else if (status === 'leave') {
                    statusColor = "bg-yellow-500";
                    statusText = "Leave";
                  }
                  
                  return (
                    <div 
                      key={student.EnrollementNo}
                      className={`bg-white rounded-lg shadow-sm p-4 relative ${recentlyMarked === student.EnrollementNo ? 'animate-pulse' : ''}`}
                      onClick={() => !swipeMode && toggleAttendance(student.EnrollementNo)}
                    >
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${statusColor} mr-3`}>
                          {student.studentName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-xs text-gray-600">{student.EnrollementNo}</p>
                        </div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full ${status === 'present' ? 'bg-green-100 text-green-800' : status === 'leave' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                          {statusText}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      
      case 3: // Review
        return (
          <div className="p-4 pb-24">
            <h2 className="text-xl font-bold mb-4">Review Attendance</h2>
            
            {/* Class Summary */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h3 className="font-medium text-gray-800 mb-2">Class Details</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subject:</span>
                  <span className="font-medium">{fieldData.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Branch:</span>
                  <span className="font-medium">{fieldData.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Semester:</span>
                  <span className="font-medium">{fieldData.semester}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Section:</span>
                  <span className="font-medium">{fieldData.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{formattedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{fieldData.timeSlot}</span>
                </div>
              </div>
            </div>
            
            {/* Attendance Summary */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h3 className="font-medium text-gray-800 mb-2">Attendance Summary</h3>
              <div className="flex justify-between mb-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{counts.present}</div>
                  <div className="text-xs text-gray-600">Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{counts.absent}</div>
                  <div className="text-xs text-gray-600">Absent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{counts.leave}</div>
                  <div className="text-xs text-gray-600">Leave</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(counts.present / studentData.length) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-center mt-1 text-gray-600">
                {Math.round((counts.present / studentData.length) * 100)}% attendance
              </div>
            </div>
            
            {/* Absent Students List */}
            {counts.absent > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <h3 className="font-medium text-gray-800 mb-2">Absent Students</h3>
                <div className="space-y-2">
                  {studentData
                    .filter(student => attendanceStatus[student.EnrollementNo] === 'absent')
                    .map((student) => (
                      <div key={student.EnrollementNo} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-xs text-gray-600">{student.EnrollementNo}</p>
                        </div>
                        <button 
                          className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                          onClick={() => {
                            setAttendanceStatus(prev => ({
                              ...prev,
                              [student.EnrollementNo]: 'present'
                            }));
                          }}
                        >
                          Mark Present
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
            
            {/* On Leave Students List */}
            {counts.leave > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <h3 className="font-medium text-gray-800 mb-2">On Leave</h3>
                <div className="space-y-2">
                  {studentData
                    .filter(student => attendanceStatus[student.EnrollementNo] === 'leave')
                    .map((student) => (
                      <div key={student.EnrollementNo} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-xs text-gray-600">{student.EnrollementNo}</p>
                        </div>
                        <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          On Leave
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* App Bar */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">QuickMark</h1>
          <p className="text-xs opacity-75">{formattedDate}</p>
        </div>
        {step > 1 && (
          <button 
            className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-medium"
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>
        )}
      </div>
      
      {/* Step Indicator */}
      <div className="flex justify-between bg-white p-2 mb-2">
        <div 
          className={`flex-1 text-center py-2 text-sm font-medium ${step === 1 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => step > 1 && setStep(1)}
        >
          Setup
        </div>
        <div 
          className={`flex-1 text-center py-2 text-sm font-medium ${step === 2 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => step > 2 && setStep(2)}
        >
          Attendance
        </div>
        <div className={`flex-1 text-center py-2 text-sm font-medium ${step === 3 ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          onClick={() => step > 3 && setStep(3)}
        >
          Review
        </div>
      </div>
      
      {/* Main Content */}
      {renderStepContent()}
      
      {/* Bottom Actions */}
      {step === 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
          <button
            className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium"
            onClick={() => setStep(3)}
          >
            Review Attendance
          </button>
        </div>
      )}
      
      {step === 3 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
          <button
            className={`w-full ${isSubmitting ? 'bg-blue-300' : 'bg-blue-500'} text-white py-3 rounded-lg font-medium`}
            onClick={submitHandler}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </div>
      )}
      
      {/* Quick Recommendations Modal */}
      {showQuickRecommendations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-11/12 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Saved Classes</h3>
              <button onClick={() => setShowQuickRecommendations(false)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {savedClasses.map(savedClass => (
                <div 
                  key={savedClass.id}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => {
                    selectSavedClass(savedClass);
                    setShowQuickRecommendations(false);
                  }}
                >
                  <div className="font-medium">{savedClass.name}</div>
                  <div className="text-xs text-gray-500">{savedClass.semester} Sem • {savedClass.section} Section</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeAttendance;