// // // import React, { useState } from "react";

// // // const App = () => {
// // //   // Dummy data for students
// // //   const [studentsData, setStudentsData] = useState([
// // //     {
// // //       id: 1,
// // //       name: "John Doe",
// // //       totalFees: 1000,
// // //       dueFees: 200,
// // //       paymentMode: "Online",
// // //       transactionId: "TX123456",
// // //       lateFees: 50,
// // //       paymentStatus: "Paid",
// // //       accountTransferredFrom: "Account123",
// // //     },
// // //     {
// // //       id: 2,
// // //       name: "Jane Smith",
// // //       totalFees: 1500,
// // //       dueFees: 500,
// // //       paymentMode: "Cash",
// // //       transactionId: null,
// // //       lateFees: 0,
// // //       paymentStatus: "Pending",
// // //       accountTransferredFrom: null,
// // //     },
// // //     {
// // //       id: 3,
// // //       name: "Alice Johnson",
// // //       totalFees: 2000,
// // //       dueFees: 2000,
// // //       paymentMode: null,
// // //       transactionId: null,
// // //       lateFees: 0,
// // //       paymentStatus: "Not Paid",
// // //       accountTransferredFrom: null,
// // //     },
// // //   ]);

// // //   // State for form inputs
// // //   const [formData, setFormData] = useState({
// // //     id: "",
// // //     name: "",
// // //     totalFees: "",
// // //     dueFees: "",
// // //     paymentMode: "",
// // //     transactionId: "",
// // //     lateFees: "",
// // //     paymentStatus: "",
// // //     accountTransferredFrom: "",
// // //   });

// // //   // Handle form input changes
// // //   const handleInputChange = (e) => {
// // //     const { name, value } = e.target;
// // //     setFormData({
// // //       ...formData,
// // //       [name]: value,
// // //     });
// // //   };

// // //   // Handle form submission (add or update student)
// // //   const handleSubmit = (e) => {
// // //     e.preventDefault();

// // //     if (formData.id) {
// // //       // Update existing student
// // //       const updatedStudents = studentsData.map((student) =>
// // //         student.id === formData.id ? { ...student, ...formData } : student
// // //       );
// // //       setStudentsData(updatedStudents);
// // //     } else {
// // //       // Add new student
// // //       const newStudent = {
// // //         ...formData,
// // //         id: studentsData.length + 1, // Auto-generate ID
// // //       };
// // //       setStudentsData([...studentsData, newStudent]);
// // //     }

// // //     // Reset form
// // //     setFormData({
// // //       id: "",
// // //       name: "",
// // //       totalFees: "",
// // //       dueFees: "",
// // //       paymentMode: "",
// // //       transactionId: "",
// // //       lateFees: "",
// // //       paymentStatus: "",
// // //       accountTransferredFrom: "",
// // //     });
// // //   };

// // //   // Handle edit button click
// // //   const handleEdit = (student) => {
// // //     setFormData(student);
// // //   };

// // //   // Handle delete button click
// // //   const handleDelete = (id) => {
// // //     const updatedStudents = studentsData.filter((student) => student.id !== id);
// // //     setStudentsData(updatedStudents);
// // //   };

// // //   return (
// // //     <div style={styles.container}>
// // //       <h1 style={styles.header}>Admin Panel - Manage Student Fee Details</h1>

