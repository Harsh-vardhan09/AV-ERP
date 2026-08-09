import { TbPentagon } from 'react-icons/tb';
import { FaRegCircle } from 'react-icons/fa';
import { FiSquare } from 'react-icons/fi';
import { LuHexagon } from 'react-icons/lu';
import { RxCross2 } from 'react-icons/rx';
import { useNavigate } from 'react-router';

function Kahootquize() {
  const navigate = useNavigate();
  const routehandle = () => {
    navigate('/quizscore');
  };
  return (
    <>
      <div className="relative min-h-screen bg-[url('https://png.pngtree.com/background/20230403/original/pngtree-forest-beautiful-cartoon-background-picture-image_2273538.jpg')] bg-cover bg-center">
        <div className="flex justify-end p-4 ">
          <button
            onClick={routehandle}
            className="bg-white text-xl font-bold p-2 border-b-4 rounded-md border-gray-400"
          >
            Next
          </button>
        </div>
        <div className="flex justify-center ">
          <h2 className="bg-white p-3 text-xl font-bold">What does "API" stand for</h2>
        </div>

        <div className="flex justify-around  mt-[20%]  ">
          <div className=" flex items-center space-x-5  p-1 bg-red-600 rounded-md">
            <h2>
              <TbPentagon />
            </h2>
            <h2>1</h2>
          </div>
          <div className=" flex items-center   space-x-5 p-1 bg-blue-600 rounded-md">
            <h2>
              <FaRegCircle />
            </h2>
            <h2>1</h2>
          </div>
          <div className=" flex items-center  space-x-5 p-1 bg-green-400 rounded-md">
            <h2>
              {' '}
              <FiSquare />
            </h2>
            <h2>1</h2>
          </div>
          <div className=" flex items-center space-x-5  p-1 bg-yellow-400 rounded-md">
            <h2>
              <LuHexagon />
            </h2>
            <h2>1</h2>
          </div>
        </div>
        <div className=" flex  relative justify-center items-end  m-20 sm:flex-row max-h-96 ">
          <div className=" flex   justify-center flex-col mx-auto sm:flex-row h-[100%] w-[90vw] ">
            <div className=" sm:w-[50%] flex flex-col items-center ">
              <div className="bg-red-600 flex  items-center m-2 justify-between sm:w-[50%] p-5 w-[95vw] ">
                <div className="text-white flex items-center space-x-1">
                  <h2>
                    <TbPentagon />
                  </h2>
                  <h2>Application Programming interface</h2>
                </div>
                <div className="">
                  <h2>
                    <RxCross2 />
                  </h2>
                </div>
              </div>

              <div className="bg-green-600 flex items-center m-2 justify-between  sm:w-[50%] p-5 w-[95vw] ">
                <div className="text-white flex items-center space-x-1">
                  <h2>
                    <TbPentagon />
                  </h2>
                  <h2>Application Programming interface</h2>
                </div>
                <div className="">
                  <h2>
                    <RxCross2 />
                  </h2>
                </div>
              </div>
            </div>
            <div className=" sm:w-[50%] flex flex-col items-center">
              <div className="bg-blue-600 flex items-center m-2 justify-between  sm:w-[50%] p-5 w-[95vw] ">
                <div className="text-white flex items-center space-x-1">
                  <h2>
                    <TbPentagon />
                  </h2>
                  <h2>Application Programming interface</h2>
                </div>
                <div className="">
                  <h2>
                    <RxCross2 />
                  </h2>
                </div>
              </div>

              <div className="bg-yellow-400 flex items-center justify-between  sm:w-[50%] m-2 p-5 w-[95vw] ">
                <div className="text-white flex items-center space-x-1">
                  <h2>
                    <TbPentagon />
                  </h2>
                  <h2>Application Programming interface</h2>
                </div>
                <div className="">
                  <h2>
                    <RxCross2 />
                  </h2>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export default Kahootquize;
