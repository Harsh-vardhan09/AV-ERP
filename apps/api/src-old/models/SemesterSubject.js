const mongoose = require('mongoose');
// mongoose.connect("mongodb://localhost:27017/SubjectSemesterWise")
const semesterSubject = new mongoose.Schema({
 subjectName:{
    type:String,
    required:true,
 }
 ,
 subjectCode:{
    type:String,
    required:true,
 },
 semester:{
    type:String,
    required:true

 },
 teacher:[
   { type:String,
    required:true}
 ]
})
module.exports = mongoose.model("SemesterSubject",semesterSubject);
