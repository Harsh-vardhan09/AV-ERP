const mongoose = require('mongoose');

// Pre-defined field descriptor
const predefinedFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true }, // e.g. "Name", "Mobile No."
  fieldKey:  { type: String, required: true }, // camelCase key e.g. "name", "mobileNo"
  enabled:   { type: Boolean, default: false },
  required:  { type: Boolean, default: false },
  order:     { type: Number, default: 0 },
}, { _id: false });

// Custom (user-defined) field
const customFieldSchema = new mongoose.Schema({
  label:       { type: String, required: true },
  fieldType:   { type: String, enum: ['text','textarea','number','email','tel','date','select','checkbox','radio','file'], default: 'text' },
  options:     [String], // for select/radio/checkbox
  placeholder: { type: String, default: '' },
  required:    { type: Boolean, default: false },
  order:       { type: Number, default: 0 },
});

const customFormSchema = new mongoose.Schema({
  schoolId:     { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  title:        { type: String, required: true, trim: true },
  content:      { type: String, default: '' },          // rich-text HTML
  contentPosition: { type: String, enum: ['before', 'after'], default: 'before' },

  // Field mode
  fieldMode:    { type: String, enum: ['predefined', 'custom'], default: 'predefined' },
  predefinedFields: [predefinedFieldSchema],
  customFields:     [customFieldSchema],

  // Right-panel toggles
  status:           { type: Boolean, default: true },   // form active/inactive
  linkToLead:       { type: Boolean, default: true },   // submit → lead
  registrationForm: { type: Boolean, default: false },

  // Session this form is associated with
  session:          { type: String, default: '' },      // e.g. "2024–2025"

  // Email config
  receiverEmail:    { type: String, default: '' },
  emailSubject:     { type: String, default: '' },
  emailSignature:   { type: String, default: '' },

  // Auto-reply
  autoReply:        { type: Boolean, default: false },
  replyEmailSubject:{ type: String, default: '' },
  replyEmailBody:   { type: String, default: '' },
  replyToEmail:     { type: String, default: '' },

  // Payment
  enablePayment:    { type: Boolean, default: false },

  // Soft delete
  isDeleted:        { type: Boolean, default: false },
  deletedAt:        { type: Date },
  deletedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Public shareable slug / token
  shareToken:       { type: String, unique: true, sparse: true },

  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('CustomForm', customFormSchema);
