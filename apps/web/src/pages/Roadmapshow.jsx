// import RoadmapCpp from './RoadmapCpp.jpg';

// function Roadmapshow(){
//     const Skills = [
//         {id: 1, name:"DSA-C++"},
//         {id: 2, name:"Java"},
//         {id: 3, name:"Python"},
//         {id: 4, name:"Java script"},
//         {id: 5, name:"React"},
//         {id: 6, name:"DevOps"},
//         {id: 7, name:"Front-End"},
//         {id: 8, name:"Back-End"},
//         {id: 9, name:"Full-Stack"},
//     ];

//     const skillitems = Skills.map(Skill => <li className="li" key={Skill.id}>{Skill.name}</li>);

//     return(<>
//         <div className="main">
//             <div className="navbar">
//                     <h2>Unified Campus</h2>
//                     <div className="nav-search">
//                         <input className="search-input" placeholder="Search for roadmaps" type="text"/>
//                         {/* <FontAwesomeIcon className="search-icon" icon={faMagnifyingGlass} /> */}
//                     </div>
//                     <p>Home</p>
//                     <p>Dashboard</p>
//                     <p>Roadmap </p>
//             </div>
//             <div className="description">
//                     <div className="d1">
//                         <h2>C++ Roadmap</h2>
//                     </div>
//                     <div className='d2'>
//                         <p>Step by step guide to learn C++ and become Pro in C++</p>
//                     </div>
//                 </div>
//             <div className="display-roadmap">
//                 <div className="Roadmap">
//                 <img id="RoadmapC" src={RoadmapCpp} alt='image' />
//                 </div>
//             </div>
//             <div className='main-body'>
//                 <div className="skill-based">
//                     <section id='skill-based-roadmap'><h1>All Related Roadmaps</h1></section>
//                     <div className="container1">
//                         <div className="slider2">
//                             <ul className='ul-skill'>{skillitems}</ul>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//         <style jsx>{`
//             *{
//                 margin: 0%;
//                 padding: 0%;
//             }
//             body{
//                 background-color: rgb(249, 248, 249);
//             }
//             .navbar{
//                 height: 80px;   
//                 width: 100%;
//                 background-color: #fff;
//                 color: #4b5563;
//                 display:flex;
//                 align-items: center;
//                 justify-content: space-evenly;
//                 position: relative;
//                 font-size: 1.5rem;
//             }
//             .navbar h2{
//                 color: #1d4ed8;
//             }
//             .navbar h2:hover{
//                 transform: scale(1.03,1.03);
//             }
//             .icon-bar{
//                 color: #111;
//                 height: 35px;
//             }
//             .nav-search{
//                 display: flex;
//                 justify-content: space-evenly;
//                 background-color: black;
//                 width: 500px;
//                 height: 40px;
//                 border: 2px solid #111;
//                 border-radius: 10px;
//             }
//             .search-input{
//                 width:480px;
//                 font-size: 1rem;
//                 background-color: white;
//                 border-radius: 10px;
//                 padding-left: 10px;
//             }
//             .search-icon{   
//                 padding: 4px;
//                 margin-top: 4px;
//                 color: white;
//             }
//             .navbar p:hover{
//                 color: #1d4ed8;
//                 transform: scale(1.02,1.02);
//             }
//             .description{
//                 position: relative;
//                 left: 20%;
//                 margin-top: 20px;
//                 padding: 20px;
//                 height: 120px;
//                 background-color: #fff;
//                 border: 1px #111 solid;
//                 border-radius: 10px;
//                 max-width: 60%;
//                 font-size: 2rem;
//             }
//             .d1{
//                 height: 60px;
//             }
//             .d2{
//                 height: 60px;
//             }
//             .display-roadmap{
//                 height: 1200px;
//                 max-width: 100%;
//                 margin-top: 60px;
//                 display: flex;
//                 justify-content: center;
//             }
//             .Roadmap{
//                 height: 1120px;
//                 width: 70%;
//                 background-color: #fff;
//                 border: 1px #111 solid;
//                 border-radius: 10px;
//             }
//             .Roadmap img{
//                 max-width: 100%;
//                 border-radius: 12px;
//             }
//             .main-body{
//                 height: 300px;
//                 width: 100%;
//                 display: flex;
//                 justify-content: center;
//             }
//             .skill-based h1{
//                 height: 40px;
//                 width: 340px;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 background-color: #c2aaf6;
//                 position: relative;
//                 margin-top: 20px;
//                 left: 28%;
//                 border: #111 5px solid;
//                 border-radius: 10px;
//             }
//             .skill-based h1:hover{
//                 transform: scale(1.1,1.1);
//             }
//             .container1{
//                 margin-top: 50px;
//                 height: 300px;
//                 width: 900px;
//                 display: grid;
//             }
//             .ul-skill{
//                 display: flex;
//                 flex-wrap: wrap;
//                 list-style-type: none;
//             }
//             .li{
//                 height: 20px;
//                 width: 250px;
//                 border-radius: 5px;
//                 border: #111 2px solid;
//                 font-size: 1.5rem;
//                 display: flex;
//                 align-items: center;
//                 background-color: #c2aaf6;
//                 margin: 5px;
//                 padding: 15px;
//             }
//             .li:hover{
//                 transform: scale(1.04,1.04);
//             }
//             @media (max-width: 768px) {
//             .navbar {
//                 font-size: 0.6rem;
//                 height: 60px;
//                 font-weight: 400;
//             }
//             .navbar h2 {
//                 font-size: 0.6rem;
//             }
//             .nav-search {
//                 max-width: 40%;
//                 height: 35px;
//             }
//             .search-input {
//                 max-width: 95%;
//             }
//             .description{
//                 height: 120px;
//                 max-width: 80%;
//                 left: 5%;
//                 font-size: 1.5rem;
//             }
//             .d1{
//                 margin-bottom: 20px;
//                 height: 20px;
//             }
//             .d2{
//                 height: 20px;
//             }
//             .display-roadmap{
//                 height: auto;
//                 max-width: 100%;
//             }
//             .Roadmap{
//                 height: auto;
//                 width: 85%
//             }
//             .Roadmap img{
//                 max-width: 100%;
//                 border-radius: 12px;
//             }
//             .main-body{
//                 height: 750px;
//             }
//             .skill-based h1 {
//                 width: 100%;
//                 font-size: 1.5rem;
//                 left: 0;
//             }
//             .container1{
//                 width: 97%;
//             }
//             .ul-skill{
//                 flex-direction: column;
//                 align-items: center;
//             }
//             .li {
//                 width: 90%;
//                 font-size: 1.2rem;
//             }
//             }
//             @media (min-width: 769px) and (max-width: 1500px){
//                 .navbar {
//                     font-size: 1.7rem;
//                     height: 60px;
//                     font-weight: 400;
//                 }
//                 .navbar h2 {
//                     font-size: 1.7rem;
//                 }
//                 .nav-search {
//                     max-width: 30%;
//                     height: 35px;
//                 }
//                 .search-input {
//                     max-width: 96%;
//                 }
//                 .description{
//                     height: 120px;
//                     max-width: 80%;
//                     left: 5%;
//                     font-size: 1.5rem;
//                 }
//                 .d1{
//                     margin-bottom: 20px;
//                     height: 20px;
//                 }
//                 .d2{
//                     height: 20px;
//                 }
//                 .display-roadmap{
//                     height: auto;
//                     max-width: 100%;
//                 }
//                 .Roadmap{
//                     height: auto;
//                     width: 85%
//                 }
//                 .Roadmap img{
//                     max-width: 100%;
//                     border-radius: 12px;
//                 }
//                 .main-body{
//                     height: 750px;
//                 }
//                 .skill-based h1 {
//                     width: 100%;
//                     font-size: 1.5rem;
//                     left: 0;
//                 }
//                 .container1{
//                     width: 97%;
//                 }
//                 .ul-skill{
//                     flex-direction: column;
//                     align-items: center;
//                 }
//                 .li {
//                     width: 90%;
//                     font-size: 1.2rem;
//                 }
//             }
//         `}</style>
//     </>);
// }
// export default Roadmapshow;

