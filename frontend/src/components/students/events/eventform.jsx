export function Eventform()
{
    return(<>

{
    
}
<div className="flex sm:justify-center mt-8">
    <form action="#" className="flex flex-col sm:border sm:rounded-lg sm:shadow-lg sm:p-6 sm:w-[50%] bg-white">
        <h2 className="text-2xl font-semibold text-center mb-4">Student Event Registration</h2>
        <div className="flex flex-col">
            <label htmlFor="name" className="m-2">Student Name</label>
            <input type="text" placeholder=" Your name" id="name" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <label htmlFor="sem" className="m-2">Current Semester</label>
            <input type="text" placeholder=" Your current sem" id="sem" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <label htmlFor="rollno" className="m-2">Enrollment No.</label>
            <input type="text" placeholder=" Your enrollment number" id="rollno" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <label htmlFor="collagename" className="m-2">College Name</label>
            <input type="text" placeholder=" Your college name" id="collagename" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <label htmlFor="mobileNo" className="m-2">Phone No.</label>
            <input type="text" placeholder="Your phone no" id="mobileNo" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <label htmlFor="Emailid" className="m-2">Email ID</label>
            <input type="email" placeholder="Your Email" id="Emailid" className="shadow-lg p-3 m-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />

            <button type="submit" className="bg-blue-500 text-white w-full h-12 rounded-md mt-4 hover:bg-blue-600 transition duration-200">Submit</button>
        </div>
    </form>
</div>



    </>)
}






// import React, { useState } from 'react';
// import { Calendar, Mail, Phone, User, BookOpen, School } from 'lucide-react';

// export function EventForm() {
//   const [formData, setState] = useState({
//     name: '',
//     semester: '',
//     enrollmentNo: '',
//     collegeName: '',
//     phoneNo: '',
//     email: ''
//   });
  
//   const handleChange = (e) => {
//     setState({
//       ...formData,
//       [e.target.id]: e.target.value
//     });
//   };
  
//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Form submission logic here
//     console.log('Form submitted:', formData);
//     // Reset form or show confirmation
//   };
  
//   return (
//     <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
//       <div className="w-full max-w-2xl">
//         <div className="bg-white rounded-xl shadow-xl overflow-hidden">
//           {/* Header Section */}
//           <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6">
//             <h2 className="text-3xl font-bold text-white text-center">Student Event Registration</h2>
//             <p className="text-blue-100 text-center mt-2">Complete the form below to register for upcoming events</p>
//           </div>
          
//           {/* Form Section */}
//           <form onSubmit={handleSubmit} className="p-6">
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Name Field */}
//               <div className="col-span-2 md:col-span-1">
//                 <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
//                   Student Name
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <User className="h-5 w-5 text-gray-400" />
//                   </div>
//                   <input
//                     type="text"
//                     id="name"
//                     value={formData.name}
//                     onChange={handleChange}
//                     placeholder="Your full name"
//                     className="pl-10 block w-full rounded-md border border-gray-300 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
//               </div>
              
//               {/* Semester Field */}
//               <div className="col-span-2 md:col-span-1">
//                 <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">
//                   Current Semester
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <Calendar className="h-5 w-5 text-gray-400" />
//                   </div>
//                   <select
//                     id="semester"
//                     value={formData.semester}
//                     onChange={handleChange}
//                     className="pl-10 block w-full rounded-md border border-gray-300 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
//                     required
//                   >
//                     <option value="">Select semester</option>
//                     <option value="1">Semester 1</option>
//                     <option value="2">Semester 2</option>
//                     <option value="3">Semester 3</option>
//                     <option value="4">Semester 4</option>
//                     <option value="5">Semester 5</option>
//                     <option value="6">Semester 6</option>
//                     <option value="7">Semester 7</option>
//                     <option value="8">Semester 8</option>
//                   </select>
//                 </div>
//               </div>
              
//               {/* Enrollment Number Field */}
//               <div className="col-span-2 md:col-span-1">
//                 <label htmlFor="enrollmentNo" className="block text-sm font-medium text-gray-700 mb-1">
//                   Enrollment Number
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <BookOpen className="h-5 w-5 text-gray-400" />
//                   </div>
//                   <input
//                     type="text"
//                     id="enrollmentNo"
//                     value={formData.enrollmentNo}
//                     onChange={handleChange}
//                     placeholder="Your enrollment number"
//                     className="pl-10 block w-full rounded-md border border-gray-300 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
//               </div>
              
//               {/* College Name Field */}
//               <div className="col-span-2 md:col-span-1">
//                 <label htmlFor="collegeName" className="block text-sm font-medium text-gray-700 mb-1">
//                   College Name
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <School className="h-5 w-5 text-gray-400" />
//                   </div>
//                   <input
//                     type="text"
//                     id="collegeName"
//                     value={formData.collegeName}
//                     onChange={handleChange}
//                     placeholder="Your college name"
//                     className="pl-10 block w-full rounded-md border border-gray-300 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
//               </div>
              
//               {/* Phone Number Field */}
//               <div className="col-span-2 md:col-span-1">
//                 <label htmlFor="phoneNo" className="block text-sm font-medium text-gray-700 mb-1">
//                   Phone Number
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <Phone className="h-5 w-5 text-gray-400" />
//                   </div>
//                   <input
//                     type="tel"
//                     id="phoneNo"
//                     value={formData.phoneNo}
//                     onChange={handleChange}
//                     placeholder="Your phone number"
//                     className="pl-10 block w-full rounded-md border border-gray-300 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
//               </div>
              
//               {/* Email Field */}
//               <div className="col-span-2 md:col-span-1">
//                 <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
//                   Email Address
//                 </label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <Mail className="h-5 w-5 text-gray-400" />
//                   </div>
//                   <input
//                     type="email"
//                     id="email"
//                     value={formData.email}
//                     onChange={handleChange}
//                     placeholder="Your email address"
//                     className="pl-10 block w-full rounded-md border border-gray-300 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
//                     required
//                   />
//                 </div>
//               </div>
//             </div>
            
//             {/* Submit Button */}
//             <div className="mt-8">
//               <button
//                 type="submit"
//                 className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3 px-4 rounded-md font-medium shadow-md hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
//               >
//                 Register Now
//               </button>
//             </div>
            
//             {/* Optional Footer Text */}
//             <p className="text-sm text-gray-500 text-center mt-4">
//               By registering, you agree to the event terms and conditions
//             </p>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }