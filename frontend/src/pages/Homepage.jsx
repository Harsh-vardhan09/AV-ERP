// import React from 'react';
// import Sidebar from './Sidebar'; // Ensure Sidebar component is imported
// import { Navigate, NavLink, useNavigate } from 'react-router-dom';
// import { useDispatch, useSelector } from 'react-redux';
// import { toggleSidebar } from '../redux/reducers/sidebarslice';
// import { useState, useEffect, useRef } from 'react';
// import { useLogoutMutation } from '../redux/api/userApi';
// import { userlogout } from '../redux/reducers/userreducer';
// import { IoMdNotifications } from "react-icons/io";

// const HomePage = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const [logout] = useLogoutMutation();
//   const role= useSelector(state=>state?.user?.user?.user.role)
                                      
//   const handleSidebarToggle = () => {
//     dispatch(toggleSidebar());
//   };

//   const [isOpen, setIsOpen] = useState(false);
//   const dropdownRef = useRef(null);

//   const handleToggleDropdown = () => {
//     setIsOpen((prev) => !prev);
//   };

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setIsOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [dropdownRef]);

//   const logouthandler = async () => {
//     await logout();
//     localStorage.removeItem('token');
//     navigate('/login');
//     dispatch(userlogout());
//   };

//   // Define items with images and paths
   
//   const quickAccessItems = role==="teacher" ? [
//     { name: 'Dashboard', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQG1tLvcgTJUMCBYzCZwkAYy9LJPJgayn8ZJA&s', },
//     { name: 'Take Attendance', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThs2EY9Uwqruia3zXjbkFldfDcvix0Qg3ZVg&s', path: '/takeattendance' },
//     { name: 'Online quiz', image: 'https://5.imimg.com/data5/SELLER/Default/2023/5/309686767/ZE/YZ/ZV/8675179/online-exam-software-service-provider-500x500.jpg', path:'/quiz' },
//     { name: 'Events', image: 'https://www.shutterstock.com/image-vector/events-colorful-typography-banner-260nw-1356206768.jpg', path: '/Events' },
//     { name: 'Create Events', image: 'https://www.shutterstock.com/image-vector/events-colorful-typography-banner-260nw-1356206768.jpg', path: '/addevent' },
//     { name: 'Chat', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzwN555oeo09zLOsxNzVqes_q_267Jrt4cxA&s',path: '/chatapp' },
//     { name: 'Give Assignment', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStLuDTJdxJECTeb3fjynpUB6M2jVZ2FJ18-Q&s', path: '/teacherassignment' },
//     { name: 'Your Assignment', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStLuDTJdxJECTeb3fjynpUB6M2jVZ2FJ18-Q&s', path: '/teacherassignmentupload' },
//     { name: 'Coding Practice', image: 'https://media.licdn.com/dms/image/D4D12AQGkhVu2gh8X6g/article-cover_image-shrink_600_2000/0/1716287814954?e=2147483647&v=beta&t=ED8s7ACPwHL_6r9e_9SsHwqzrqpG_1Gkng8sPu7umPo',  },
//     { name: 'News/Notifications', image: 'https://miro.medium.com/v2/resize:fit:880/0*SQy-aKEXu_WSoRd-.png',path:'/notifications' },
//     { name: 'Leave application', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSLTMC2UhhIU4mOJpYlnX5U1nOp1PRWXqfh0w&s', path: '/application' },
//     { name: 'show application', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSLTMC2UhhIU4mOJpYlnX5U1nOp1PRWXqfh0w&s', path: '/leavesection' },
//     { name: 'Time table', image: 'https://static3.bigstockphoto.com/5/7/2/large2/275114155.jpg', path: '/timetable'},
//     { name: 'Create Time table', image: 'https://static3.bigstockphoto.com/5/7/2/large2/275114155.jpg', path: '/createtimetable'},
//     { name: 'Knowledge center', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9DcEej_6TuKqsR_ZcVp7ZfSC97tivN6vvBw&s', path: '/knowlegecentercreate'},
    
//     { name: 'compain box', image: 'https://www.shutterstock.com/image-vector/complaint-form-online-concept-vector-260nw-2310670309.jpg', path: '/complaintbox'},
//     { name: 'compain box', image: 'https://www.shutterstock.com/image-vector/complaint-form-online-concept-vector-260nw-2310670309.jpg', path: '/noticeapprove'},
//     { name: 'Finance management ', image: ' https://img.freepik.com/free-photo/finance-business-accounting-analysis-management-concept_53876-15817.jpg', path: '/finance'},

