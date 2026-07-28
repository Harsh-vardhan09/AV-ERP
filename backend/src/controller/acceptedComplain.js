const complainBox = require("../models/ComplainBox");

async function acceptedComplain(req,res){

    const {id:scholarNo} = req.params; 
    try {
    const complaints = await complainBox.find({
        acceptedby: { $elemMatch: { scholar_no: scholarNo,status:"accepted" } }
    });
    res.status(201).send(complaints);
} catch (error) {
    console.error("Error retrieving complaints for student:", error);
}
}

module.exports = acceptedComplain 