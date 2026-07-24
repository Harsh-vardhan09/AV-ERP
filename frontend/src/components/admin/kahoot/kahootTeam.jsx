

import { IoMdPerson } from "react-icons/io";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoSettingsOutline } from "react-icons/io5";
import { RxEnterFullScreen } from "react-icons/rx";
import { IoChevronBackOutline, IoChevronForwardSharp } from "react-icons/io5";
import { useNavigate } from "react-router";

function Kahoot() {
  const navigate=useNavigate();
  const members = [
    {
      name: "Himanshu",
      icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcScemJQ4YBfThSIMku1ojUpdE3cFh0O8SbwnQ&s"
    },
    {
      name: "Harsh",
      icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJAnHlTnHUgPx1QhBhU8li1_Lh-MBf7emytw&s"
    },
    {
      name: "Devendra",
      icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4iJps0YMGSeONgniy-XMvj_tauk9qLNegZA&s"
    },
    {
      name: "Devendra",
      icon: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4iJps0YMGSeONgniy-XMvj_tauk9qLNegZA&s"
    }
  ];
    
  const routehandle1 =()=>[
    navigate('/quizquestion')
  ]
  return (
    <div className="relative h-screen bg-[url('https://png.pngtree.com/background/20230403/original/pngtree-forest-beautiful-cartoon-background-picture-image_2273538.jpg')] bg-cover bg-center">
      
      {/* Header Section */}
      <div className="z-10 text-center font-semibold text-black text-2xl bg-gradient-to-r from-cyan-500 to-[#F0CA1D] min-h-28 pt-7">
        <div>
          <h2>Join at www.kharbooj.it with Game PIN:</h2>
        </div>
        <div>
          <h2>123456</h2>
        </div>
      </div>

      {/* Start Button & Lock Icon */}
      <div className="text-right mt-6 mr-6 flex justify-end space-x-3">
        <div className="bg-red text-black rounded-md">
          <button onClick={routehandle1} type="button" className="bg-white h-10 text-center">Start</button>
        </div>

        <div className="h-10 w-10 text-center rounded-md bg-white bg-scroll">
          <i className="fas fa-unlock p-2" style={{ fontSize: '25px', color: 'black' }}></i>
        </div>
      </div>

      {/* Members List Section */}
      <div className="flex justify-center flex-wrap w-full">
        {members.map((member, index) => (
          <div key={index} className="inline-flex justify-between w-max m-3">
            <div className="flex text-wrap">
              <div className="min-w-12 max-w-20">
                <img src={member.icon} alt={member.name} />
              </div>
              <div className="min-w-16 text-white text-xl font-semibold bg-gray-700 p-2 pt-5">
                <h2>{member.name}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Buttons Section */}
      <div className="absolute bottom-0 right-0 mr-5 mb-5 flex flex-row flex-wrap opacity-80">
        
        {/* Navigation Controls */}
        <div className="mr-6 flex space-x-3 bg-black p-2 min-w-16 rounded-md">
          <IoChevronBackOutline size={20} color="white" />
          <IoChevronForwardSharp size={20} color="white" />
        </div>

        {/* Participants Count */}
        <div className="mr-6 flex space-x-5 bg-black p-2 min-w-16 rounded-md">
          <IoMdPerson size={20} color="white" />
          <h2 className="font-bold text-white">21</h2>
        </div>

        {/* Additional Controls */}
        <div className="flex space-x-5 bg-black p-2 min-w-16 rounded-md">
          <HiMiniSpeakerWave size={20} color="white" />
          <IoSettingsOutline size={20} color="white" />
          <RxEnterFullScreen size={20} color="white" />
        </div>
      </div>
    </div>
  );
}

export default Kahoot;