//     { name: 'finance entry ', image: 'https://www.shutterstock.com/image-vector/complaint-form-online-concept-vector-260nw-2310670309.jpg', path: '/entry'},


//   ] : [  { name: 'Dashboard', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQG1tLvcgTJUMCBYzCZwkAYy9LJPJgayn8ZJA&s', path: '/Dashboard' },
//     // { name: 'authentication kr le bhai', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQG1tLvcgTJUMCBYzCZwkAYy9LJPJgayn8ZJA&s', path: '/passkey' },
//     { name: 'Attendance', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThs2EY9Uwqruia3zXjbkFldfDcvix0Qg3ZVg&s', path: '/attendance' },
//     { name: 'Online Exams', image: 'https://5.imimg.com/data5/SELLER/Default/2023/5/309686767/ZE/YZ/ZV/8675179/online-exam-software-service-provider-500x500.jpg', path:'/quiz'},
//     { name: 'Events', image: 'https://www.shutterstock.com/image-vector/events-colorful-typography-banner-260nw-1356206768.jpg', path: '/Events' },
//     { name: 'Create Events', image: 'https://www.shutterstock.com/image-vector/events-colorful-typography-banner-260nw-1356206768.jpg', path: '/addevent' },
//     { name: 'Chat', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRzwN555oeo09zLOsxNzVqes_q_267Jrt4cxA&s', path: '/chatapp' },
//     { name: 'Assignment Submissions', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStLuDTJdxJECTeb3fjynpUB6M2jVZ2FJ18-Q&s', path: '/assignment' },
//     { name: 'Coding Practice', image: 'https://media.licdn.com/dms/image/D4D12AQGkhVu2gh8X6g/article-cover_image-shrink_600_2000/0/1716287814954?e=2147483647&v=beta&t=ED8s7ACPwHL_6r9e_9SsHwqzrqpG_1Gkng8sPu7umPo',  },
//     { name: 'News/Notifications', image: 'https://miro.medium.com/v2/resize:fit:880/0*SQy-aKEXu_WSoRd-.png', path:'/notifications' },
//     { name: 'Leave application', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSLTMC2UhhIU4mOJpYlnX5U1nOp1PRWXqfh0w&s', path: '/application' },
//     { name: 'Time table', image: 'https://static3.bigstockphoto.com/5/7/2/large2/275114155.jpg', path: '/timetable' },
//     { name: 'Knowledge center', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9DcEej_6TuKqsR_ZcVp7ZfSC97tivN6vvBw&s', path: '/knowlegecenter'},
//     { name: 'Roadmap', image: 'https://media.slidesgo.com/storage/18224862/responsive-images/0-roadmap-infographics___media_library_original_655_368.jpg', path: '/roadmap'},
//     { name: 'complain form ', image: 'https://www.shutterstock.com/image-vector/complaint-form-online-concept-vector-260nw-2310670309.jpg', path: '/complaintform'},
//     { name: 'complain request ', image: 'https://www.shutterstock.com/image-vector/complaint-form-online-concept-vector-260nw-2310670309.jpg', path: 'https://chap-frontend3.vercel.app/'},
    
   
//   ];

//   return (
//     <div className="flex bg-gray-100">
//       <div className="w-full overflow-hidden bg-gray-100 min-h-screen">
//         <header className="fixed top-0 w-screen bg-white shadow-md px-10 flex justify-between items-center z-40">
//           <div className="flex items-center">
//             <img src="unified_campus.png" alt="Unified Campus Logo" className="w-16 h-16 mr-2" />
//             <h2 className="text-2xl font-semibold text-blue-700">Unified Campus</h2>
//           </div>

//           <div className="flex-1 mx-4 hidden md:flex">
//             <input
//               type="text"
//               placeholder="Search for assignments, courses..."
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <nav className="flex items-center space-x-6">
//             <NavLink to="/" className="text-gray-600 hover:text-blue-500">
//               <i className="fas fa-home"></i>
//               <span className="hidden sm:inline-block ml-2">Home</span>
//             </NavLink>
//             <NavLink to="/notifications" className="text-gray-600 hover:text-blue-500">
//               <span className=" sm:inline-block  text-3xl ml-2"><IoMdNotifications />
//               </span>
//               <i className="fas fa-bell relative">
//                 <span className="absolute -top-4 right-1 bg-red-500 text-white text-xs rounded-full px-1">3</span>
//               </i>
//             </NavLink>
//             <NavLink to="/events" className="text-gray-600 hover:text-blue-500">
//               <i className="fas fa-calendar-alt"></i>
//               <span className="hidden sm:inline-block ml-2">Events</span>
//             </NavLink>

