const mongoose = require('mongoose');

const DOC_TYPES = ['TC', 'MIGRATION'];
const FIELD_TYPES = ['text', 'date', 'number', 'textarea'];

const fieldConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    required: { type: Boolean, default: false },
    type: { type: String, enum: FIELD_TYPES, default: 'text' },
    isCustom: { type: Boolean, default: false },
  },
  { _id: false }
);

const documentTemplateConfigSchema = new mongoose.Schema(
  {
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
    fields: {
      type: [fieldConfigSchema],
      default: [],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

documentTemplateConfigSchema.index({ schoolId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('DocumentTemplateConfig', documentTemplateConfigSchema);
module.exports.DOC_TYPES = DOC_TYPES;
module.exports.FIELD_TYPES = FIELD_TYPES;
