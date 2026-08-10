import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '@shared/lib/store/sidebarSlice';
import { authApi, useLogoutMutation } from '@modules/identity/api/userApi';
import { userlogout } from '@shared/lib/store/userSlice';
import { IoMdHome, IoMdCalendar, IoMdSearch, IoMdCheckmark, IoMdWarning, IoMdExit } from "react-icons/io";
import { FaChalkboardTeacher, FaBook, FaUserGraduate, FaChartLine, FaCalendarAlt, FaRegBell } from "react-icons/fa";
import { MdAssignment, MdQuiz, MdEvent, MdChat, MdCode, MdOutlineLogout } from "react-icons/md";

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

  // Only paths that are actually routed. /dashboard, /knowlegecentercreate and
  // /coding were dropped — no route has ever matched them.
  const teacherItems = [
    { name: 'Take Attendance', icon: <FaChalkboardTeacher className="text-green-600" size={24} />, path: '/takeattendance' },
    { name: 'Online Quiz', icon: <MdQuiz className="text-purple-600" size={24} />, path: '/quiz' },
    { name: 'Chat', icon: <MdChat className="text-indigo-600" size={24} />, path: '/chatapp' },
    { name: 'All complain', icon: <IoMdWarning className="text-amber-600" size={24} />, path: '/complaintbox' },
    { name: 'Take Leave', icon: <IoMdExit className="text-amber-600" size={24} />, path: '/application' },
    { name: 'Students Leave', icon: <IoMdCheckmark className="text-amber-600" size={24} />, path: '/leavesection' },
    { name: 'Timetable', icon: <IoMdCalendar className="text-teal-600" size={24} />, path: '/timetable' },
  ];

  const studentItems = [
    { name: 'Dashboard', icon: <FaChartLine className="text-blue-600" size={24} />, path: '/student/dashboard' },
    { name: 'Attendance', icon: <FaUserGraduate className="text-green-600" size={24} />, path: '/attendance' },
    { name: 'Online Exams', icon: <MdQuiz className="text-purple-600" size={24} />, path: '/quiz' },
    { name: 'Chat', icon: <MdChat className="text-indigo-600" size={24} />, path: '/chatapp' },
    { name: 'Assignments', icon: <MdAssignment className="text-red-600" size={24} />, path: '/assignment' },
    { name: 'Knowledge Center', icon: <FaBook className="text-amber-600" size={24} />, path: '/knowlegecenter' },
    { name: 'Take Leave', icon: <IoMdExit className="text-amber-600" size={24} />, path: '/application' },
    { name: 'complain form', icon: <IoMdWarning className="text-teal-600" size={24} />, path: '/complaintform' },
    { name: 'complain request', icon: <MdCode className="text-teal-600" size={24} />, path: '/request' },
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
        <img src="/unified_campus.png" alt="AV ERP Logo" className="w-8 h-8 sm:w-10 sm:h-10 mr-2" />
        <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">AV ERP</h2>
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
              
              {/* /profile, /settings and /help had no route — dropped */}
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
                  {/* "View Full Calendar" pointed at /schedule, which has no route */}
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