// const express=require("express");
const EVENTRepo=require("../repository/event-repo");
const STUDENT=require("../repository/student-repo");
const FACULTY=require("../repository/faculty-repo");
const IMAGE=require("../repository/image-repo");
// const leave_controller=require("./src/controller/leave_controller");
// const bodyParser = require("body-parser");
// const {upload}=require("./src/middlewares/upload");
// const cors = require('cors');
const EVENT=new EVENTRepo();
const facultY= new FACULTY();
const studenT=new STUDENT();
const Image=new IMAGE();

const createEvent= async (req,res)=>
        {
         try{
             const event = {
                 isMainEvent: req.body.isMainEvent,
                 title: req.body.title,
                 date: req.body.date,
                 description: req.body.description,
                 coordinatorType: req.body.coordinatorType,
                 facultyContact: req.body.facultyContact,
                 facultyCoordinator: req.body.facultyCoordinator,
                 studentContact: req.body.studentContact,
                 studentCoordinator: req.body.studentCoordinator,
                 image: req.file ? req.file.filename : null, 
               };
               const { title, date, description, facultyCoordinator, facultyContact, studentCoordinator, studentContact } = event;

               const events= await EVENT.create({ title,description,date});
               const file= req.file ? req.file.filename : null;
               const images=await Image.create(file);
               events.image=images;


             const formattedFacultyArray = facultyCoordinator.map((faculty,index )=> ({
                 name: faculty,  
                 number:facultyContact[index], 
                 
             }));


             const facultyPromises = formattedFacultyArray.map(async (detail) => {
                 return await facultY.create(detail.name,detail.number);
             });
             const facultyRecords = await Promise.all(facultyPromises);
             events.faculty.push(...facultyRecords);
         

             const formattedstudentArray = studentCoordinator.map((student,index )=> ({
                 name: student,  
                 number:studentContact[index], 
              
             }));



             const studentPromises = formattedstudentArray.map(async (detail) => {
                 return await studenT.create(detail.name, detail.number);
             });
             const studentRecords = await Promise.all(studentPromises);
             events.student.push(...studentRecords);
         
          
            
           await events.save();
            return res.status(201).json({
                success:true,
                insertedEvent:events,
            });
         }
         catch(error)
         {
             console.log("error in index.js creation ",error);
         }

        };

const deleteEvent=async(req,res)=>{
    try{
        const id =req.params.id;
        const events= await EVENT.remove(id);
        return res.status(201).json({
            success:true,
            deletedEvent:events,
        });
    }catch(error){
        console.log("error in deleting event : ",error);
    }
} ;


const editEvent=async(req,res)=>
    {
        try {
            const data =req.body;
            const id =req.params.id;
            const events= await EVENT.update(id,data);
            return res.status(201).json({
             success:true,
             updatedData:events,
    
                         });
            }
        catch(error){
            console.log("error in edit event : ",error);
        }
    };



    const getEvents=async(req,res)=>{
        try{
            const events= await EVENT.getAll();
            return res.status(201).json({
            success:true,
            events:events,
            });
        }catch(error){
            console.log("error inside getevents : ",error);
        }
    };
    
    const getoneEvent=async(req,res)=>{
        try{  const id=req.params.id;
            const events= await EVENT.get(id);
            return res.status(201).json({
            success:true,
            events:events,});
        }catch(error){
    console.log(error);
        }
    }
module.exports={
    createEvent,
    deleteEvent,
    editEvent,
    getEvents,
    getoneEvent,
}