const complainBox = require("../models/ComplainBox");

async function updateStatus(req,res){
 const {id,status} = req.body;
 try{
  
 const update = await complainBox.findByIdAndUpdate(id,{status:status},{new:true})
 res.status(200).send(update)

 } catch(error){
    res.status(404).send("error while updating data ",error);
 }

} 
module.exports = updateStatus;