// // //       {/* Form for adding/editing student details */}
// // //       <form onSubmit={handleSubmit} style={styles.form}>
// // //         <h2>{formData.id ? "Edit Student" : "Add Student"}</h2>
// // //         <input
// // //           type="text"
// // //           name="name"
// // //           placeholder="Student Name"
// // //           value={formData.name}
// // //           onChange={handleInputChange}
// // //           style={styles.input}
// // //           required
// // //         />
// // //         <input
// // //           type="number"
// // //           name="totalFees"
// // //           placeholder="Total Fees"
// // //           value={formData.totalFees}
// // //           onChange={handleInputChange}
// // //           style={styles.input}
// // //           required
// // //         />
// // //         <input
// // //           type="number"
// // //           name="dueFees"
// // //           placeholder="Due Fees"
// // //           value={formData.dueFees}
// // //           onChange={handleInputChange}
// // //           style={styles.input}
// // //           required
// // //         />
// // //         <select
// // //           name="paymentMode"
// // //           value={formData.paymentMode}
// // //           onChange={handleInputChange}
// // //           style={styles.input}
// // //         >
// // //           <option value="">Select Payment Mode</option>
// // //           <option value="Online">Online</option>
// // //           <option value="Cash">Cash</option>
// // //         </select>
// // //         {formData.paymentMode === "Online" && (
// // //           <input
// // //             type="text"
// // //             name="transactionId"
// // //             placeholder="Transaction ID"
// // //             value={formData.transactionId}
// // //             onChange={handleInputChange}
// // //             style={styles.input}
// // //           />
// // //         )}
// // //         <input
// // //           type="number"
// // //           name="lateFees"
// // //           placeholder="Late Fees"
// // //           value={formData.lateFees}
// // //           onChange={handleInputChange}
// // //           style={styles.input}
// // //         />
// // //         <select
// // //           name="paymentStatus"
// // //           value={formData.paymentStatus}
// // //           onChange={handleInputChange}
// // //           style={styles.input}
// // //         >
// // //           <option value="">Select Payment Status</option>
// // //           <option value="Paid">Paid</option>
// // //           <option value="Pending">Pending</option>
// // //           <option value="Not Paid">Not Paid</option>
// // //         </select>
// // //         <input
// // //           type="text"
// // //           name="accountTransferredFrom"
// // //           placeholder="Account Transferred From"
// // //           value={formData.accountTransferredFrom}
// // //           onChange={handleInputChange}
// // //           style={styles.input}
// // //         />
// // //         <button type="submit" style={styles.button}>
// // //           {formData.id ? "Update" : "Add"}
// // //         </button>
// // //       </form>

// // //       {/* Table to display student details */}
// // //       <h2>Student Fee Details</h2>
// // //       <table style={styles.table}>
// // //         <thead>
// // //           <tr>
// // //             <th>ID</th>
// // //             <th>Name</th>
// // //             <th>Total Fees</th>
// // //             <th>Due Fees</th>
// // //             <th>Payment Mode</th>
// // //             <th>Transaction ID</th>
// // //             <th>Late Fees</th>
// // //             <th>Payment Status</th>
// // //             <th>Account Transferred From</th>
// // //             <th>Actions</th>
// // //           </tr>
// // //         </thead>
// // //         <tbody>
// // //           {studentsData.map((student) => (
// // //             <tr key={student.id}>
// // //               <td>{student.id}</td>
// // //               <td>{student.name}</td>
// // //               <td>${student.totalFees}</td>
// // //               <td>${student.dueFees}</td>
// // //               <td>{student.paymentMode || "-"}</td>
// // //               <td>{student.transactionId || "-"}</td>
// // //               <td>${student.lateFees}</td>
// // //               <td>{student.paymentStatus || "-"}</td>
// // //               <td>{student.accountTransferredFrom || "-"}</td>
// // //               <td>
// // //                 <button
// // //                   onClick={() => handleEdit(student)}
// // //                   style={styles.editButton}
// // //                 >
// // //                   Edit
// // //                 </button>
// // //                 <button
// // //                   onClick={() => handleDelete(student.id)}
// // //                   style={styles.deleteButton}
// // //                 >
// // //                   Delete
// // //                 </button>
// // //               </td>
// // //             </tr>
// // //           ))}
// // //         </tbody>
// // //       </table>
// // //     </div>
// // //   );
// // // };

// // // // Styles
// // // const styles = {
// // //   container: {
// // //     fontFamily: "Arial, sans-serif",
// // //     padding: "20px",
// // //     maxWidth: "1200px",
// // //     margin: "0 auto",
// // //   },
// // //   header: {
// // //     textAlign: "center",
// // //     color: "#333",
// // //   },
// // //   form: {
// // //     marginBottom: "20px",
// // //     padding: "20px",
// // //     border: "1px solid #ccc",
// // //     borderRadius: "4px",
// // //     backgroundColor: "#f9f9f9",
// // //   },
// // //   input: {
// // //     padding: "10px",
// // //     margin: "5px 0",
// // //     width: "100%",
// // //     border: "1px solid #ccc",
// // //     borderRadius: "4px",
// // //   },
// // //   button: {
// // //     padding: "10px 20px",
// // //     backgroundColor: "#007BFF",
// // //     color: "#fff",
// // //     border: "none",
// // //     borderRadius: "4px",
// // //     cursor: "pointer",
// // //     marginTop: "10px",
// // //   },
// // //   table: {
// // //     width: "100%",
// // //     borderCollapse: "collapse",
// // //     marginTop: "20px",
// // //   },
// // // table th,table td{
// // //     border:"1px solid #ccc",
// // //     padding: "10px",
// // //     textAlign: "left",
// // //   },
// // //   editButton: {
// // //     padding: "5px 10px",
// // //     backgroundColor: "#28a745",
// // //     color: "#fff",
// // //     border: "none",
// // //     borderRadius: "4px",
// // //     cursor: "pointer",
// // //     marginRight: "5px",
// // //   },
// // //   deleteButton: {
// // //     padding: "5px 10px",
// // //     backgroundColor: "#dc3545",
// // //     color: "#fff",
// // //     border: "none",
// // //     borderRadius: "4px",
// // //     cursor: "pointer",
// // //   },
// // // };

