const Leave=require("../models/leave");
const { User } = require("../../identity");
const logger = require('../../../core/logging/logger.js');

class LEAVE{
    async create(data){
        try{
            const user = await User.findById(data.userid);
            logger.debug(user);
            logger.debug("inside leave repo :",data);
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
            logger.debug(error);
        }
    }
    async delete(id){
        try{
            const leave=await Leave.findByIdAndDelete(id);
            return leave;
        }
        catch(error){
             logger.debug(error);
        }
       
    }

    async getAll(schoolId){
        try{
     const data =await Leave.find({ schoolId });
     return data ;
        }
        catch(error){
            logger.debug("error in leave repo getAll : ",error);
        }
    }
    async getone(id){
        try{
            const data = await Leave.findById(id);
            return data ;
        }
        catch(error){
            logger.debug("error in leave repo getOne : ",error);
        }
    }
    // async showpdf(name){

};
module.exports=LEAVE;