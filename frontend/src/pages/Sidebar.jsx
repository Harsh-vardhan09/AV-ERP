
// import React, { useState } from 'react';
// import { NavLink } from 'react-router-dom';
// import { TbLayoutDashboard } from "react-icons/tb";
// import { BsCalendar2CheckFill } from "react-icons/bs";
// import { MdAssignment } from "react-icons/md";
// import { TiPlus } from "react-icons/ti";
// import { PiExamFill } from "react-icons/pi";
// import { TfiWrite } from "react-icons/tfi";
// import { IoMdMenu } from "react-icons/io";
// import { RxCross2 } from "react-icons/rx";
// import { useDispatch, useSelector } from 'react-redux';
// import { toggleSidebar } from '../redux/reducers/sidebarslice';
// import '../App.css'; 

// const Sidebar = () => {
//   const dispatch = useDispatch();
//   const SidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
//   const [isDarkMode, setDarkMode] = useState(false);
//   // const role= useSelector(state=>state?.user?.user?.user.role)
//   // Sidebar toggle
//   const handleToggleSidebar = () => {
//     dispatch(toggleSidebar());
//   };

//   // Dark mode toggle
//   const handleToggleDarkMode = () => {
//     setDarkMode((prev) => {
//       const newDarkMode = !prev;
//       document.body.classList.toggle('dark', newDarkMode);
//       return newDarkMode;
//     });
//   };
// // const canclebutton=()=>{
// //   dispatch(toggleSidebar());
// // }
//   return (
//     <div className={`fixed top-0 z-50 ${SidebarOpen ? 'sidebar visible' : 'sidebar hidden'} lg:translate-x-0 w-60 h-full bg-white dark:bg-gray-900 shadow-lg`}>
//       {/* Sidebar Header */}
//       <header className="flex items-center justify-between p-4 bg-purple-600 text-white">
//         <div className="text-lg font-bold">Unified Campus</div>
//         {/* <div onClick={canclebutton} className='cursor-pointer'>cancle</div> */}
//         <button onClick={handleToggleSidebar}>
//           {SidebarOpen ? <RxCross2 size={25} /> : <IoMdMenu size={25} />}
//         </button>
//       </header>

//       {/* Menu Links */}
//       <nav className="flex flex-col gap-4 p-4 mt-6">
//         {[
//            { to: '/', icon: <TbLayoutDashboard />, label: 'Home' },
//           { to: '/Dashboard', icon: <TbLayoutDashboard />, label: 'Dashboard' },
//           { to: '/attendance', icon: <BsCalendar2CheckFill />, label: 'Attendance' },
//           { to: '/assignment', icon: <MdAssignment />, label: 'Assignments' },
//           { to: '/addevent', icon: <TiPlus />, label: 'Create Events' },
//           { to: '/timetable', icon: <TiPlus />, label: 'Time table' },
//           { to: '/application', icon: <TiPlus />, label: 'Leave' },
//           { to: '/online-exam', icon: <PiExamFill />, label: 'Online Exam' },
//           { to: '/self-learning', icon: <TfiWrite />, label: 'Self Learning' },
//         ].map((item, index) => (
//           <NavLink
//             key={index}
//             to={item.to}
//             className="flex items-center space-x-3 text-gray-700 dark:text-gray-300 hover:bg-purple-600 hover:text-white p-3 rounded-md transition-colors duration-200"
//             onClick={handleToggleSidebar}
//           >
//             {item.icon}
//             <span>{item.label}</span>
//           </NavLink>
//         ))}

//       </nav>

//       {/* Dark Mode Toggle */}
//       <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
//         <button
//           className="text-gray-500 dark:text-gray-300 flex items-center"
//           onClick={handleToggleDarkMode}
//         >
//           <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
//         </button>
//       </div>
//     </div>
//   );
// };

// export default Sidebar;
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { TbLayoutDashboard } from "react-icons/tb";
import { BsCalendar2CheckFill } from "react-icons/bs";
import { MdAssignment, MdOutlineEventNote } from "react-icons/md";
import { PiExamFill } from "react-icons/pi";
import { TfiWrite } from "react-icons/tfi";
import { IoMdMenu } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { IoCalendarOutline } from "react-icons/io5";
import { TbFileDescription } from "react-icons/tb";
import { AiOutlineHome } from "react-icons/ai";
import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebar } from '../redux/reducers/sidebarslice';

const Sidebar = () => {
  const dispatch = useDispatch();
  const sidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);
  const [isDarkMode, setDarkMode] = useState(false);

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => {
      const newDarkMode = !prev;
      document.body.classList.toggle('dark', newDarkMode);
      return newDarkMode;
    });
  };

  // Define menu items
  const menuItems = [
    { to: '/', icon: <AiOutlineHome size={20} />, label: 'Home' },
    { to: '/dashboard', icon: <TbLayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/attendance', icon: <BsCalendar2CheckFill size={20} />, label: 'Attendance' },
    { to: '/assignment', icon: <MdAssignment size={20} />, label: 'Assignments' },
    { to: '/addevent', icon: <MdOutlineEventNote size={20} />, label: 'Create Events' },
    { to: '/timetable', icon: <IoCalendarOutline size={20} />, label: 'Time Table' },
    { to: '/application', icon: <TbFileDescription size={20} />, label: 'Leave Application' },
    { to: '/online-exam', icon: <PiExamFill size={20} />, label: 'Online Exam' },
    { to: '/self-learning', icon: <TfiWrite size={20} />, label: 'Self Learning' },
  ];

  return (
    <>
      {/* Button to toggle sidebar */}
      <button
        onClick={handleToggleSidebar}
        className="fixed top-4 left-4 z-30 p-2 rounded-md bg-purple-600 text-white shadow-md hover:bg-purple-700 transition-colors"
        aria-label="Toggle menu"
      >
        <IoMdMenu size={20} />
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleToggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 z-50 w-64 h-full transition-transform duration-300 ease-in-out transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } bg-white dark:bg-gray-800 shadow-lg`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 bg-purple-600 text-white">
          <h1 className="text-lg font-bold">Unified Campus</h1>
          <button
            onClick={handleToggleSidebar}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Menu Links */}
        <div className="p-4 overflow-y-auto h-[calc(100%-120px)]">
          <ul className="space-y-1">
            {menuItems.map((item, index) => (
              <li key={index}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 rounded-lg transition-colors ${isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-gray-700'
                    }`
                  }
                  onClick={handleToggleSidebar}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Dark Mode Toggle */}
        <div className="absolute bottom-4 left-4 right-4 p-2 border-t border-gray-200 dark:border-gray-700 pt-3">
          <button
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            onClick={handleToggleDarkMode}
          >
            <span className="mr-2">{isDarkMode ? '☀️' : '🌙'}</span>
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;