// // // export default App;
// // import React, { useState } from "react";

// // const App = () => {
// //     const [students, setStudents] = useState([
// //         { studentId: "S12345", name: "John Doe", totalFeeAmount: 50000, feePaid: 30000, dueFee: 20000, paymentMode: "UPI", feePaymentStatus: "Pending", transactionId: "TXN123456789", lateFeeCharges: 500, fromAccount: "john.doe@upi" }
// //     ]);

// //     return (
// //         <div className="max-w-6xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
// //             <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Student Fee Submission</h2>
// //             <StudentFeeTable students={students} />
// //         </div>
// //     );
// // };

// // const StudentFeeTable = ({ students }) => (
// //     <div className="overflow-x-auto">
// //         <table className="w-full border-collapse border border-gray-300 rounded-lg shadow-md">
// //             <thead>
// //                 <tr className="bg-blue-600 text-white">
// //                     <th className="border p-3">Student ID</th>
// //                     <th className="border p-3">Name</th>
// //                     <th className="border p-3">Total Fees</th>
// //                     <th className="border p-3">Fee Paid</th>
// //                     <th className="border p-3">Due Fees</th>
// //                     <th className="border p-3">Payment Mode</th>
// //                     <th className="border p-3">Payment Status</th>
// //                     <th className="border p-3">Transaction ID</th>
// //                     <th className="border p-3">Late Fee Charges</th>
// //                     <th className="border p-3">From Account</th>
// //                 </tr>
// //             </thead>
// //             <tbody>
// //                 {students.map((student, index) => (
// //                     <tr key={index} className="text-center odd:bg-gray-100 even:bg-gray-200 hover:bg-gray-300">
// //                         <td className="border p-3">{student.studentId}</td>
// //                         <td className="border p-3 font-medium">{student.name}</td>
// //                         <td className="border p-3">₹{student.totalFeeAmount}</td>
// //                         <td className="border p-3 text-green-600">₹{student.feePaid}</td>
// //                         <td className="border p-3 text-red-600">₹{student.dueFee}</td>
// //                         <td className="border p-3">{student.paymentMode}</td>
// //                         <td className={border p-3 font-semibold ${student.feePaymentStatus === "Pending" ? "text-yellow-600" : student.feePaymentStatus === "Paid" ? "text-green-600" : "text-red-600"}}>{student.feePaymentStatus}</td>
// //                         <td className="border p-3">{student.paymentMode !== "Cash" ? student.transactionId : "-"}</td>
// //                         <td className="border p-3">{student.lateFeeCharges > 0 ? ₹${student.lateFeeCharges} : "-"}</td>
// //                         <td className="border p-3">{student.paymentMode !== "Cash" ? student.fromAccount : "-"}</td>
// //                     </tr>
// //                 ))}
// //             </tbody>
// //         </table>
// //     </div>
// // );

// // export default App;


// import React, { useState } from "react";

