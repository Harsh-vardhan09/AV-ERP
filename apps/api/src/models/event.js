const mongoose=require("mongoose");

const EVENT=new mongoose.Schema({
image:{
        type:mongoose.Schema.ObjectId,
        ref:"img",
    },
title:{
    type:String,
    required:true
},
date:{
    type:String,
},
description:{
    type:String
},
student:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"studentinfo",
}],
faculty:[{
    type:mongoose.Schema.Types.ObjectId,
    ref:"facultyinfo",
}]
 
},{timestamps:true});
const event=mongoose.model("event",EVENT);
module.exports=event;