const  facultyinfo=require('../models/Faculty');
class FACULTY{
    async create(name,number){
        try {
            const data=await facultyinfo.create({name,number});
            console.log("Faculty : ",data);
            return data;
        }
        catch(error){
            console.log("error : ",error);
        }
        
    }
};
module.exports=FACULTY;