//             <div className="relative" ref={dropdownRef}>
//               {/* Profile Picture */}
//               <img
//                 src="public/unified_campus.png"
//                 alt="Profile"
//                 className="w-10 h-10 rounded-full cursor-pointer"
//                 onClick={handleToggleDropdown}
//               />

//               {/* Dropdown Menu */}
//               {isOpen && (
//                 <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg p-2">
//                   <NavLink to="/profile" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
//                     Profile
//                   </NavLink>
//                   <NavLink to="/settings" className="block px-4 py-2 text-gray-600 hover:bg-gray-100">
//                     Settings
//                   </NavLink>
//                   <div onClick={logouthandler} className="block px-4 py-2 text-red-600 hover:bg-red-100 cursor-pointer">
//                     Logout
//                   </div>
//                 </div>
//               )}
//             </div>
//           </nav>
//         </header>

//         {/* Quick Access */}
//         <section className="mt-8 lg:w-9/10 px-8 md:px-8 lg:px-14">
//           <h2 className="text-2xl font-bold mb-4 text-blue-700">Quick Access</h2>
//           <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
//             {quickAccessItems.map((item, index) => (
//               <div
//                 key={index}
//                 className="flex flex-col items-center bg-white p-4 shadow-lg rounded-lg transition-transform transform hover:scale-105 hover:shadow-xl cursor-pointer"
//                 onClick={() => navigate(item.path)}
//               >
//                 <img src={item.image} alt={item.name} className="w-24 h-20 mb-2 rounded-2xl border border-gray-200" />
//                 <p className="text-center text-lg font-medium">{item.name}</p>
//               </div>
//             ))}
//           </div>
//         </section>

//         {/* Personalized Campus Life Section */}
//         <section className="mt-8 lg:w-9/10 px-8 md:px-8 lg:px-14 bg-blue-50 p-6 rounded-lg">
//           <h2 className="text-2xl font-bold text-blue-700">Your Campus Life</h2>
//           <div className="flex flex-col lg:flex-row gap-6 mt-4">
//             {/* Today's Schedule */}
//             <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
//               <h3 className="font-semibold text-lg">Today's Schedule</h3>
//               <p className="mt-2 text-gray-600">3 Classes Today</p>
//               <NavLink to="/schedule" className="text-blue-600 hover:underline mt-2 inline-block">
//                 View All
//               </NavLink>
//             </div>

//             {/* Attendance */}
//             <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
//               <h3 className="font-semibold text-lg">Attendance</h3>
//               <p className="mt-2 text-gray-600">4 out of 5 attended</p>
//               <NavLink to="/attendance" className="text-blue-600 hover:underline mt-2 inline-block">
//                 View Details
//               </NavLink>
//             </div>

//             {/* Exams */}
//             <div className="flex-1 bg-white p-4 rounded-lg shadow-md">
//               <h3 className="font-semibold text-lg">Exams</h3>
//               <p className="mt-2 text-gray-600">Next exam: 25th Sept</p>
//               <NavLink to="/exams" className="text-blue-600 hover:underline mt-2 inline-block">
//                 Prepare Now
//               </NavLink>
//             </div>
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// };

// export default HomePage;

import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../redux/reducers/sidebarslice';
import { authApi, useLogoutMutation } from '../redux/api/userApi';
import { userlogout } from '../redux/reducers/userreducer';
import { IoMdNotifications, IoMdHome, IoMdCalendar, IoMdSearch, IoMdSettings ,IoMdDesktop ,IoMdAddCircle ,IoMdCheckmark,IoMdWarning ,IoMdExit } from "react-icons/io";
import { FaChalkboardTeacher, FaBook, FaUserGraduate, FaChartLine, FaCalendarAlt, FaRegBell } from "react-icons/fa";
import { MdAssignment, MdQuiz, MdEvent, MdChat, MdCode, MdOutlineLogout, MdHelp, MdPerson } from "react-icons/md";

