const complainBox = require("../models/ComplainBox");

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

module.exports = addSuggestion;