const { uploadoncloud } = require("../../src/core/config/storage.js");
const knowledgecenter = require("../models/knowledgecenter");
const { User } = require("../../src/modules/identity");

// exports.addknowledgecenter=async (req,res)=>{
//    const {title,teacherid,subject,section,semester } = req.body;
//    const photo= req.file;

// console.log(req.body);
//    const teacher = await User.findById(teacherid);
//    const teachername = teacher.name;
//    console.log(teachername)
//    if (!teacherid || !title || !subject || !section || !semester) {
//     return res.status(400).json({
//         status: 'error',
//         message: 'Missing required fields plese enter the require field ',
//     });
// }
//      const files =await uploadoncloud(photo?.path);
//    try{
//     const notes = new knowledgecenter({
//         title,
//         teacherid,
//         subject,
//         section,
//         semester,
//         teachername,        
//         photo:files?.url,
//        });
//        await notes.save();

//     return res.status(200).json({
//         status: 'success',
//         notes
//        });

//    }            
// catch(err){
//     return res.status(500).json({
//         status: 'error',
//         message: `error to add notes ` + err.message,
        
//     });
// }

            
// }



exports.addknowledgecenter = async (req, res) => {
    const {title, teacherid, subject, section, semester} = req.body;
    const photo = req.file;
 
    console.log(req.body);
    
    try {
        // First check if teacher exists
        const teacher = await User.findById(teacherid);
        if (!teacher) {
            return res.status(404).json({
                status: 'error',
                message: 'Teacher not found with this ID',
            });
        }
        
        console.log("Teacher object:", teacher); // Verbose logging
        
        // Safely access the name property, with fallback
        const teachername = teacher?.name || "Harsh";
        console.log("Teacher name:", teachername);
        
        if (!teacherid || !title || !subject || !section || !semester) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields please enter the required fields',
            });
        }
        
        const files = photo?.path ? await uploadoncloud(photo.path) : null;
        
        const notes = new knowledgecenter({
            title,
            teacherid,
            subject,
            section,
            semester,
            teachername,        
            photo: files?.url || null,
            schoolId: req.schoolId,  // SECURITY: multi-tenancy stamp
        });
        
        await notes.save();
 
        return res.status(200).json({
            status: 'success',
            notes
        });
    } catch(err) {
        console.error("Error in addknowledgecenter:", err);
        return res.status(500).json({
            status: 'error',
            message: `Error adding notes: ${err.message}`,
        });
    }
 }

exports.getknowledgecenters=async (req,res)=>{
    const {section , semester} = req.query;
    // console.log(req.query);
        try{    
        // SECURITY: scope to current school
        const notes = await knowledgecenter.find({section,semester, schoolId: req.schoolId });
        console.log(notes);
        res.status(200).json({  
        status:'success',
        notes
       });
   }
   catch(err){
    res.status(500).json({
        status: 'error',
        message: `error to get notes ` + err.message,
        
    });
   }
}