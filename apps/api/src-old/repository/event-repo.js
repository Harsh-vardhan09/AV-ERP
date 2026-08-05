const event=require("../models/event");
const studentinfo=require("../models/Student");
class EVENTRepo{

    // create event 
    async create({title,description,date}){
        try {
             const newEvent = await event.create({ title,description,date });
              return newEvent;
        }
        catch(error){
        console.log("error occured in create - ",error);
        }
    }

    //update an event....
    async update(id,eventDetail){
        try {
            const newEvent =await event.findByIdAndUpdate(id,eventDetail);
            newEvent.save();
            return newEvent;
        }
        catch(error){
            console.log("error occured in update- ",error);
        }
    }

    //Remove an event .......

    async remove(id){
        try {
            const deletedEvent =await event.findByIdAndDelete(id);
            return deletedEvent;
        }
        catch(error){
            console.log("error occured in deletion - ",error); 
        }
    }

    // get specific  event.... ..

    async get(id){
        try {
            const Event =await event.findById(id).populate({path:"student", strictPopulate: false}).populate("faculty").populate("image").exec();
            return Event;
        }
        catch(error){
           console.log("error occured in fetchung specific event --" ,error); 
        }
    }

    // GET all event ...........

    async getAll(){
        try {
            const AllEvents =await event.find().populate({path:"student", strictPopulate: false}).populate("faculty").populate("image").exec();
            // const student=await studentinfo.findById();
            // console.log("student : ",student);
            return AllEvents;
        }
        catch(error){
          console.log("error occured in getting all events ",error);  
        }
    }
}
module.exports=EVENTRepo;