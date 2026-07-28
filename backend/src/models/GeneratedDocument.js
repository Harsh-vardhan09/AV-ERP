const mongoose = require('mongoose');
const { DOC_TYPES, FIELD_TYPES } = require('./DocumentTemplateConfig');

const fieldSnapshotSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: false },
    type: { type: String, enum: FIELD_TYPES, default: 'text' },
    isCustom: { type: Boolean, default: false },
  },
  { _id: false }
);

const generatedDocumentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: DOC_TYPES,
      required: true,
    },
    fieldsUsed: {
      type: [fieldSnapshotSchema],
      default: [],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GeneratedDocument', generatedDocumentSchema);
