  import React from 'react';
  import { FaBell } from "react-icons/fa";
  import { useDispatch, useSelector } from 'react-redux';
  import {togglenotice} from '../../../redux/reducers/sidebarslice'
  import { CiCircleRemove } from "react-icons/ci";
  const Notice = () => {
    const dispatch=useDispatch();
    const shownotices=useSelector((store)=>store.sidebar.isnoticeopen)
    const notices = [
      { id: 1, title: "Exam Schedule Released", priority: "Urgent", date: "12th Sept 2024" },
      { id: 2, title: "Upcoming Coding Contest", priority: "Event", date: "15th Sept 2024" },
      { id: 3, title: "Campus Closed on 18th", priority: "Notice", date: "11th Sept 2024" },
      { id: 4, title: "Library System Update", priority: "Notice", date: "13th Sept 2024" },
      { id: 5, title: "New Assignment Due", priority: "Urgent", date: "14th Sept 2024" },
      { id: 6, title: "Workshop on AI", priority: "Event", date: "20th Sept 2024" },
    ];
    return ( 
      <div className="bg-white  rounded-lg shadow-lg block p-4 w-full max-w-lg lg:h-[400px] h-[600px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-blue-600 flex items-center gap-2">
            <FaBell className="text-3xl" /> Important Notices
          </h2>
          <span  className="text-sm text-gray-500">New Updates</span>
          <button onClick={()=>dispatch(togglenotice())}> <CiCircleRemove />
          </button>
        </div>

        {/* Scrollable Notice List */}
        <div className="space-y-3 lg:h-[300px] h-[500px] w-full overflow-y-auto pr-2 hide-scrollbar">
          {notices.map(notice => (
            <div
              key={notice.id}
              className="p-3 border-l-4 bg-gray-100 rounded-md flex justify-between items-center transition hover:shadow-md cursor-pointer"
              style={{ borderColor: notice.priority === "Urgent" ? "red" : "blue" }}
            >
              <div>
                <h3 className="font-semibold text-lg text-black">{notice.title}</h3>
                <p className="text-sm text-gray-600">{notice.date}</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded ${notice.priority === "Urgent" ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}>
                {notice.priority}
              </span>
            </div>
          ))}
        </div>

        {/* Hide Scrollbar */}
        <style jsx>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none; /* IE and Edge */
            scrollbar-width: none; /* Firefox */
          }
        `}</style>
      </div>
    );
  };

  export default Notice;
