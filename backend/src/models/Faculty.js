const mongoose=require("mongoose");
const faculty=new mongoose.Schema({
    name:{
        type:String,
        // required:true
    },
    number:{
        type:String,
        // required:true
    }
});
const facultyinfo=mongoose.model("facultyinfo",faculty);
module.exports=facultyinfo;