// const App = () => {
//   const [students, setStudents] = useState([
//     { studentId: "S12345", name: "John Doe", totalFeeAmount: 50000, feePaid: 30000, dueFee: 20000, paymentMode: "UPI", feePaymentStatus: "Pending", transactionId: "TXN123456789", lateFeeCharges: 500, fromAccount: "john.doe@upi", transactionDate: "2025-01-20" },
//     { studentId: "S12346", name: "Rahul Sharma", totalFeeAmount: 45000, feePaid: 25000, dueFee: 20000, paymentMode: "UPI", feePaymentStatus: "Paid", transactionId: "TXN123456790", lateFeeCharges: 0, fromAccount: "rahul.sharma@gmail.com", transactionDate: "2025-01-18" },
//     { studentId: "S12347", name: "Priya Singh", totalFeeAmount: 60000, feePaid: 40000, dueFee: 20000, paymentMode: "Cash", feePaymentStatus: "Pending", transactionId: "-", lateFeeCharges: 500, fromAccount: "-", transactionDate: "2025-01-15" },
//     { studentId: "S12348", name: "Anil Kumar", totalFeeAmount: 55000, feePaid: 35000, dueFee: 20000, paymentMode: "UPI", feePaymentStatus: "Pending", transactionId: "TXN123456791", lateFeeCharges: 0, fromAccount: "anil.kumar@gmail.com", transactionDate: "2025-01-22" },
//     { studentId: "S12349", name: "Neha Gupta", totalFeeAmount: 48000, feePaid: 48000, dueFee: 0, paymentMode: "Debit Card", feePaymentStatus: "Paid", transactionId: "TXN123456792", lateFeeCharges: 0, fromAccount: "neha.gupta@gmail.com", transactionDate: "2025-01-17" },
//     { studentId: "S12350", name: "Amit Verma", totalFeeAmount: 53000, feePaid: 30000, dueFee: 23000, paymentMode: "Cash", feePaymentStatus: "Pending", transactionId: "-", lateFeeCharges: 1000, fromAccount: "-", transactionDate: "2025-01-21" },
//     { studentId: "S12351", name: "Rina Patel", totalFeeAmount: 60000, feePaid: 60000, dueFee: 0, paymentMode: "UPI", feePaymentStatus: "Paid", transactionId: "TXN123456793", lateFeeCharges: 0, fromAccount: "rina.patel@gmail.com", transactionDate: "2025-01-16" },
//     { studentId: "S12352", name: "Vijay Reddy", totalFeeAmount: 46000, feePaid: 40000, dueFee: 6000, paymentMode: "Credit Card", feePaymentStatus: "Pending", transactionId: "TXN123456794", lateFeeCharges: 0, fromAccount: "vijay.reddy@gmail.com", transactionDate: "2025-01-14" },
//     { studentId: "S12353", name: "Simran Kaur", totalFeeAmount: 55000, feePaid: 35000, dueFee: 20000, paymentMode: "UPI", feePaymentStatus: "Paid", transactionId: "TXN123456795", lateFeeCharges: 0, fromAccount: "simran.kaur@gmail.com", transactionDate: "2025-01-19" },
//     { studentId: "S12354", name: "Rajesh Mehta", totalFeeAmount: 47000, feePaid: 47000, dueFee: 0, paymentMode: "UPI", feePaymentStatus: "Paid", transactionId: "TXN123456796", lateFeeCharges: 0, fromAccount: "rajesh.mehta@gmail.com", transactionDate: "2025-01-23" }
//   ]);
  
//   const [searchId, setSearchId] = useState('');
//   const [filterByDue, setFilterByDue] = useState('all'); // Filter state ('all', 'due', 'noDue')

//   const handleSearchChange = (e) => {
//     setSearchId(e.target.value);
//   };

//   const handleFilterChange = (e) => {
//     setFilterByDue(e.target.value);
//   };

//   const filteredStudents = students.filter(student => {
//     const matchesId = student.studentId.toLowerCase().includes(searchId.toLowerCase());
//     const matchesFilter = filterByDue === 'all' || 
//                           (filterByDue === 'due' && student.dueFee > 0) || 
//                           (filterByDue === 'noDue' && student.dueFee === 0);
//     return matchesId && matchesFilter;
//   });

//   return (
//     <div className="max-w-7xl mx-auto mt-10 p-8 bg-gray-50 rounded-lg shadow-lg">
//       <h2 className="text-3xl font-semibold mb-6 text-gray-800 text-center">Student Fee Submission</h2>
      
//       <div className="mb-6">
//         <input 
//           type="text" 
//           placeholder="Search by Student ID"
//           value={searchId}
//           onChange={handleSearchChange}
//           className="px-4 py-2 border border-gray-300 rounded-lg w-full max-w-md mx-auto"
//         />
//       </div>

//       <div className="mb-6 text-center">
//         <label className="mr-4">Filter by Fee Status: </label>
//         <select 
//           value={filterByDue} 
//           onChange={handleFilterChange} 
//           className="px-4 py-2 border border-gray-300 rounded-lg"
//         >
//           <option value="all">All</option>
//           <option value="due">With Dues</option>
//           <option value="noDue">No Dues</option>
//         </select>
//       </div>
      
//       <StudentFeeTable students={filteredStudents} />
//     </div>
//   );
// };

