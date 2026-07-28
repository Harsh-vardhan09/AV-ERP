const complainBox = require("../models/ComplainBox");
const { User } = require("../models/user");
async function soloComplain(req,res){
console.log(req.body)
    if(!req.body){
        res.status(404).send("please provide data ");
    }
 const {complainBy,category,description,status,suggestion,sentto} = req.body;
 const {id} = req.params; 
 if(!id){
    res.status(404).send("bad request")
 }

 const complain = await complainBox.create({
   complainBy:id,
    category,
    description,
    suggestion,
    status,
    sentto
 });
  
 res.status(200).json(complain)
}

async function multiAllComplain(req,res){
const {info} = req.query
const {id} = req.params; 
const result = JSON.parse(info)
const {complainBy,category,description,status,suggestion} = req.body;
const students = await User.find({semester:result.semester,section:result.section});
const sentto = students.map((e)=>{return {scholar_no:e.scholar_no,comments:"",status:"pending"}})
const complain = await complainBox.create({
    complainBy:id,
    category,
    description,
    suggestion,
    status,
    acceptedby:sentto
 });
return res.json({
    message:complain
})
}
 
async function multiSelectedComplain(req,res){
    const {info} = req.query
    const result = JSON.parse(info)
    const {id} = req.params; 
    const {category,description,status,suggestion,selectedStudents} = req.body;
    const students =[]
    for(let i in selectedStudents){
       let values = await User.findOne({scholar_no:selectedStudents[i]})
       if(values){
     students.push(values);}
    }
   
    const validateStudents = students.every((e)=>{
       return e.semester==result.semester && e.section==result.section;
    })
    
    if(students.length===0||!validateStudents){
       return res.status(404).json({message:"Please enter valid students"});
    }
    
    const sentto = selectedStudents.map((e)=>{  
    return {scholar_no:e,comments:"",status:"pending"}})
    const complain = await complainBox.create({
        complainBy:id,
        category,
        description,
        suggestion,
        status,
        acceptedby:sentto
     });
          
    return res.status(200).json(complain)

}
module.exports = {soloComplain,multiAllComplain,multiSelectedComplain};