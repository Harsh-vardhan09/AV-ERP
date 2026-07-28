const complains = require("../models/ComplainBox");

module.exports = async function(req,res){
     const allComplains = await complains.find({});
     if(!allComplains)res.status(200).json({message:"no complains"});

     res.status(200).send(allComplains)
}