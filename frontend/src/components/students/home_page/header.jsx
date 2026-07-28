import React from 'react';
import { Link } from 'react-router-dom';
import { FaBell, FaUserCircle } from 'react-icons/fa';

const Header = () => {
  // return (
    // <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white py-4">
    //   <div className="container mx-auto flex justify-between items-center px-6">
        
    //     {/* Logo */}
    //     <div className="flex items-center space-x-2">
    //       <img src="/path/to/logo.png" alt="Unified Campus Logo" className="w-12 h-12 rounded-full shadow-lg" />
    //       <h1 className="text-3xl font-bold ml-1">Unified Campus</h1>
    //     </div>

    //     {/* Navigation Links */}
    //     <nav className="hidden md:flex space-x-8">
    //       <Link to="/" className="hover:text-gray-200 transition">Home</Link>
    //       <Link to="/features" className="hover:text-gray-200 transition">Features</Link>
    //       <Link to="/about" className="hover:text-gray-200 transition">About Us</Link>
    //       <Link to="/contact" className="hover:text-gray-200 transition">Contact</Link>
    //     </nav>

    //     {/* Notification and User Profile Section */}
    //     <div className="flex items-center space-x-6">
    //       <div className="relative">
    //         <button className="focus:outline-none">
    //           <FaBell className="w-6 h-6" />
    //         </button>
    //         {/* Notification Badge */}
    //         <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
    //       </div>
    //       <div className="flex items-center">
    //         <img
    //           src="/path/to/profile-photo.png" 
    //           alt="User Profile"
    //           className="w-10 h-10 rounded-full border-2 border-white"
    //         />
    //         <span className="hidden md:block">User Name</span>
    //         <FaUserCircle className="hidden md:block w-8 h-8 ml-2" />
    //       </div>
    //       <button className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition">Logout</button>
    //     </div>

    //     {/* Mobile Menu Button */}
    //     <div className="md:hidden">
    //       <button className="text-white focus:outline-none">
    //         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    //           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
    //         </svg>
    //       </button>
    //     </div>
    //   </div>

    //   {/* Mobile Navigation (Hidden on larger screens) */}
    //   <nav className="md:hidden bg-blue-800 text-white flex flex-col space-y-2 py-4">
    //     <Link to="/" className="block px-6 py-2 hover:bg-blue-700">Home</Link>
    //     <Link to="/features" className="block px-6 py-2 hover:bg-blue-700">Features</Link>
    //     <Link to="/abou t" className="block px-6 py-2 hover:bg-blue-700">About Us</Link>
    //     <Link to="/contact" className="block px-6 py-2 hover:bg-blue-700">Contact</Link>
    //   </nav>
    // </header>
  // )
};

export default Header;
