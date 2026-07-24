// // components/attendance/DateSelect.js
// import React, { useState } from "react";

// function DateSelect({ dateFilter }) {
//   const [fromdate, setFromDate] = useState("");
//   const [todate, setToDate] = useState("");

  
//   const date = new Date();
//   const maxdate = `${date.getFullYear()}-${date.getMonth()+1}-${String(date.getDate()).padStart(2,"0")}`;


//   const handleFromChange = (e) => setFromDate(e.target.value);
//   const handleToChange = (e) => setToDate(e.target.value);

//   const applyDateFilter = () => {
//     dateFilter(fromdate, todate);
//   };

//   return (
//     <div className="bg-white shadow-md rounded-lg p-4">
//       <h2 className="text-lg font-semibold mb-4">Select Date Range</h2>
//       <div className="flex gap-4">
//         <input
//           type="date"
//           value={fromdate}
//           onChange={handleFromChange}
//           className="border-2 border-gray-300 rounded p-2 w-full"

//           max={maxdate}
//         />
//         <input
//           type="date"
//           value={todate}
//           onChange={handleToChange}
//           className="border-2 border-gray-300 rounded p-2 w-full"
//           max={maxdate}
//         />
//         <button
//           onClick={applyDateFilter}
//           className="bg-blue-500 text-white rounded p-2"
//         >
//           Apply
//         </button>
//       </div>
//     </div>
//   );
// }

// export default DateSelect;
import React, { useState } from "react";

function DateSelect({ dateFilter }) {
  const [fromdate, setFromDate] = useState("");
  const [todate, setToDate] = useState("");
  
  const date = new Date();
  const maxdate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;

  const handleFromChange = (e) => setFromDate(e.target.value);
  const handleToChange = (e) => setToDate(e.target.value);

  const applyDateFilter = () => {
    dateFilter(fromdate, todate);
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
    dateFilter(null, null);
  };

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
        <h2 className="text-lg font-semibold text-white">Date Range</h2>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">From Date</label>
          <input
            type="date"
            value={fromdate}
            onChange={handleFromChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            max={maxdate}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">To Date</label>
          <input
            type="date"
            value={todate}
            onChange={handleToChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            max={maxdate}
            min={fromdate}
          />
        </div>
        <div className="flex space-x-2 pt-2">
          <button
            onClick={applyDateFilter}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Apply Filter
          </button>
          <button
            onClick={clearDates}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default DateSelect;
