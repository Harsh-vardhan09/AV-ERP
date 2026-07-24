import React from 'react';
import CountUp from 'react-countup';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';

const Infocontainer = ({ Name, count, icon: Icon, description, color, textcolor, onClick }) => {
  const isSidebarOpen = useSelector((state) => state.sidebar.isSidebarOpen);

  const containerClass = `h-44 w-60 bg-white ml-8 relative rounded-lg flex flex-col justify-end shadow-xl overflow-hidden text-gray-800 cursor-pointer`;
  
  return (
    isSidebarOpen ? (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        whileHover={{ scale: 1.05, boxShadow: "0px 0px 10px rgba(0,0,0,0.15)" }}
        className={containerClass}
        onClick={onClick}
      >
        <div className='mb-7 relative'>
          <p className={`ml-6 mb-2 ${textcolor} font-bold text-4xl`}>
            <CountUp start={0} end={count} duration={2} />
          </p>
          <p className='text-black font-bold ml-7'>{Name}</p>
          <Icon className={`text-4xl ml-44 mt-[-50px] absolute ${textcolor}`} />
        </div>
        <div className={`w-full h-16 ${color} text-white font-medium`}>
          <div className='ml-3 mt-2'>
            {description}
          </div>
        </div>
      </motion.div>
    ) : (
      <div
        className={containerClass}
        onClick={onClick}
      >
        <div className='mb-7 relative'>
          <p className={`ml-6 mb-2 ${textcolor} font-bold text-4xl`}>
            <CountUp start={0} end={count} duration={2} />
          </p>
          <p className='text-black font-bold ml-7'>{Name}</p>
          <Icon className={`text-4xl ml-44 mt-[-50px] absolute ${textcolor}`} />
        </div>
        <div className={`w-full h-16 ${color} text-white font-medium`}>
          <div className='ml-3 mt-2'>
            {description}
          </div>
        </div>
      </div>
    )
  );
}

export default Infocontainer;
