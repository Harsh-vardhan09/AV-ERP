// // components/attendance/SubjectSelect.js
// import React from 'react';

// const SubjectSelect = ({ selectedOption, setSelectedOption, subjects }) => {
//   return (
//     <div className="bg-white shadow-md rounded-lg p-4">
//       <h2 className="text-lg font-semibold mb-4">Select Subject</h2>
//       <div className="flex justify-center">
//         <select
//           className="border-2 border-gray-300 rounded p-2 shadow w-full max-w-xs"
//           value={selectedOption}
//           onChange={(e) => setSelectedOption(e.target.value)}
//         >
//           <option value="All">All Subjects</option>
//           {subjects.map((subject) => (
//             <option key={subject} value={subject}>
//               {subject}
//             </option>
//           ))}
//         </select>
//       </div>
//     </div>
//   );
// };

// export default SubjectSelect;


import React from 'react';

const SubjectSelect = ({ selectedOption, setSelectedOption, subjects }) => {
  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden ">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
        <h2 className="text-lg font-semibold text-white">Subject Filter</h2>
      </div>
      <div className="p-5 flex items-center justify-center h-[calc(100%-60px)]">
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Subject</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
          >
            <option value="All">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default SubjectSelect;