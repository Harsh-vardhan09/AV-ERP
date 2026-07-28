// // components/attendance/AttendanceTable.js
// import React from 'react';

// const AttendanceTable = ({ filteredAttendanceData }) => {
//   return (


//     <div className="overflow-x-auto bg-white shadow-md rounded-lg max-h-[27rem]">
//       <table className="min-w-full table-auto text-left">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="p-4">Sr.No</th>
//             <th className="p-4">Subject Name</th>
//             <th className="p-4">Date</th>
//             <th className="p-4">Lecture Timing</th>
//             <th className="p-4">Status</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredAttendanceData.length > 0 ? (
//             filteredAttendanceData.map((e, index) => (
//               <tr key={index} className="border-t">
//                 <td className="p-4">{index + 1}</td>

//                 <td className="p-4">{e.subjectName}</td>
//                 <td className="p-4">{e.Date}</td>
//                 <td className="p-4">{e.LectureTiming}</td>
//                 <td className="p-4">{e.Status}</td>
//               </tr>
//             ))
//           ) : (
//             <tr>
//               <td colSpan="5" className="text-center p-4">No Data Available</td>
//             </tr>
//           )}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// export default AttendanceTable;



import React, { useState } from 'react';

const AttendanceTable = ({ filteredAttendanceData }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  
  // Sort function
  const sortedData = React.useMemo(() => {
    let sortableData = [...filteredAttendanceData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [filteredAttendanceData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return "bg-gray-100 text-gray-800";
    
    switch (status.toLowerCase()) {
      case 'present':
        return "bg-green-100 text-green-800";
      case 'absent':
        return "bg-red-100 text-red-800";
      case 'leave':
        return "bg-yellow-100 text-yellow-800";
      case 'not applicable':
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Attendance Records</h2>
        <div className="text-sm text-gray-500">
          {filteredAttendanceData.length} {filteredAttendanceData.length === 1 ? 'record' : 'records'} found
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[27rem]">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sr.No
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('subjectName')}
              >
                Subject Name
                {sortConfig.key === 'subjectName' && (
                  <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('Date')}
              >
                Date
                {sortConfig.key === 'Date' && (
                  <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lecture Timing
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort('Status')}
              >
                Status
                {sortConfig.key === 'Status' && (
                  <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.length > 0 ? (
              sortedData.map((e, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    {e.subjectName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {e.Date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {e.LectureTiming}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(e.Status)}`}>
                      {e.Status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p className="text-lg font-medium">No Records Found</p>
                    <p className="text-sm mt-1">Try adjusting your filters to see more data</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;