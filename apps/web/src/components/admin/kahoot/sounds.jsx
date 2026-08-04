import { HiMiniSpeakerWave } from "react-icons/hi2";
import { IoSettingsOutline } from "react-icons/io5";
import { RxEnterFullScreen } from "react-icons/rx";
function Soundscreen(){
    <>
    <div className="flex space-x-5 bg-black p-2 min-w-16  rounded-md">
        
          <HiMiniSpeakerWave size={20} color="white" />
          <IoSettingsOutline size={20} color="white" />
          <RxEnterFullScreen size={20} color="white" />
        </div>
    </>

}
export default Soundscreen;