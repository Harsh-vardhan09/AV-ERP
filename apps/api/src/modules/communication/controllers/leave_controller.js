const LEAVE=require("../repositories/leave-repo");
const leave= new LEAVE();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require("path");
const { User } = require("../../identity");
const logger = require('../../../core/logging/logger.js');
const createLeave=async(data)=>{
const Leave=await leave.create(data);
return (Leave);
};

const deleteLeave=async(req,res)=>{
    try{
        const id=req.params.id;
        const leave=await LEAVE.delete(id);
        return res.status(200).json({
            success:true,
        });
    }
    catch(error){
return res.json({
    success:false,
    message:"Something went wrong ",
})
    }
};



const createPDF=async(req,res) => {
    try{
    const {S_date,E_date,subject,To,Body}=req.body;
    const {id} = req.params;
    const userid=id;
    
        const user=await User.findById(userid);
    
    const department="Computer Science Engineering";
    const enrollment= user?.rollno;
    const college="Prestige Institute of Engineering Management & Research, Indore.";
    const name=user?.firstName;
    const section=user.academicDetails.section;
    const doc = new PDFDocument();
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const filename=enrollment+`${hours}${minutes}${seconds}`;

    const outputPath = path.join(`public/uploads/${filename}.pdf`);   /////important line for creating file.......  

doc.pipe(fs.createWriteStream(outputPath));

doc.fontSize(25).text('Leave Application', { align: 'center', underline: true });
doc.moveDown(2);

doc.fontSize(18).text(`To,`, { align:'left'});
doc.text(`The ${To},`);
doc.text(`${department},`);
doc.text(`${college}`);
doc.text(`Date: ${new Date().toLocaleDateString()}`);
doc.moveDown(1);

doc.text(`Subject: Application for ${subject}.`);
doc.moveDown(1);

doc.text(`Dear Sir/Madam,`, { align: 'left' });
doc.moveDown(1);
// doc.text(`Most respectfully, I beg to state that I am not in a condition to come to school since I am suffering from illness. I have been prescribed rest by my family doctor for at least ${Math.floor(

doc.text(`${Body}`,{indent:40});
doc.moveDown(2);


doc.text('Thanking you,', { align: 'left' });
doc.moveDown(1);
doc.text('Yours obediently,');
doc.text(`Name : ${name}`);
doc.text(`Section : ${section}`);
doc.text(`Enroll No.: ${enrollment}`);


doc.end();

// / save the data of the leave application into database ........
   const file=`${filename}.pdf`;
  logger.debug(file);
const data={S_date,E_date,subject,userid,file,To,schoolId:req.schoolId};
const Leave=await leave.create(data);
if(req.file){
    Leave.file.push(req.file.filename);
    Leave.save();
}
   return  res.json({pdfpath:`http://localhost:4000/uploads/${file}`,
    body:Body,
    data:Leave
   });}
   catch(error){
    logger.debug("error in create pdf function : ",error);
   }
  };
  
const getApplication=async(req,res)=>{
    try{
        logger.debug("inside getapplication");
        const data= await leave.getAll(req.schoolId);
        return res.json({
            success:true,
            data:data
        });
    }
    catch(error){
logger.debug("error in leave_controller : ",error);
    }
}

const getOneApplication=async(req,res)=>{

    try{
        // TODO: id is never declared — getOneApplication always throws
        // TODO: almost certainly meant req.params.id
        // eslint-disable-next-line no-undef
        const data=await leave.getone(id);
        return res.json({
        success:true,
        data:data
        });
    }
    catch(error){
        logger.debug("error in leave controller : getoneapplication : ",error );
    }
}
module.exports={
    createLeave,
    deleteLeave,
    createPDF,
    getApplication,
    getOneApplication
}