const mongoose=require("mongoose");
const images=new mongoose.Schema({
    file:{
        type:String,
        required:true
    }
});
const img=mongoose.model("img",images);
module.exports=img; 