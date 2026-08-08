// const Assignment = require('../models/assignment');
// const Assignmentupload = require('../models/uploadassignment');
// const { User } = require('../../identity');
// const fs = require('fs');
// const crypto = require('crypto');
// const { uploadoncloud } = require('../../../core/config/storage.js');

const Assignment = require('../models/assignment');
const Assignmentupload = require('../models/uploadassignment');
const { User } = require('../../identity');
const fs = require('fs');
const crypto = require('crypto');
const { uploadoncloud } = require('../../../core/config/storage.js');
const pdfParse = require('pdf-parse'); // Import pdfParse for metadata extraction

exports.uploadassignment = async (req, res, next) => {
  const { assignmentid, studentid } = req.params;
  const photo = req.file;

  try {
    // SECURITY: scope assignment lookup to current school
    const assignment = await Assignment.findOne({ _id: assignmentid, schoolId: req.schoolId });
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found',
      });
    }

    const todayDate = new Date();
    if (todayDate > assignment.dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot upload assignment after due date',
      });
    }

    const studentdetails = await User.findById(studentid);
    if (!studentdetails) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const teacherdetails = await User.findById(assignment.teacherid);
    if (!teacherdetails) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found',
      });
    }

    if (!photo || !fs.existsSync(photo.path)) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or file path is invalid',
      });
    }

    // Upload file to Cloudinary
    const uploadedFile = await uploadoncloud(photo.path);
    if (!uploadedFile) {
      return res.status(500).json({
        success: false,
        message: 'Error uploading file to Cloudinary',
      });
    }

    // Generate file hash to detect duplicates
    const fileHash = generateFileHash(photo.path);
    const existingUpload = await Assignmentupload.findOne({
      assignmentid: assignment._id,
      fileHash: fileHash,
    });

    if (existingUpload) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate assignment submission detected',
      });
    }

    const duplicate = await Assignmentupload.findOne({
      studentid,
      assignmentid,
    });

    fs.unlinkSync(photo.path);

    if (duplicate) {
      duplicate.photo = uploadedFile.url;
      duplicate.fileHash = fileHash;
      await duplicate.save();

      return res.status(200).json({
        success: true,
        message: 'Assignment updated successfully',
        assignments: duplicate,
        studentdetails,
        assignment,
      });
    }

    const uploadassignments = new Assignmentupload({
      studentid: studentdetails._id,
      teacherid: teacherdetails._id,
      assignmentid: assignment._id,
      photo: uploadedFile.url,
      fileHash: fileHash,
      schoolId: req.schoolId, // SECURITY: multi-tenancy stamp
    });

    await uploadassignments.save();

    res.status(201).json({
      success: true,
      message: 'Assignment uploaded successfully',
      assignments: uploadassignments,
      studentdetails,
      assignment,
    });
  } catch (error) {
    console.error('Error in assignment upload:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to upload assignment',
      error: error.message,
    });
  }
};

function generateFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (err) {
    throw new Error('Error generating file hash: ' + err.message);
  }
}

exports.getalluploadassignment = async (req, res, next) => {
  try {
    const { assignmentid } = req.params;
    // SECURITY: scope to current school
    const uploadassignments = await Assignmentupload.find({ assignmentid, schoolId: req.schoolId });

    if (uploadassignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No assignments uploaded for this assignment',
      });
    }

    const detailedUploads = await Promise.all(
      uploadassignments.map(async (upload) => {
        const studentdetails = await User.findById(upload.studentid);
        const teacherdetails = await User.findById(upload.teacherid);

        return {
          upload,
          student: {
            id: studentdetails._id,
            name: studentdetails.name,
            email: studentdetails.email,
            enroll: studentdetails.scholar_no,
          },
          teacher: {
            id: teacherdetails._id,
            name: teacherdetails.name,
            email: teacherdetails.email,
          },
        };
      })
    );
    res.status(200).json({
      success: true,
      detailedUploads,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to get all assignments',
      error: error.message,
    });
  }
};

// exports.getallteacherassignment = async (req, res, next) => {
//   try {
//     const { teacherid } = req.params;
//       const uploadassignments = await Assignmentupload.find({ teacherid });

//     if (uploadassignments.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'No assignments uploaded for this assignment',
//       });
//     }

//     const detailedUploads = await Promise.all(uploadassignments.map(async (upload) => {
//       const studentdetails = await User.findById(upload.studentid);
//       const teacherdetails = await User.findById(upload.teacherid);

//       return {
//           upload,
//           student: {
//             id: studentdetails._id,
//             name: studentdetails.name,
//             email: studentdetails.email
//           },
//           teacher: {
//             id: teacherdetails._id,
//             name: teacherdetails.name,
//             email: teacherdetails.email
//           }
//         };
//       }));
//     res.status(200).json({
//       success: true,
//       detailedUploads,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Server Error: Unable to get all assignments',
//       error: error.message,
//     });
//   }
// };

exports.getassignmentbyidupload = async (req, res, next) => {
  try {
    const { assignmentid, studentid } = req.params;
    const totalassignmentcomplete = await Assignmentupload.countDocuments({
      studentid,
      schoolId: req.schoolId,
    });
    // SECURITY: scope to current school
    const uploadassignments = await Assignmentupload.find({
      assignmentid,
      studentid,
      schoolId: req.schoolId,
    });
    if (uploadassignments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No assignments uploaded for this assignment',
      });
    }
    res.status(200).json({
      success: true,
      uploadassignments,
      totalassignmentcomplete,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to get all assignments',
      error: error.message,
    });
  }
};

exports.getassignmentstudentscount = async (req, res, next) => {
  try {
    const { studentid, semester } = req.params;
    // SECURITY: scope to current school
    const totalassignmentcomplete = await Assignmentupload.countDocuments({
      studentid,
      semester,
      schoolId: req.schoolId,
    });
    res.status(200).json({
      success: true,
      totalassignmentcomplete,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to get all assignments',
      error: error.message,
    });
  }
};
