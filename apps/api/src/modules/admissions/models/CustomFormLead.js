const mongoose = require('mongoose');

const customFormLeadSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  formId:   { type: mongoose.Schema.Types.ObjectId, ref: 'CustomForm', required: true, index: true },

  // Submitted field values — stored as key-value pairs
  fields: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

  // Metadata
  submittedAt: { type: Date, default: Date.now },
  ipAddress:   { type: String, default: '' },
  userAgent:   { type: String, default: '' },

  // If linked to a student enquiry / lead
  linkedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', default: null },

  status: { type: String, enum: ['new', 'contacted', 'converted', 'rejected'], default: 'new' },
  notes:  { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CustomFormLead', customFormLeadSchema);
