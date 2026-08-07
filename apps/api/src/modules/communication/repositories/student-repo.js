const studentinfo=require("../../../../src-old/models/Student");  // TEMP: moves to modules/people
const logger = require('../../../core/logging/logger.js');
class STUDENT{
    async create(name,number){
        try {

            const student= await studentinfo.create({name,number});
            logger.debug("student : ",student);
            return student;
        }catch(error){
            logger.debug("error :: ",error);
        }
    }
};
module.exports=STUDENT;