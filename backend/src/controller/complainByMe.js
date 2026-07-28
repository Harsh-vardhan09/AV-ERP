const complainBox = require("../models/ComplainBox");
async function complainByMe(req,res){
    try {
        const {id} = req.params; 
        const complaints = await complainBox.find({complainBy:id
        });
        res.status(201).send(complaints);
    } catch (error) {
        console.error("Error retrieving complaints for student:", error);
    }
}

module.exports = complainByMe;