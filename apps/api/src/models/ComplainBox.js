const mongoose = require('mongoose');
// const { comments } = require('moongose/models');

const item = new mongoose.Schema({
    scholar_no:{
        type:String,
        // unique:true
    }
    ,
    comments:{
        type:String,
    },
    status:{
        type:String,
        enum:["accepted","rejected","pending"]
    }
})
const complainBox = new mongoose.Schema({
complainBy:{
    type:String,
    required:true
},
category:{
type:String,
required:true
},

description:{
type:String,
required:true,
},

suggestion:{
type:String, 
 },

status:{
 type:String,
 enum:["pending","rejected","resolved"],
 required:[true,"please specify the status"]
},

acceptedby:[{
    type:item
}]

},{timestamps:true})

module.exports = mongoose.model("complainbox",complainBox);