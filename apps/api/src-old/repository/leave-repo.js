const Leave=require("../models/leave");
const { User } = require("../../src/modules/identity");

class LEAVE{
    async create(data){
        try{
            const user = await User.findById(data.userid);
            console.log(user);
            console.log("inside leave repo :",data);
            const LeaveData={
                S_date:data.S_date,
                E_date:data.E_date,
                name:user?.firstName,
                enrollment:user?.rollno,
                subject:data.subject,
                userid:data.userid,
                file:data?.file,
                section:user?.academicDetails.section,
                schoolId: data.schoolId
            }
            const leave=await Leave.create(LeaveData);
            return leave;
        }
        catch(error){
            console.log(error);
        }
    }
    async delete(id){
        try{
            const leave=await Leave.findByIdAndDelete(id);
            return leave;
        }
        catch(error){
             console.log(error);
        }
       
    }

    async getAll(schoolId){
        try{
     const data =await Leave.find({ schoolId });
     return data ;
        }
        catch(error){
            console.log("error in leave repo getAll : ",error);
        }
    }
    async getone(id){
        try{
            const data = await Leave.findById(id);
            return data ;
        }
        catch(error){
            console.log("error in leave repo getOne : ",error);
        }
    }
    // async showpdf(name){
    //     try {

    //     }
    //     catch(error){
    //         console.log("error inside showpdf  : ",error);
    //     }
    // }
};
module.exports=LEAVE;