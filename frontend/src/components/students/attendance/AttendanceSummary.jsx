// // components/attendance/AttendanceSummary.js
// import React from 'react';
// import { Doughnut } from 'react-chartjs-2';
// import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

// // Register necessary components
// ChartJS.register(ArcElement, Tooltip, Legend, Title);

// const AttendanceSummary = ({ summary, calculatePercent }) => {
//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//   };

//   const gradesData = {
//     labels: ["Present","Absent","Leave","Not Applicable"],
//     datasets: [
//       {
//         label: "Attendance",
//         data: [summary.present,summary.absent,summary.leaves,summary.notApplicable],
//         backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
//         hoverBackgroundColor: ["#FF4384", "#36B2EB", "#FFDF56", "#5BC0C0", "#AB66FF"],
//       },
//     ],
//   };

//   return (
//     <div className="bg-white shadow-md rounded-lg p-4">
//       <h2 className="text-lg font-semibold mb-4">Attendance Summary</h2>
//       <div className="grid grid-cols-2 gap-4">
//         <div>
//           <h3 className="font-semibold">Total Attendance:</h3>
//           <p>{summary.total}</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Present:</h3>
//           <p>{summary.present} ({calculatePercent(summary.present, summary.total)}%)</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Absent:</h3>
//           <p>{summary.absent} ({calculatePercent(summary.absent, summary.total)}%)</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Leaves:</h3>
//           <p>{summary.leaves} ({calculatePercent(summary.leaves, summary.total)}%)</p>
//         </div>
//         <div>
//           <h3 className="font-semibold">Not Applicable:</h3>
//           <p>{summary.notApplicable} ({calculatePercent(summary.notApplicable, summary.total)}%)</p>
//         </div>
//       </div>
//       <div className=" p-4 md:p-6 rounded-xl ">
//           <div className="h-52 md:h-64 lg:h-72">
//             <Doughnut data={gradesData} options={chartOptions} />
//           </div>
//         </div>
//     </div>
//   );
// };

// export default AttendanceSummary;
import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

// Register necessary components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

const AttendanceSummary = ({ summary, calculatePercent }) => {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Attendance Distribution',
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    },
    cutout: '65%'
  };

  const gradesData = {
    labels: ["Present", "Absent", "Leave", "Not Applicable"],
    datasets: [
      {
        label: "Attendance",
        data: [summary.present, summary.absent, summary.leaves, summary.notApplicable],
        backgroundColor: ["#4ade80", "#f87171", "#facc15", "#94a3b8"],
        hoverBackgroundColor: ["#22c55e", "#ef4444", "#eab308", "#64748b"],
        borderWidth: 0,
      },
    ],
  };

  // Calculate overall attendance percentage
  const attendancePercentage = calculatePercent(summary.present, summary.total);
  const attendanceStatus = 
    attendancePercentage >= 85 ? { color: 'text-green-500', message: 'Excellent' } :
    attendancePercentage >= 75 ? { color: 'text-blue-500', message: 'Good' } :
    attendancePercentage >= 65 ? { color: 'text-yellow-500', message: 'Average' } :
    { color: 'text-red-500', message: 'Need Improvement' };

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden sticky top-6">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
        <h2 className="text-xl font-bold text-white">Attendance Summary</h2>
      </div>
      
      <div className="p-5">
        <div className="flex justify-center items-center mb-4">
          <div className="text-center">
            <h3 className="text-4xl font-bold text-gray-800">{attendancePercentage}%</h3>
            <p className={`font-medium ${attendanceStatus.color}`}>
              {attendanceStatus.message}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-lg font-semibold text-gray-800">{summary.total}</div>
            <p className="text-sm text-gray-500">Total Classes</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <div className="text-lg font-semibold text-green-600">{summary.present}</div>
            <p className="text-sm text-green-500">Present</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg text-center">
            <div className="text-lg font-semibold text-red-600">{summary.absent}</div>
            <p className="text-sm text-red-500">Absent</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <div className="text-lg font-semibold text-yellow-600">{summary.leaves}</div>
            <p className="text-sm text-yellow-500">Leave</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 pt-0">
        <div className="h-64">
          <Doughnut data={gradesData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummary;