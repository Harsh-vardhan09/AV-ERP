// import React, { useState, useEffect } from "react";
// import Noticebox from "./Noticebox";
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// import { faBoxArchive } from '@fortawesome/free-solid-svg-icons';

// const Allnoticepage = () => {
//   const [Data, setData] = useState([]);
  
//   useEffect(() => {
//     async function fetchNotice() {
//       try {
//         const response = await fetch(`${import.meta.env.VITE_PORT}/notice/getall`);
//         if (response.ok) {
//           const data = await response.json();
//           setData(data.data);  
//         } else {
//           console.error("Failed to fetch notice data.");
//         }
//       } catch (error) {
//         console.error("Error fetching notice data:", error);
//       }
//     }

//     fetchNotice();
//   }, []); 

//   console.log(Data); 
//   return (
//     <div>
//       <section className="main" id="main">
//         <div>
//           <h1 className="heading">
//             NOTICE BOX
//             <div className="cbox">
//               <FontAwesomeIcon icon={faBoxArchive} />
//             </div>
//           </h1>
//           <div className="complaints" id="complaints">
//             {
//               Data.map((notice) => {
//                 console.log("rendering : ", notice);
//                 return <Noticebox key={notice.id} data={notice} />;
//               })
//             }
//           </div>
//         </div>
//       </section>
//             <style jsx>{`
//                 *{
//                     padding: 0;
//                     margin: 0;
//                 }
//                 body {
//                     background-color: #FEF9F2;
//                 }
//                 .main {
//                     height: 100vh;
//                     padding: 0;
//                     margin: 0;
//                     font-family: Arial, Helvetica, sans-serif;
//                     display: flex;
//                     flex-direction: column;
//                     align-items: center;
//                     background-color: #FEF9F2;
//                 }
//                 h2{
//                     margin-bottom: 50px;
//                     font-size: 1.5rem;
//                 }
//                 h1{
//                     font-size: 3rem;
//                 }
//                 .heading {
//                     width: 100svw;
//                     background-color: #C9E9D2;
//                     padding-top: 30px;
//                     margin-top: 0;
//                     font-size: 2.5rem;
//                     display: flex;
//                     justify-content: center;
//                     text-align: center;
//                 }
//                 .notice-title{
//                     width: 95%;
//                     display: flex;
//                     font-size:2.5rem;
//                     justify-content: center;
//                     align-items: center;
//                     margin: 10px;
//                     margin-bottom: 20px;
//                     text-overflow: ellipsis;
//                     overflow: hidden;
//                 }
//                 .complaint-heading {
//                     width: 100%;
//                     display: flex;
//                     justify-content: center;
//                     align-items: center;
//                     height: 52px;
//                     text-overflow: ellipsis;
//                     overflow: hidden;
//                     margin: 0px;
//                 }
//                 .cbox {
//                     height: 80px;
//                     width: 80px;
//                     color: black;
//                     position: relative;
//                     animation: khisakja 1s ease-in-out 2;
//                 }
//                 .complaints {
//                     display: flex;
//                     flex-wrap: wrap;
//                     justify-content: center;
//                 }
//                 .complaint {
//                     border: 1px solid rgba(0, 0, 0, 0.432);
//                     border-radius: 5px;
//                     padding: 10px;
//                     width: 300px;
//                     margin: 10px;
//                     box-shadow: 2px 5px 5px 0 rgba(0, 0, 0, 0.132);
//                     background-color: lightblue;
//                     position: relative;
//                 }
//                 .more{
//                     margin:20px;
//                 }
//                 .complaint:hover {
//                     transform: scale(1.03);
//                     transition: 0.3s;
//                 }
//                 @keyframes khisakja {
//                     0% { transform: rotateZ(30deg); }
//                     25% { transform: rotateZ(-30deg); }
//                     50% { transform: rotateZ(30deg); }
//                     75% { transform: rotateZ(-30deg); }
//                     100% { transform: rotateZ(0deg); }
//                 }
//                 @media (max-width: 550px) {
//                     .heading{
//                         font-size: 1.5rem;
//                         text-align: left;
//                     }
//                     .add-button{
//                         top: 60px;
//                         right: 10px;
//                     }
//                 }
//             `}</style>
//     </div>
//     );
// }
// export default Allnoticepage;
import React, { useState, useEffect } from "react";
import Noticebox from "./Noticebox";
import {  useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBoxArchive, faBell, faSpinner, faFilter, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { motion, AnimatePresence } from "framer-motion";

const Allnoticepage = () => {
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const navigate = useNavigate();
  
  // Mock categories - replace with your actual categories from data
  const categories = ["Academic", "Events", "Administrative", "Urgent"];
  
  useEffect(() => {
    async function fetchNotices() {
      setIsLoading(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_PORT}/notice/getall`);
        if (response.ok) {
          const data = await response.json();
          setNotices(data.data);
          setError(null);
        } else {
          setError("Failed to fetch notices. Please try again later.");
        }
      } catch (error) {
        setError("Error connecting to server. Please check your connection.");
        console.error("Error fetching notice data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNotices();
  }, []);

  // Clear search term
  const clearSearch = () => {
    setSearchTerm("");
  };

  // Filter notices based on search term and category
  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         notice.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || notice.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Category styling configurations
  const categoryConfig = {
    "urgent": {
      color: "border-rose-500",
      bgActive: "bg-rose-500",
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600"
    },
    "academic": {
      color: "border-indigo-500",
      bgActive: "bg-indigo-500",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600"
    },
    "events": {
      color: "border-emerald-500",
      bgActive: "bg-emerald-500",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600"
    },
    "administrative": {
      color: "border-amber-500",
      bgActive: "bg-amber-500",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600"
    },
    "all": {
      bgActive: "bg-violet-600",
    }
  };

  const getCategoryStyle = (category) => {
    const config = categoryConfig[category.toLowerCase()] || {};
    
    if (filterCategory === category) {
      return `${config.bgActive || 'bg-violet-600'} text-white shadow-md`;
    }
    
    return `bg-white border text-slate-700 hover:bg-slate-50 ${config.color || 'border-slate-200'}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      {/* Header with animated gradient background */}
      <motion.header 
        className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 py-8 sm:py-12 px-6 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            className="flex items-center gap-3 mb-2"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
              transition={{ 
                repeat: Infinity, 
                repeatDelay: 5,
                duration: 0.5 
              }}
              className="bg-white/20 p-3 rounded-full backdrop-blur-sm"
            >
              <FontAwesomeIcon icon={faBell} className="text-2xl text-white drop-shadow-md" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Notice Board</h1>
          </motion.div>
          <p className="text-purple-100 text-base sm:text-lg font-medium">Stay updated with important announcements</p>
        </div>
      </motion.header>

      {/* Filters Section */}
      <motion.div 
        className="bg-white shadow-lg rounded-xl mx-4 sm:mx-auto max-w-6xl w-auto sm:w-full -mt-6 z-10 px-5 sm:px-8 py-6 flex flex-col md:flex-row md:items-center gap-4 justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FontAwesomeIcon icon={faSearch} className="text-violet-400" />
          </div>
          <input
            type="text"
            placeholder="Search notices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-3 bg-slate-50 border-none rounded-lg focus:ring-2 focus:ring-violet-500 transition-all duration-200 focus:bg-white shadow-sm"
          />
          {searchTerm && (
            <button 
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              onClick={clearSearch}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="flex items-center text-slate-500 font-medium">
            <FontAwesomeIcon icon={faFilter} className="mr-2 text-violet-500" />
            Filter:
          </span>
          <div className="flex flex-wrap gap-2">
            <motion.button
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${getCategoryStyle("all")}`}
              onClick={() => setFilterCategory("all")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              All
            </motion.button>
            
            {categories.map(category => (
              <motion.button
                key={category}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border-l-4 ${getCategoryStyle(category)}`}
                onClick={() => setFilterCategory(category)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {category}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-md text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mb-6 text-violet-500"
              >
                <FontAwesomeIcon icon={faSpinner} className="text-5xl" />
              </motion.div>
              <p className="text-lg font-medium text-slate-600">Loading notices...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-md text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-lg font-medium text-rose-500 mb-4">{error}</p>
              <motion.button 
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-violet-600 text-white font-medium rounded-lg transition-all hover:bg-violet-700 shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try Again
              </motion.button>
            </motion.div>
          ) : filteredNotices.length === 0 ? (
            <motion.div 
              key="empty"
              className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-md text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-slate-300 mb-6"
              >
                <FontAwesomeIcon icon={faBoxArchive} className="text-6xl" />
              </motion.div>
              <h3 className="text-xl font-medium text-slate-700 mb-2">No notices found</h3>
              {searchTerm && <p className="text-slate-500">Try adjusting your search terms</p>}
              {filterCategory !== "all" && <p className="text-slate-500">Try changing your category filter</p>}
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-4 text-slate-500 text-sm">
                <p>Showing {filteredNotices.length} {filteredNotices.length === 1 ? 'notice' : 'notices'}</p>
              </div>
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.07
                    }
                  }
                }}
              >
                {filteredNotices.map((notice, index) => (
                  <motion.div
                    key={notice.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    transition={{ 
                      duration: 0.4,
                      delay: index * 0.05 
                    }}
                    whileHover={{ 
                      y: -5, 
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)", 
                      transition: { duration: 0.2 } 
                    }}
                    className="bg-white rounded-xl overflow-hidden shadow-md border border-slate-100"
                  >
                    <div className="p-6">
                      <div className={`inline-block mb-3 px-3 py-1 rounded-full text-xs font-semibold 
                        ${notice.category === "Urgent" ? "bg-rose-100 text-rose-700" : 
                          notice.category === "Academic" ? "bg-indigo-100 text-indigo-700" :
                          notice.category === "Events" ? "bg-emerald-100 text-emerald-700" :
                          "bg-amber-100 text-amber-700"}`}
                      >
                        {notice.category || "General"}
                      </div>
                      <h3 className="text-lg font-bold mb-2 text-slate-800">{notice.title}</h3>
                      <p className="text-slate-600 line-clamp-3">{notice.content}</p>
                      <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-xs text-slate-500">{notice.date || "No date"}</span>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="px-3 py-1 text-sm font-medium text-violet-600 hover:text-violet-700"
                          onClick={() => navigate("/fullnotice/:id")}
                        >
                          Read more
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <motion.footer 
        className="bg-gradient-to-r from-slate-800 to-slate-900 text-slate-300 py-6 mt-8 text-center text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-slate-400">© {new Date().getFullYear()} Notice Board System</p>
          <div className="mt-2 flex justify-center space-x-4">
            <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">Help</a>
            <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">Privacy</a>
            <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">Terms</a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Allnoticepage;