import React, { useState } from 'react';
import { Search, Home, LayoutDashboard, BookOpen, Menu, X } from 'lucide-react';

const Roadmapshow = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sample roadmap image URL - replace with your actual image import
  const roadmapImageUrl = "/api/placeholder/800/600";
  
  const learningPaths = [
    {id: 1, name: "DSA-C++", students: 2456, duration: "3 months"},
    {id: 2, name: "Java Development", students: 1876, duration: "4 months"},
    {id: 3, name: "Python", students: 3241, duration: "2.5 months"},
    {id: 4, name: "JavaScript", students: 2984, duration: "3 months"},
    {id: 5, name: "React", students: 2145, duration: "2 months"},
    {id: 6, name: "DevOps", students: 1654, duration: "5 months"},
    {id: 7, name: "Front-End Development", students: 2789, duration: "4 months"},
    {id: 8, name: "Back-End Development", students: 2134, duration: "4 months"},
    {id: 9, name: "Full-Stack Development", students: 3421, duration: "6 months"},
  ];
  
  // Filter roadmaps based on search query
  const filteredPaths = searchQuery 
    ? learningPaths.filter(path => 
        path.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : learningPaths;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Bar */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Unified Campus</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search for roadmaps"
                  className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <nav className="flex space-x-8">
                <a href="#" className="flex items-center text-gray-600 hover:text-blue-600">
                  <Home className="mr-1 h-5 w-5" />
                  <span>Home</span>
                </a>
                <a href="#" className="flex items-center text-gray-600 hover:text-blue-600">
                  <LayoutDashboard className="mr-1 h-5 w-5" />
                  <span>Dashboard</span>
                </a>
                <a href="#" className="flex items-center text-gray-600 hover:text-blue-600 font-medium">
                  <BookOpen className="mr-1 h-5 w-5" />
                  <span>Roadmaps</span>
                </a>
              </nav>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                {isMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <div className="relative mx-2 my-2">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search for roadmaps"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <a href="#" className="flex items-center text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium">
                <Home className="mr-2 h-5 w-5" />
                <span>Home</span>
              </a>
              <a href="#" className="flex items-center text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                <span>Dashboard</span>
              </a>
              <a href="#" className="flex items-center text-blue-600 bg-blue-50 px-3 py-2 rounded-md text-base font-medium">
                <BookOpen className="mr-2 h-5 w-5" />
                <span>Roadmaps</span>
              </a>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="flex-1">
        {/* Roadmap Header */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">C++ Programming Roadmap</h2>
              <p className="mt-2 text-gray-600">A comprehensive, step-by-step guide to master C++ programming</p>
            </div>
            
            {/* Roadmap Stats */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-6 text-sm">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-1">
                  <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.5a1 1 0 102 0V5zm-1 9a1 1 0 102 0v-5a1 1 0 10-2 0v5z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-2 text-gray-700">Difficulty: <span className="font-medium">Intermediate</span></span>
              </div>
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-1">
                  <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ml-2 text-gray-700">Duration: <span className="font-medium">4 months</span></span>
              </div>
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-1">
                  <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                </div>
                <span className="ml-2 text-gray-700">Students: <span className="font-medium">3,546</span></span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Roadmap Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 my-6">
          <div className="bg-white rounded-lg shadow overflow-hidden p-6">
            <img 
              src={roadmapImageUrl} 
              alt="C++ Learning Roadmap" 
              className="w-full h-auto rounded-lg"
            />
          </div>
        </div>
        
        {/* Related Roadmaps */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 my-10">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Explore Related Learning Paths</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPaths.map(path => (
              <div key={path.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-200">
                <div className="p-5">
                  <h4 className="text-lg font-semibold text-gray-800">{path.name}</h4>
                  <div className="flex flex-wrap mt-3 text-sm text-gray-600">
                    <div className="flex items-center mr-4">
                      <svg className="h-4 w-4 text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {path.duration}
                    </div>
                    <div className="flex items-center">
                      <svg className="h-4 w-4 text-blue-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                      </svg>
                      {path.students.toLocaleString()} students
                    </div>
                  </div>
                </div>
                <div className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 flex justify-between items-center">
                  <span className="text-white font-medium">View Roadmap</span>
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex justify-center md:justify-start">
              <span className="text-gray-500">© 2025 Unified Campus. All rights reserved.</span>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="flex justify-center md:justify-end space-x-6">
                <a href="#" className="text-gray-500 hover:text-gray-700">About</a>
                <a href="#" className="text-gray-500 hover:text-gray-700">Contact</a>
                <a href="#" className="text-gray-500 hover:text-gray-700">Privacy</a>
                <a href="#" className="text-gray-500 hover:text-gray-700">Terms</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Roadmapshow;