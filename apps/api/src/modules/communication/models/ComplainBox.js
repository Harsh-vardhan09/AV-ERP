const mongoose = require('mongoose');

const item = new mongoose.Schema({
  scholar_no: {
    type: String,
    // unique:true
  },
  comments: {
    type: String,
  },
  status: {
    type: String,
    enum: ['accepted', 'rejected', 'pending'],
  },
});
const complainBox = new mongoose.Schema(
  {
    complainBy: {
      type: String,
      required: true,
    },

    // Submitter identity. Stamped from the authenticated user, never from the client
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassModel',
    },

    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SectionModel',
    },

    // Denormalised so the complaint list renders without joining StudentProfile,
    // and still reads correctly if the student later changes class
    studentName: {
      type: String,
    },

    rollNo: {
      type: String,
    },

    admissionNumber: {
      type: String,
    },

    category: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    suggestion: {
      type: String,
    },

    status: {
      type: String,
      enum: ['pending', 'rejected', 'resolved'],
      required: [true, 'please specify the status'],
    },

    acceptedby: [
      {
        type: item,
      },
    ],

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

complainBox.index({ schoolId: 1, studentId: 1 });

module.exports = mongoose.model('complainbox', complainBox);
