const mongoose = require('mongoose');
const noticeSchema = new mongoose.Schema(
  {
    // Without this the controller's `create({ ...data, schoolId })` was dropped by
    // strict mode, so every find({ schoolId }) matched nothing
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    createdByID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // required: true
    },
    Body: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    audience: {
      type: String,
      enum: ['all', 'students', 'teachers'],
      default: 'all',
    },
    member: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

noticeSchema.index({ schoolId: 1, createdAt: -1 });

const Notice = mongoose.model('Notice', noticeSchema);
module.exports = Notice;
