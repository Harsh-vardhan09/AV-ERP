import React from 'react';
import { IoReorderThreeOutline } from "react-icons/io5";
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '@shared/lib/store/sidebarSlice';
import '@app/App.css'
const Threeline = () => {
  const dispatch = useDispatch();

  const handleSidebarToggle = () => {
    dispatch(toggleSidebar());
  };

  return (
    <div className="fixed top-0 left-0  z-50">
      <div onClick={handleSidebarToggle} className="font-bold pt-3 text-5xl cursor-pointer">
        <IoReorderThreeOutline />
      </div>
    </div>
  );
}

export default Threeline;
