const mongoose = require('mongoose');

/**
 * AdmissionTemplate
 *
 * Mirrors ReportTemplate schema for admission-form templates.
 * Completely independent collection — no coupling to report cards.
 * Supports multi-tenant schoolId isolation, lifecycle status, and
 * the same HTML/CSS template engine used by the dynamic report card system.
 *
 * Template category is always 'admission_form' — this distinguishes
 * these documents from ReportTemplate documents in the DB.
 */
const admissionTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    // Always 'admission_form' — used for filtering and logging
    category: {
      type: String,
      default: 'admission_form',
      immutable: true,
    },
    htmlContent: {
      type: String,
      required: [true, 'HTML content is required'],
    },
    cssContent: {
      type: String,
      default: '',
    },
    // Auto-extracted placeholders from the HTML (populated on upload/save)
    extractedFields: [{
      name: String,
      type: {
        type: String,
        enum: ['simple', 'object', 'array', 'array_item'],
        default: 'simple',
      },
      parentArray: String,
    }],

    // Template configuration (page layout)
    config: {
      pageSize: {
        type: String,
        enum: ['A4', 'A3', 'Letter', 'Legal'],
        default: 'A4',
      },
      orientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait',
      },
      marginTop:    { type: Number, default: 10 },
      marginBottom: { type: Number, default: 10 },
      marginLeft:   { type: Number, default: 10 },
      marginRight:  { type: Number, default: 10 },
    },

    // Lifecycle Status
    // draft        → uploaded but not yet ready for school use
    // published    → active and selectable by school admins
    // recommended  → super admin marks as preferred
    // deprecated   → still functional but school admin should migrate away
    // archived     → hidden from all selection UIs, kept for audit only
    templateStatus: {
      type: String,
      enum: ['draft', 'published', 'recommended', 'deprecated', 'archived'],
      default: 'published',
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // When true, this template is auto-selected when no explicit template is chosen
    isDefault: {
      type: Boolean,
      default: false,
    },

    // Soft-delete flag — set by Super Admin. Hides from all queries.
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Which super admin created this template (null = school admin created it)
    createdBySuperAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },

    // Usage statistics
    usageCount: { type: Number, default: 0 },
    lastUsedAt:  { type: Date,   default: null },

    // Multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School context is required'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Indexes
admissionTemplateSchema.index({ schoolId: 1, isActive: 1 });
admissionTemplateSchema.index({ schoolId: 1, isDefault: 1 });
admissionTemplateSchema.index({ schoolId: 1, templateStatus: 1, isActive: 1 });
admissionTemplateSchema.index({ schoolId: 1, name: 'text', description: 'text' });

// Ensure only one default template per school at a time
admissionTemplateSchema.pre('save', async function (next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { schoolId: this.schoolId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('AdmissionTemplate', admissionTemplateSchema);
