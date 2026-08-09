const mongoose = require('mongoose');

const assignmentUploadSchema = new mongoose.Schema(
  {
    studentid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile', // changed: StudentProfile has rollNo
      required: true,
    },
    teacherid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignmentid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },
    photo: {
      type: String,
      required: true,
    },
    submittedAt: { type: Date, default: Date.now },
    fileHash: { type: String, required: true, index: true },
    // Multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School context is required'],
      index: true,
    },
  },
  { timestamps: true }
);

const Assignmentupload = mongoose.model('Assignmentupload', assignmentUploadSchema);

module.exports = Assignmentupload;
