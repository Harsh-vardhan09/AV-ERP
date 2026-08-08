import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoSettingsOutline } from "react-icons/io5";
import { RxEnterFullScreen } from "react-icons/rx";
import { IoIosUnlock } from "react-icons/io";
function KahootWaitMember(){
    return(
        <>
        <div className="relative h-screen bg-[url('https://png.pngtree.com/background/20230403/original/pngtree-forest-beautiful-cartoon-background-picture-image_2273538.jpg')] bg-cover bg-center">
           <div className=" p-4">
            <div className=" inline-block space-y-3 sm:flex sm:justify-between sm:items-center space-x-4">
            <div className=" bg-white p-3 text-xl font-semibold rounded-sm">Join at www.kharbooj.it </div>
            <div  className="bg-white p-2 rounded-sm">
                <h2 className=" ">Game Pin :</h2>
                <h2 className="text-xl font-semibold ">123456</h2>
            </div>
            <div  className=" bg-white rounded-sm">
            <img src="" alt="logo" />
            </div>
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
    );
}
export default KahootWaitMember;