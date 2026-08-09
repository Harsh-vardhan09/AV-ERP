const complainBox = require("../models/ComplainBox");
const { User } = require("../../identity");
const logger = require('../../../core/logging/logger.js');

// getcomplains.js bound the same model to `complains`. Aliased rather than renamed
// so getAllComplains' body stays byte-identical to the file it came from.
const complains = complainBox;
async function soloComplain(req,res){
logger.debug(req.body)
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

async function complainByMe(req,res){
    try {
        const {id} = req.params; 
        const complaints = await complainBox.find({complainBy:id
        });
        res.status(201).send(complaints);
    } catch (error) {
        logger.error("Error retrieving complaints for student:", error);
    }
}

async function getAllComplains(req,res){
     const allComplains = await complains.find({});
     if(!allComplains)res.status(200).json({message:"no complains"});

     res.status(200).send(allComplains)
}

async function acceptedComplain(req,res){

    const {id:scholarNo} = req.params; 
    try {
    const complaints = await complainBox.find({
        acceptedby: { $elemMatch: { scholar_no: scholarNo,status:"accepted" } }
    });
    res.status(201).send(complaints);
} catch (error) {
    logger.error("Error retrieving complaints for student:", error);
}
}

async function complainForYou(req,res){
  
        try {
            const {id:scholarNo} = req.params; 
            const complaints = await complainBox.find({
                acceptedby: { $elemMatch: { scholar_no: scholarNo,status:"pending" } }
            });
            res.status(201).send(complaints);
        } catch (error) {
            logger.error("Error retrieving complaints for student:", error);
        }

    
}

async function updateStatus(req,res){
 const {id,status} = req.body;
 try{
  
 const update = await complainBox.findByIdAndUpdate(id,{status:status},{new:true})
 res.status(200).send(update)

 } catch(error){
    res.status(404).send("error while updating data ",error);
 }

}

async function addSuggestion(req,res){
const {id,suggestion,scholar_no,status} = req.body;
try{
    
if(status===false||status==="false"){

    const complain = await  complainBox.findOneAndUpdate({_id:id,"acceptedby.scholar_no":scholar_no},{"acceptedby.$.status":"rejected"})
    res.send(complain);
}else{
    
const complain = await  complainBox.findOneAndUpdate({_id:id,"acceptedby.scholar_no":scholar_no},{"acceptedby.$.status":"accepted","acceptedby.$.comments":suggestion});
res.send(complain);}

}catch(error){
    res.send(error);
}
}

module.exports = { soloComplain, multiAllComplain, multiSelectedComplain, complainByMe, getAllComplains, acceptedComplain, complainForYou, updateStatus, addSuggestion };