// const StudentFeeTable = ({ students }) => (
//   <div className="overflow-x-auto">
//     <table className="min-w-full table-auto bg-white rounded-lg shadow-sm">
//       <thead>
//         <tr className="bg-gray-700 text-white">
//           <th className="py-3 px-4 text-left text-sm font-medium">Student ID</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Name</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Total Fees</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Fee Paid</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Due Fees</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Payment Mode</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Payment Status</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Transaction ID</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Transaction Date</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">Late Fee Charges</th>
//           <th className="py-3 px-4 text-left text-sm font-medium">From Account</th>
//         </tr>
//       </thead>
//       <tbody>
//         {students.map((student, index) => (
//           <tr
//             key={index}
//             className={text-gray-700 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-gray-100'} hover:bg-gray-200 transition duration-200}
//           >
//             <td className="py-4 px-6 border-b text-sm">{student.studentId}</td>
//             <td className="py-4 px-6 border-b text-sm font-medium">{student.name}</td>
//             <td className="py-4 px-6 border-b text-sm">₹{student.totalFeeAmount}</td>
//             <td className="py-4 px-6 border-b text-sm text-green-600">₹{student.feePaid}</td>
//             <td className="py-4 px-6 border-b text-sm text-red-600">₹{student.dueFee}</td>
//             <td className="py-4 px-6 border-b text-sm">{student.paymentMode}</td>
//             <td className={py-4 px-6 border-b text-sm font-semibold ${student.feePaymentStatus === "Pending" ? "text-yellow-600" : student.feePaymentStatus === "Paid" ? "text-green-600" : "text-red-600"}}>{student.feePaymentStatus}</td>
//             <td className="py-4 px-6 border-b text-sm">{student.paymentMode !== "Cash" ? student.transactionId : "-"}</td>
//             <td className="py-4 px-6 border-b text-sm">{student.transactionDate}</td>
//             <td className="py-4 px-6 border-b text-sm">{student.lateFeeCharges > 0 ? ₹${student.lateFeeCharges} : "-"}</td>
//             <td className="py-4 px-6 border-b text-sm">{student.paymentMode !== "Cash" ? student.fromAccount : "-"}</td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   </div>
// );

// export default App;

import React, { useState } from "react";

const Finaceentry = () => {
  const [studentDetails, setStudentDetails] = useState({
    studentId: "",
    name: "",
    totalFeeAmount: "",
    feePaid: "",
    dueFee: "",
    paymentMode: "UPI",
    feePaymentStatus: "Pending",
    transactionId: "",
    transactionDate: "",
    lateFeeCharges: "",
    fromAccount: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState({
    fromAccount: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentDetails({
      ...studentDetails,
      [name]: value,
    });
  };

  const validateForm = () => {
    const errors = {};
    // Validate 'fromAccount' as email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(studentDetails.fromAccount)) {
      errors.fromAccount = "Please enter a valid email address.";
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      console.log(studentDetails);
      setIsSubmitted(true);
      // Hide the success message after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto mt-10 p-8 bg-gray-50 rounded-lg shadow-lg relative">
      <h2 className="text-3xl font-semibold mb-6 text-gray-800 text-center">
        Admin Fee Submission Form
      </h2>
      {isSubmitted && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-green-500 text-white p-4 rounded-lg shadow-lg">
          <p>Data submitted successfully!</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Student ID</label>
            <input
              type="text"
              name="studentId"
              value={studentDetails.studentId}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              value={studentDetails.name}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Fees</label>
            <input
              type="number"
              name="totalFeeAmount"
              value={studentDetails.totalFeeAmount}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fee Paid</label>
            <input
              type="number"
              name="feePaid"
              value={studentDetails.feePaid}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Due Fees</label>
            <input
              type="number"
              name="dueFee"
              value={studentDetails.dueFee}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
            <select
              name="paymentMode"
              value={studentDetails.paymentMode}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Fee Payment Status</label>
            <select
              name="feePaymentStatus"
              value={studentDetails.feePaymentStatus}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
            <input
              type="text"
              name="transactionId"
              value={studentDetails.transactionId}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Transaction Date</label>
            <input
              type="date"
              name="transactionDate"
              value={studentDetails.transactionDate}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Late Fee Charges</label>
            <input
              type="number"
              name="lateFeeCharges"
              value={studentDetails.lateFeeCharges}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">From Account</label>
            <input
              type="email"
              name="fromAccount"
              value={studentDetails.fromAccount}
              onChange={handleInputChange}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
            {formErrors.fromAccount && (
              <p className="text-red-500 text-sm">{formErrors.fromAccount}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-2 mt-4 bg-blue-600 text-white rounded-lg w-full"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default Finaceentry;