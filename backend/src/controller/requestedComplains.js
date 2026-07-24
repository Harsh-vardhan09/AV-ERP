const complainBox = require("../models/ComplainBox");

async function complainForYou(req,res){
  
        try {
            const {id:scholarNo} = req.params; 
            const complaints = await complainBox.find({
                acceptedby: { $elemMatch: { scholar_no: scholarNo,status:"pending" } }
            });
            res.status(201).send(complaints);
        } catch (error) {
            console.error("Error retrieving complaints for student:", error);
        }

    
}

module.exports = complainForYou;