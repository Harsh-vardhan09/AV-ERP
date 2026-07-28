import { IoIosUnlock } from "react-icons/io";
import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoSettingsOutline } from "react-icons/io5";
import { RxEnterFullScreen } from "react-icons/rx";
import { useNavigate } from "react-router";



function Kahootscore()
{
    const naviagte=useNavigate();
    const routehandler=()=>{
        naviagte('/quizwinner')
    }
    return(
        <>
        <div className="relative h-screen bg-[url('https://png.pngtree.com/background/20230403/original/pngtree-forest-beautiful-cartoon-background-picture-image_2273538.jpg')] bg-no-repeat bg-cover bg-center">

        <div className="flex justify-end p-4 ">
            <button onClick={routehandler} className="bg-white text-xl font-bold p-2 border-b-4 rounded-md border-gray-400">Next</button>
        </div>

        <div className="flex justify-center drop-shadow-lg ">
            <h2 className="bg-white text-wrap text-3xl font-semibold p-3 text-center mt-7 rounded-sm ">Scoreboard</h2>

        </div>

        <div className="flex justify-center">

        <div className="flex justify-between pl-6 pr-6 p-2 w-[70%] text-3xl mt-[20%] bg-white rounded-md flex-wrap drop-shadow-lg">
          
            <h2 className="">Devendra</h2>
            <h2>30</h2>
        </div>

        </div>


        <div className="flex absolute justify-between  bottom-0 w-[100vw] bg-black text-white p-3  opacity-75  ">
            <div className="pl-2">
                <h2>
                    2/3
                </h2>
            </div>



            <div className="flex items-center space-x-2">
            <IoIosUnlock />
           
           <h2>
           <a className="text-xl font-bold" href="">Kharbooj.it</a> Game pin : 234567</h2>
              
                
            </div>

            <div className="  flex-row  ">
            <div className="flex space-x-4  rounded-md pr-3 ">
          <HiMiniSpeakerWave size={20} color="white" />
          <IoSettingsOutline size={20} color="white" />
          <RxEnterFullScreen size={20} color="white" />
        </div>
            </div>


        </div>



       



        </div>
        </>
    )
}
export default Kahootscore;