const studentinfo=require("../../../../src/modules/people/models/Student");
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