const HomePage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();
  const role = useSelector(state => state?.user?.user?.user.role);
  const name = useSelector(state => state?.user?.user?.user.firstName);
  const class1 = useSelector(state => state?.user?.user?.user?.academicDetails?.grade);


  const [searchTerm, setSearchTerm] = useState('');
  
  // Profile dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Toggle sidebar
  const handleSidebarToggle = () => {
    dispatch(toggleSidebar());
  };

  // Toggle dropdown
  const handleToggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  // Logout handler
  const logouthandler = async () => {
    await dispatch(userlogout());
    await logout();
    localStorage.removeItem('token');
    dispatch(authApi.util.resetApiState());
    navigate('/login');
  };

  // Define items with icons and paths
  const teacherItems = [
    { name: 'dashboard', icon: <FaChartLine className="text-blue-600" size={24} />, path: '/dashboard' },
    { name: 'Take Attendance', icon: <FaChalkboardTeacher className="text-green-600" size={24} />, path: '/takeattendance' },
    { name: 'Student registration', icon: <IoMdAddCircle className="text-teal-600" size={24} />, path: '/register' },
    { name: 'ALL Student', icon: <IoMdDesktop className="text-teal-600" size={24} />, path: '/studentdesh' },
    { name: 'Online Quiz', icon: <MdQuiz className="text-purple-600" size={24} />, path: '/quiz' },
    { name: 'Events Calendar', icon: <MdEvent className="text-orange-500" size={24} />, path: '/events' },
    { name: 'Chat', icon: <MdChat className="text-indigo-600" size={24} />, path: '/chatapp' },
    { name: 'Assignments', icon: <MdAssignment className="text-red-600" size={24} />, path: '/teacherassignment' },
    { name: 'Knowledge Center', icon: <FaBook className="text-amber-600" size={24} />, path: '/knowlegecentercreate' },
    { name: 'All complain', icon: <IoMdWarning className="text-amber-600" size={24} />, path: '/complaintbox' },
    { name: 'Take Leave', icon: <IoMdExit className="text-amber-600" size={24} />, path: '/application' },
    { name: 'Students Leave', icon: <IoMdCheckmark className="text-amber-600" size={24} />, path: '/leavesection' },

    { name: 'Timetable', icon: <IoMdCalendar className="text-teal-600" size={24} />, path: '/timetable' },
    { name: 'Finance', icon: <FaChartLine className="text-emerald-600" size={24} />, path: '/finance' },

  ];

  const studentItems = [
    { name: 'Dashboard', icon: <FaChartLine className="text-blue-600" size={24} />, path: '/dashboardstd' },
    { name: 'Attendance', icon: <FaUserGraduate className="text-green-600" size={24} />, path: '/attendance' },
    { name: 'Online Exams', icon: <MdQuiz className="text-purple-600" size={24} />, path: '/quiz' },
    { name: 'Events Calendar', icon: <MdEvent className="text-orange-500" size={24} />, path: '/events' },
    { name: 'Chat', icon: <MdChat className="text-indigo-600" size={24} />, path: '/chatapp' },
    { name: 'Assignments', icon: <MdAssignment className="text-red-600" size={24} />, path: '/assignment' },
    { name: 'Knowledge Center', icon: <FaBook className="text-amber-600" size={24} />, path: '/knowlegecenter' },
    { name: 'Take Leave', icon: <IoMdExit className="text-amber-600" size={24} />, path: '/application' },

    { name: 'complain form', icon: <IoMdWarning className="text-teal-600" size={24} />, path: '/complaintform' },
    { name: 'complain request', icon: <MdCode className="text-teal-600" size={24} />, path: '/request' },
    { name: 'Coding Practice', icon: <MdCode className="text-teal-600" size={24} />, path: '/coding' },
    { name: 'Roadmap', icon: <FaChartLine className="text-emerald-600" size={24} />, path: '/roadmap' },
  ];

  const quickAccessItems = role === "teacher" ? teacherItems : studentItems;
  
  // Current date
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', options);

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      {/* Main Content */}
      <div className="w-full">
        {/* Header */}
        <header className="fixed top-0 w-full bg-white shadow-md px-3 sm:px-6 py-3 flex justify-between items-center z-40">
      <div className="flex items-center">
        <img src="/unified_campus.png" alt="Unified Campus Logo" className="w-8 h-8 sm:w-10 sm:h-10 mr-2" />
        <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Unified Campus</h2>
      </div>

      <div className="flex-1 mx-2 sm:mx-8 hidden sm:flex">
        <div className="relative w-full max-w-xl">
          <IoMdSearch className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for courses, assignments, resources..."
            className="w-full pl-10 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Search bar for mobile devices - visible on small screens only */}
      <div className="flex-1 mx-2 sm:hidden">
        <div className="relative w-full">
          <IoMdSearch className="absolute left-2 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-8 px-3 py-1.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <nav className="flex items-center space-x-1 sm:space-x-6">
        <NavLink to="/" className="text-gray-600 hover:text-blue-500 transition-colors duration-300 flex items-center">
          <IoMdHome size={22} />
          <span className="hidden sm:inline-block ml-1">Home</span>
        </NavLink>
        
        <div className="relative">
          <NavLink to="/notifications" className="text-gray-600 hover:text-blue-500 transition-colors duration-300 flex items-center">
            <FaRegBell size={20} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
          </NavLink>
        </div>
        
        <NavLink to="/events" className="text-gray-600 hover:text-blue-500 transition-colors duration-300 hidden xs:flex items-center">
          <FaCalendarAlt size={20} />
          <span className="hidden sm:inline-block ml-1">Calendar</span>
        </NavLink>

        <div className="relative" ref={dropdownRef}>
          {/* Profile Picture with status indicator - fixed for small screens */}
          <div className="relative">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjDGMp734S91sDuUFqL51_xRTXS15iiRoHew&s" 
              alt="Profile"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full cursor-pointer border-2 border-blue-500 object-cover shadow-md"
              onClick={handleToggleDropdown}
            />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
          </div>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white shadow-xl rounded-lg overflow-hidden border border-gray-100 transform transition-all duration-300">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <p className="font-medium text-gray-800">{name}</p>
                <p className="text-sm text-gray-500">{role === "teacher" ? "Faculty Member" : "Student"}</p>
              </div>
              
              <NavLink to="/profile" className="flex items-center px-4 py-3 text-gray-600 hover:bg-blue-50 transition-colors">
                <MdPerson className="text-gray-500 mr-3" size={20} />
                <span>My Profile</span>
              </NavLink>
              
              <NavLink to="/settings" className="flex items-center px-4 py-3 text-gray-600 hover:bg-blue-50 transition-colors">
                <IoMdSettings className="text-gray-500 mr-3" size={20} />
                <span>Settings</span>
              </NavLink>
              
              <NavLink to="/help" className="flex items-center px-4 py-3 text-gray-600 hover:bg-blue-50 transition-colors">
                <MdHelp className="text-gray-500 mr-3" size={20} />
                <span>Help Center</span>
              </NavLink>
              
              <div onClick={logouthandler} className="flex items-center px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer">
                <MdOutlineLogout className="text-gray-500 mr-3" size={20} />
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>

        {/* Main Content with padding for header */}
        <main className="pt-20 pb-6 px-6">
          {/* Welcome Message */}
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 rounded-2xl p-8 shadow-lg text-white mb-8 overflow-hidden relative">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome back, {role === "teacher" ? "Professor" : "Student"}!</h1>
                <p className="opacity-90 font-light">{formattedDate}</p>
              </div>
              <div className="mt-4 md:mt-0 bg-white/20 p-4 rounded-lg backdrop-blur-sm">
                <p className="font-medium">Current Semester: {class1}</p>
                <p className="text-sm opacity-90">Week 8 of 16</p>
              </div>
            </div>
          </div>

          {/* Quick Access Section */}
          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Quick Access</h2>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center bg-blue-50 py-1 px-3 rounded-full transition-colors duration-300">
                Customize <span className="material-icons text-sm ml-1">edit</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {quickAccessItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => navigate(item.path)}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer flex flex-col items-center group"
                >
                  <div className="bg-blue-50 w-full pt-5 pb-3 px-4 flex justify-center group-hover:bg-blue-100 transition-colors duration-300">
                    {item.icon}
                  </div>
                  <div className="p-3 text-center">
                    <p className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors duration-300">{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Campus Stats Row */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
              <span className="w-1 h-6 bg-blue-500 rounded-full mr-2 inline-block"></span>
              Academic Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
                <p className="text-blue-700 text-sm font-medium">Current GPA</p>
                <p className="text-3xl font-bold mt-2">{role === "teacher" ? "N/A" : "3.8"}</p>
                <p className="text-xs text-gray-500 mt-1">{role === "teacher" ? "Faculty Rating" : "Top 15%"}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
                <p className="text-green-700 text-sm font-medium">Attendance</p>
                <p className="text-3xl font-bold mt-2">92%</p>
                <p className="text-xs text-gray-500 mt-1">This semester</p>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-5 border border-amber-200">
                <p className="text-amber-700 text-sm font-medium">Assignments</p>
                <p className="text-3xl font-bold mt-2">3 <span className="text-base font-normal">pending</span></p>
                <p className="text-xs text-gray-500 mt-1">Due this week</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border border-purple-200">
                <p className="text-purple-700 text-sm font-medium">Upcoming Tests</p>
                <p className="text-3xl font-bold mt-2">2</p>
                <p className="text-xs text-gray-500 mt-1">Next: Thu, Mar 21</p>
              </div>
            </div>
          </section>

          {/* Today's Schedule & Campus Life Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Today's Schedule */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="w-1 h-6 bg-blue-500 rounded-full mr-2 inline-block"></span>
                    Today's Schedule
                  </h2>
                  <NavLink to="/schedule" className="text-blue-600 hover:text-blue-800 text-sm bg-blue-50 py-1 px-3 rounded-full transition-colors duration-300">
                    View Full Calendar
                  </NavLink>
                </div>
                
                <div className="space-y-4">
                  <div className="flex border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-white p-4 rounded-r-lg shadow-sm">
                    <div className="w-20 flex-shrink-0">
                      <p className="font-medium">9:00 AM</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Introduction to Computer Science</h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full inline-block mr-2"></span>
                        Room 302, Building A
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex border-l-4 border-green-500 bg-gradient-to-r from-green-50 to-white p-4 rounded-r-lg shadow-sm">
                    <div className="w-20 flex-shrink-0">
                      <p className="font-medium">11:00 AM</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Calculus II</h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>
                        Room 205, Math Department
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex border-l-4 border-purple-500 bg-gradient-to-r from-purple-50 to-white p-4 rounded-r-lg shadow-sm">
                    <div className="w-20 flex-shrink-0">
                      <p className="font-medium">2:00 PM</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Team Project Meeting</h3>
                      <p className="text-sm text-gray-600 flex items-center mt-1">
                        <span className="w-2 h-2 bg-purple-500 rounded-full inline-block mr-2"></span>
                        Student Center, Study Room 3
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Campus Life */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
                <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
                  <span className="w-1 h-6 bg-blue-500 rounded-full mr-2 inline-block"></span>
                  Campus Activities
                </h2>
                
                <div className="space-y-5">
                  <div className="border-b border-gray-100 pb-4 hover:bg-blue-50 p-3 rounded-lg transition-colors duration-300 cursor-pointer group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-600 rounded-full inline-block">UPCOMING EVENT</p>
                        <h3 className="font-medium text-gray-800 mt-2 group-hover:text-blue-600 transition-colors duration-300">Spring Festival</h3>
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <FaCalendarAlt className="text-blue-500 mr-2" size={14} />
                          March 25 • Main Quad
                        </p>
                      </div>
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                        <MdEvent size={20} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-b border-gray-100 pb-4 hover:bg-green-50 p-3 rounded-lg transition-colors duration-300 cursor-pointer group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium px-2 py-1 bg-green-100 text-green-600 rounded-full inline-block">CLUB MEETING</p>
                        <h3 className="font-medium text-gray-800 mt-2 group-hover:text-green-600 transition-colors duration-300">Robotics Club</h3>
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <FaCalendarAlt className="text-green-500 mr-2" size={14} />
                          Tomorrow • Engineering Building
                        </p>
                      </div>
                      <div className="bg-green-100 text-green-600 p-2 rounded-full">
                        <MdEvent size={20} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="hover:bg-purple-50 p-3 rounded-lg transition-colors duration-300 cursor-pointer group">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-medium px-2 py-1 bg-purple-100 text-purple-600 rounded-full inline-block">WORKSHOP</p>
                        <h3 className="font-medium text-gray-800 mt-2 group-hover:text-purple-600 transition-colors duration-300">Career Development</h3>
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <FaCalendarAlt className="text-purple-500 mr-2" size={14} />
                          March 22 • Career Center
                        </p>
                      </div>
                      <div className="bg-purple-100 text-purple-600 p-2 rounded-full">
                        <MdEvent size={20} />
                      </div>
                    </div>
                  </div>
                  
                  <NavLink to="/events" className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium inline-block mt-2 transition-colors duration-300 text-center w-full">
                    View All Campus Events
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HomePage;