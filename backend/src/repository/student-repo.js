const studentinfo=require("../models/Student");
class STUDENT{
    async create(name,number){
        try {

            const student= await studentinfo.create({name,number});
            console.log("student : ",student);
            return student;
        }catch(error){
            console.log("error :: ",error);
        }
    }
};
module.exports=STUDENT;