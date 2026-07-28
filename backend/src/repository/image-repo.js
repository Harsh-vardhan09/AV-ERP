const img=require("../models/image");
class IMAGE{
    async create(file){
        try{
            console.log("file inside image repo : ",file);
           const  filedata={file:file};
            const image=await img.create(filedata);
            return image;
        }
        catch(error){
            console.log("error is : ",error);
        }
        
    }
}
module.exports=IMAGE;