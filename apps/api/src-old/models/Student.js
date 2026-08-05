const mongoose=require('mongoose');
const student=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    number:{
        type:String,
        required:true
    }
});
const studentinfo=mongoose.model("studentinfo",student);
module.exports=studentinfo;