// // pages/AttendancePage.js
// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import StudentInfo from './StudentInfo';
// import SubjectSelect from './SubjectSelect';
// import AttendanceTable from './AttendanceTable';
// import AttendanceSummary from './AttendanceSummary';
// import DateSelect from './DateWiseAttendnce';
// import { useSelector } from 'react-redux';
// import Loader from '@shared/ui/Loader';

// const AttendancePage = () => {
//   const subjects = [
//     "Digital System", "Data Structures", "Computer Networks", "Operating Systems", 
//     "Database Management", "Artificial Intelligence", "Machine Learning", 
//     "Cyber Security", "Software Engineering", "Web Development", "Cloud Computing", "Chemistry"
//   ];

//   const studentSemesters = ["I", "II", "III", "IV", "V"];
//   const [selectedOption, setSelectedOption] = useState('All');
//   const [studentSemester, setStudentSemester] = useState(studentSemesters);
//   const [startDate, setStartDate] = useState(null);
//   const [endDate, setEndDate] = useState(null);
//   const [attendanceData, setAttendanceData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//     const id=   useSelector(state=>state.user?.user?.user?.program.scholar_no)
//   useEffect(() => {
//     const fetchAttendanceData = async () => {
//       try {
//         const response = await axios.get(`${import.meta.env.VITE_PORT}/get/attendance/${id}`);
//         setAttendanceData(response.data);

//       } catch (err) {
//         setError('Error fetching attendance data');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAttendanceData();
//   }, []);
  
  
//   const calculateSummary = (data) => {
//     const summary = { total: 0, present: 0, absent: 0, leaves: 0, notApplicable: 0 };
//     data.forEach((record) => {
//       if (!record.Status) return;
//       summary.total += 1;
//       switch (record.Status.toLowerCase()) {
//         case 'present': summary.present += 1; break;
//         case 'absent': summary.absent += 1; break;
//         case 'leave': summary.leaves += 1; break;
//         case 'not applicable': summary.notApplicable += 1; break;
//         default: break;
//       }
//     });
//     return summary;
//   };

//   const calculatePercent = (present, total) => total > 0 ? ((present / total) * 100).toFixed(2) : "0.00";

//   const dateFilter = (startdate, enddate) => {
//     setStartDate(startdate);
//     setEndDate(enddate);
//   };

//   const filteredAttendanceData = attendanceData.filter((e) => {
//     const entryDate = new Date(e.Date.split('-').reverse().join('-'));
//     const start = startDate ? new Date(startDate) : null;
//     const end = endDate ? new Date(endDate) : null;
//     const withinDateRange = (!start || !end) || (entryDate >= start && entryDate <= end);
//     const withinSubject = selectedOption === "All" || e.subjectName === selectedOption;
//     return withinDateRange && withinSubject;
//   });
//   const summary = calculateSummary(filteredAttendanceData);

//   if (loading) {
//     return <Loader></Loader>
//   }

//   if (error) {
//     return <div className="text-center text-lg text-red-600">{error}</div>;
//   }

//   return (
//     <div className="min-h-screen bg-gray-100 p-4 md:p-8">
//       <div className="max-w-7xl mx-auto">
//         <h1 className="text-2xl font-bold mb-4 text-center">Attendance Management System</h1>
//         <div className="grid gap-4 lg:grid-cols-3">
//           <div className="lg:col-span-2 space-y-4">
//             <StudentInfo studentSemester={studentSemester} setStudentSemester={setStudentSemester} studentSemesters={studentSemesters}/>
//             <SubjectSelect selectedOption={selectedOption} setSelectedOption={setSelectedOption} subjects={subjects} />
//             <DateSelect dateFilter={dateFilter} />
//             <AttendanceTable filteredAttendanceData={filteredAttendanceData} />
//           </div>
//           <AttendanceSummary summary={summary} calculatePercent={calculatePercent} />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AttendancePage;







// components/attendance/AttendancePage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import StudentInfo from './StudentInfo';
import SubjectSelect from './SubjectSelect';
import AttendanceTable from './AttendanceTable';
import AttendanceSummary from './AttendanceSummary';
import DateSelect from './DateWiseAttendnce';
import { useSelector } from 'react-redux';
import Loader from '@shared/ui/Loader';

const AttendancePage = () => {
  const subjects = [
    "Digital System", "Data Structures", "Computer Networks", "Operating Systems", 
    "Database Management", "Artificial Intelligence", "Machine Learning", 
    "Cyber Security", "Software Engineering", "Web Development", "Cloud Computing", "Chemistry"
  ];

  const studentSemesters = ["I", "II", "III", "IV", "V"];
  const [selectedOption, setSelectedOption] = useState('All');
  const [studentSemester, setStudentSemester] = useState(studentSemesters);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const id = useSelector(state => state.user?.user?.user?.rollno);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_PORT}/get/attendance/${id}`);
        setAttendanceData(response.data);
      } catch (err) {
        setError('Error fetching attendance data');
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, []);
  
  const calculateSummary = (data) => {
    const summary = { total: 0, present: 0, absent: 0, leaves: 0, notApplicable: 0 };
    data.forEach((record) => {
      if (!record.Status) return;
      summary.total += 1;
      switch (record.Status.toLowerCase()) {
        case 'present': summary.present += 1; break;
        case 'absent': summary.absent += 1; break;
        case 'leave': summary.leaves += 1; break;
        case 'not applicable': summary.notApplicable += 1; break;
        default: break;
      }
    });
    return summary;
  };

  const calculatePercent = (present, total) => total > 0 ? ((present / total) * 100).toFixed(2) : "0.00";

  const dateFilter = (startdate, enddate) => {
    setStartDate(startdate);
    setEndDate(enddate);
  };

  const filteredAttendanceData = attendanceData.filter((e) => {
    const entryDate = new Date(e.Date.split('-').reverse().join('-'));
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const withinDateRange = (!start || !end) || (entryDate >= start && entryDate <= end);
    const withinSubject = selectedOption === "All" || e.subjectName === selectedOption;
    return withinDateRange && withinSubject;
  });
  
  const summary = calculateSummary(filteredAttendanceData);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Attendance Dashboard</h1>
          <p className="text-center text-gray-500">Monitor and manage your class attendance</p>
        </header>
        
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <StudentInfo 
              studentSemester={studentSemester} 
              setStudentSemester={setStudentSemester} 
              studentSemesters={studentSemesters}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SubjectSelect 
                selectedOption={selectedOption} 
                setSelectedOption={setSelectedOption} 
                subjects={subjects} 
              />
              <DateSelect dateFilter={dateFilter} />
            </div>
            <AttendanceTable filteredAttendanceData={filteredAttendanceData} />
          </div>
          <div>
            <AttendanceSummary 
              summary={summary} 
              calculatePercent={calculatePercent} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;

// components/attendance/AttendanceSummary.js


// components/attendance/AttendanceTable.js


// components/attendance/DateSelect.js

// components/attendance/StudentInfo.js

// components/attendance/SubjectSelect.js
