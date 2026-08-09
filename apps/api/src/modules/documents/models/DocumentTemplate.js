const mongoose = require('mongoose');

const ALLOWED_TYPES = ['TC', 'MIGRATION'];

const ALLOWED_FIELD_KEYS = [
  'studentName', 'fatherName', 'motherName', 'className', 'sectionName',
  'admissionNo', 'rollNo', 'dob', 'address', 'district', 'schoolName',
  'udiseCode', 'schoolAddress', 'leavingDate', 'reasonForTransfer',
  'lastClassPassed', 'lastClassAttended', 'certificateNo', 'issueDate',
  'sessionName', 'pen', 'studentCode',
  // Migration-specific
  'nationality', 'religion',
  // Extra editable fields
  'conduct', 'whetherPassed', 'dateOfLeaving', 'remarks',
  'certificationStatementDate', 'issueFooterDate', 'acknowledgementDate',
];

/** A single positioned text field on the template image */
const fieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ALLOWED_FIELD_KEYS,
      required: true,
    },
    label: { type: String, default: '' },
    /** Position as percentage of template image dimensions (0–100) */
    xPercent: { type: Number, default: 0, min: 0, max: 100 },
    yPercent: { type: Number, default: 0, min: 0, max: 100 },
    fontSize:   { type: Number, default: 14, min: 6, max: 72 },
    fontWeight: { type: String, default: 'normal', enum: ['normal', 'bold', '600', '700', '800'] },
    color:      { type: String, default: '#000000' },
    fontFamily: { type: String, default: 'Arial' },
    width:      { type: Number, default: 200 }, // px, for text-wrap control
    alignment:  { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    maxLines:   { type: Number, min: 1, max: 8, default: 2 },
  },
  { _id: true }
);

const documentTemplateSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School context is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ALLOWED_TYPES,
      required: [true, 'Document type is required'],
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    /** Cloudinary URL of the uploaded certificate background image */
    templateImageUrl: {
      type: String,
      default: '',
    },
    templatePdfUrl: {
      type: String,
      default: '',
    },
    templateMimeType: {
      type: String,
      enum: ['image/png', 'image/jpeg', 'application/pdf'],
      default: 'image/png',
    },
    /** Template image natural dimensions — needed to convert % → px on render */
    imageWidth:  { type: Number, default: 794 },  // A4 ~96dpi width
    imageHeight: { type: Number, default: 1123 }, // A4 ~96dpi height
    /** Positioned text fields */
    fields: {
      type: [fieldSchema],
      default: [],
    },
    /** Incremented on every update so documents track which version generated them */
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: { type: Boolean, default: true },
    uploadedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    /**
     * layoutMode:
     *   'overlay'    — legacy image + x/y field overlay (default, backward compat)
     *   'structured' — new HTML-rendered clean layout from layout[] array
     */
    layoutMode: {
      type: String,
      enum: ['overlay', 'structured'],
      default: 'overlay',
    },

    /**
     * Structured layout rows (used when layoutMode === 'structured').
     * Each element: { type, label, key, bold, multiline, fields[], ... }
     */
    layout: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    /**
     * Header / footer / section configuration for the structured renderer.
     * e.g. { mottoLeft, mottoRight, tagline, showAcknowledgement }
     */
    sections: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// One template per school per type
documentTemplateSchema.index({ schoolId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('DocumentTemplate', documentTemplateSchema);
module.exports.ALLOWED_TYPES = ALLOWED_TYPES;
module.exports.ALLOWED_FIELD_KEYS = ALLOWED_FIELD_KEYS;
