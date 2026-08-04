export function Knowledgeadmin(){

    const details=['A','B','C','D'];
    const sem=["Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
    const year=["1st Year","2nd Year","3rd Year","4th Year",]
    const branch=["CSE","AIDS","Mechenical","Civil"];
    return(

        <>

        <h3 className="fixed z-[99999] bg-[#5c4e4e] text-wrap min-w-[100%] max-h-16 text-black py-2 pl-2 text-xl lg:h-16 ">Assignment Form</h3>

        
       <div className="pt-7 lg:pt-14">
        <form action="#" className=" flex flex-col p-4 lg:p-4 lg:justify-center border-sky-500">

            <div className="flex flex-col lg:justify-center lg:pl-52  lg:pr-52">

            
            <label htmlFor="topic"  className="text-xl pl-2 mt-4">About Topic</label>
            <textarea row="3" clo="50" required  className="p-3  mt-1 rounded-md  bg-[#d1d0d0] resize-none" id="unit" placeholder="Enter Topic"  />

           


            <label htmlFor="section" className="text-xl pl-2 mt-4">Select Section</label>
            <select name="" id="section"  required  className="p-3  mt-1 rounded-md bor bg-[#d1d0d0]" >
                {details.map((e)=>{
                    return( <option value="A" >{e}</option>)
                })
}
               
               
            </select>

            <label htmlFor="SelectSem" className="text-xl pl-2 mt-4 ">Select Semester</label>
            <select name="" id="SelectSem" className="p-3  mt-1 rounded-md bor bg-[#d1d0d0]"  required >
            {
            sem.map((e)=>{
                    return( <option value={e} >{e}</option>)
                })
            }
            </select>

            <label htmlFor="Year" className="text-xl pl-2 mt-4">Select Year</label>
            <select name="" id="Year" className="p-3  mt-1 rounded-md bor bg-[#d1d0d0]"  required >
            {
            year.map((e)=>{
                    return( <option value={e} >{e}</option>)
                })
            }
              

            </select>

            <label htmlFor="Department" className="text-xl pl-2 mt-4">Select Department</label>
            <select name="" id="Department" className="p-3  mt-1 rounded-md bor bg-[#d1d0d0]"  required >

            {
           branch.map((e)=>{
                    return( <option value={e} >{e}</option>)
                })
            }



             


            </select>

            <input type="file" required className="p-3  mt-2 rounded-md" />

            <button className="bg-[#5c4e4e] text-wrap text-black min-w-[50px] justify-center "> Assignment Upload</button>
</div>
          
        </form>
       </div>



        </>
   
    )
}