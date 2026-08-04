function EventMember() {
    const details = [
      { name: "Himansu", pStatus: "Done" },
      { name: "Harsh Khandelwal", pStatus: "Done" },
      { name: "Devendra", pStatus: "Due" },
      { name: "Harsh", pStatus: "Done" },
    ];
  
    return (
      <>
        {/* Header */}
        <div className="flex justify-center bg-slate-400 h-16 text-black pt-5 text-xl sm:text-2xl">
          <h2>Participants List</h2>
        </div>
  
        {/* Table Header */}
        <div className="flex bg-gray-300 justify-around  text-sm sm:justify-around items-center h-14 mt-5 p-3  sm:text-lg">
          <h3 className="w-24 text-center">Participants Name</h3>
          <h3 className="w-12 text-center">Payment</h3>
          <h3 className="w-12 text-center">Absent</h3>
          <h3 className="w-12 text-center">Present</h3>
        </div>
  
        {/* Participants List */}
        {details.map((e, index) => {
          return (
            <div
              key={index}
              className="flex justify-around items-center bg-slate-500 h-12 mt-3 px-3 text-white  text-sm sm:text-base"
            >
              {/* Name */}
              <div className="w-24 sm:w-32 text-center text-black">
                <h2>{e.name}</h2>
              </div>
  
              {/* Payment Status */}
              <div className="w-12 sm:w-16 text-center  text-black">
                <h2>{e.pStatus}</h2>
              </div>
  
              {/* Absent Radio Button */}
              <div className="w-12 sm:w-16 flex justify-center  text-black">
                <input type="radio" name={`attendance-${e.name}`} className="w-4 h-4" />
              </div>
  
              {/* Present Radio Button */}
              <div className="w-12 sm:w-16 flex justify-center">
                <input type="radio" name={`attendance-${e.name}`} className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </>
    );
  }
  
  export default EventMember;