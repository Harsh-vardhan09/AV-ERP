const { uploadoncloud } = require('../config/cloudnary.js');
const Assignment = require('../models/assignment.js');
const { User } = require('../models/user.js');

exports.createAssignment = async (req, res) => {
  try {
    const { title, description, subject, dueDate, teacherid, section,semester } = req.body;
    const photo = req.file; 
  if(!title){
    return res.status(404).json({
      success: false,           
      message: 'title not found',
    });
  }
  console.log(dueDate)
                 
    const teacherdetails = await User.findById(teacherid);
    if (!teacherdetails) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    // const [year, month, day] = dueDate.split('-');
    // const formattedDueDate = new Date(`${day}-${month}-${year}`);
// console.log(formattedDueDate)
    let uploadedFileUrl = null;
    if (photo) {
      const uploadedFile = await uploadoncloud(photo.path);
      uploadedFileUrl = uploadedFile.url; // Save the URL from Cloudinary
    }

    const newAssignment = new Assignment({
      title, 
      description,
      section,
      subject,
      dueDate: dueDate,  
      teacherid,
      semester,
      teacherName: teacherdetails.name,
      teacherEmail: teacherdetails.email,
      photo: uploadedFileUrl,
      schoolId: req.schoolId,  // SECURITY: multi-tenancy stamp
    });

    await newAssignment.save();

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment: newAssignment,
      teacherdetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to create assignment',
      error: error.message,
    });
  }
};












exports.getassignmentteacher=async(req, res, next) => {
  try {
    const teacherid = req.params.teacherid;
    // SECURITY: scope to current school
    const teacherassignments = await Assignment.find({ teacherid, schoolId: req.schoolId });
    res.status(200).json({
      success: true,
      message: 'Assignments fetched successfully',
      teacherassignments,
    });
  } catch (error) {
    // Send an error response if something goes wrong
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch assignments',
      error: error.message,
    });
  }
}




exports.getassignmentbyid = async (req, res, next) => {
  try {
    const { assignmentid } = req.params;
    // SECURITY: scope to current school
    const assignment = await Assignment.findOne({ _id: assignmentid, schoolId: req.schoolId });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Assignment fetched successfully',
      assignment,
    }); 

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignment ID',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch assignment',
      error: error.message,
    });
  }
};




exports.getassignmentbysubject =async(req, res, next)=>{
  try {
    const subject = req.params.subject;
    const section = req.params.section;
    const semester = req.params.semester;

    // SECURITY: scope to current school
    const assignments = await Assignment.find({section,subject,semester, schoolId: req.schoolId });
    res.status(200).json({
      success: true,
      message: 'Assignments fetched successfully',
      assignments,
    });
  } catch (error) {
    // Send an error response if something goes wrong
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch assignments',
      error: error.message,
    });
  }
}











exports.Allsubjects = async (req, res, next) => {
  try {
    const { section, semester } = req.params;

    // Validate section and semester
    if (!section || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Section and semester are required',
      });
    }

    // SECURITY: scope to current school
    const uniqueSubjects = await Assignment.distinct('subject', { section, semester, schoolId: req.schoolId });
    
    // Count total assignments
    const totalassignment = await Assignment.countDocuments({ section, semester, schoolId: req.schoolId });

    // Map to get detailed subject data
    const subjectDataPromises = uniqueSubjects.map(async (subject) => {
      // SECURITY: scope to current school
      const assignments = await Assignment.find({ subject, section, semester, schoolId: req.schoolId });
      const allCount = assignments.length;

      // Calculate new and expired counts
      const newCount = assignments.filter(a => !a.isExpired && a.dueDate > new Date()).length;
      const expiredCount = allCount - newCount;

      return {
        name: subject,
        allCount,
        newCount,
        expiredCount,
      };
    });

    // Wait for all promises to resolve
    const uniqueSubjectsData = await Promise.all(subjectDataPromises);

    // Send success response
    res.status(200).json({
      success: true,
      message: 'Subjects fetched successfully',
      uniqueSubjects: uniqueSubjectsData,
      totalassignment,
    });
  } catch (error) {
    // Send error response
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch subjects',
      error: error.message,
    });
  }
};







exports.getExpiredAssignmentById = async (req, res, next) => {
  try {
    const { subject, section } = req.params;
    // SECURITY: scope to current school
    const assignments1 = await Assignment.find({ subject, section, schoolId: req.schoolId });

    const assignments = assignments1.filter(assignment => assignment.dueDate < new Date());

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No non-expired assignments found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Non-expired assignments fetched successfully',
      assignments,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid input parameters',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch non-expired assignments',
      error: error.message,
    });
  }
};







exports.getNotExpiredAssignmentById = async (req, res, next) => {
  try {
    const { subject, section } = req.params;
    // SECURITY: scope to current school
    const assignments1 = await Assignment.find({ subject, section, schoolId: req.schoolId });
    const assignments = assignments1.filter(assignment => assignment.dueDate > new Date());

    if (assignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No non-expired assignments found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Non-expired assignments fetched successfully',
      assignments,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid input parameters',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch non-expired assignments',
      error: error.message,
    });
  }
};

