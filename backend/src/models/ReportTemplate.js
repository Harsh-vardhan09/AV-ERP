const mongoose = require('mongoose');

const reportTemplateSchema = new mongoose.Schema(
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
    htmlContent: {
      type: String,
      required: [true, 'HTML content is required'],
    },
    cssContent: {
      type: String,
      default: '',
    },
    // Auto-extracted fields from template (legacy — simple list)
    extractedFields: [{
      name: String,
      type: {
        type: String,
        enum: ['simple', 'object', 'array', 'array_item'],
        default: 'simple',
      },
      parentArray: String,
    }],

    // ── Template-driven schema (NEW) ──────────────────────────────────────────
    // Populated automatically on upload via TemplateFieldExtractor.extractAndClassify()
    templateSchema: {
      fields: [{
        name:       { type: String },          // raw name: "math_theory"
        normalized: { type: String },          // "maththeory"
        label:      { type: String },          // "Math Theory"
        category:   { type: String, enum: ['marks', 'meta', 'attendance', 'derived', 'other'], default: 'other' },
        subject:    { type: String, default: '' },   // "math" (from prefix)
        component:  { type: String, default: '' },   // "theory" (from suffix)
        isLoop:     { type: Boolean, default: false }, // inside {{#subjects}}
      }],
      marksFields:  [String],   // names of all marks-category fields
      metaFields:   [String],   // names of all meta-category fields
      extractedAt:  { type: Date },
    },
    // Field mappings (template field → database field)
    fieldMappings: {
      type: Map,
      of: String,
      default: {},
    },
    // Template configuration
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
      marginTop: {
        type: Number,
        default: 10,
      },
      marginBottom: {
        type: Number,
        default: 10,
      },
      marginLeft: {
        type: Number,
        default: 10,
      },
      marginRight: {
        type: Number,
        default: 10,
      },
    },
    // Template type for categorization
    templateType: {
      type: String,
      enum: ['annual', 'half_yearly', 'term1', 'term2', 'custom'],
      default: 'custom',
    },
    // For which exam types this template is applicable
    applicableExams: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    // ── Template Lifecycle Status ────────────────────────────────────────────
    // draft        → uploaded but not yet ready for school use
    // published    → active and available to school admins
    // recommended  → super admin marks this as the preferred choice for schools
    // deprecated   → still functional but school admin should migrate away
    // archived     → hidden from all selection UIs, kept for audit only
    templateStatus: {
      type: String,
      enum: ['draft', 'published', 'recommended', 'deprecated', 'archived'],
      default: 'published',
      index: true,
    },
    // Which super admin created this template (if uploaded via super admin panel)
    createdBySuperAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },

    // ── Class-Group Template Targeting ────────────────────────────────────────
    // Allows a school to upload DIFFERENT templates per class group.
    // Example: Nursery-UKG → template A, Class 1-5 → template B, etc.
    //
    // classRangeFrom / classRangeTo use Class.numericOrder (integers).
    // applicableClassIds overrides range matching (exact-class targeting).
    // If neither is set → global / fallback template.
    classGroupName: {
      type: String,
      trim: true,
      default: '',
    },
    classRangeFrom: {
      type: Number,
      default: null,
    },
    classRangeTo: {
      type: Number,
      default: null,
    },
    applicableClassIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    }],
    // Usage statistics
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
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

// Index for efficient queries
reportTemplateSchema.index({ schoolId: 1, isActive: 1, templateType: 1 });
reportTemplateSchema.index({ schoolId: 1, isDefault: 1 });
reportTemplateSchema.index({ schoolId: 1, name: 'text', description: 'text' });
// Class-group range lookup index
reportTemplateSchema.index({ schoolId: 1, classRangeFrom: 1, classRangeTo: 1, isActive: 1 });
// Template status queries (e.g., find all recommended for a school)
reportTemplateSchema.index({ schoolId: 1, templateStatus: 1, isActive: 1 });

// Ensure only one default template per school per (type + class range).
// Class-specific groups (e.g., Class 1-5 and Class 9-10) can each have their
// own default without conflicting with each other.
reportTemplateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    const rangeFilter = {
      schoolId: this.schoolId,
      templateType: this.templateType,
      _id: { $ne: this._id },
    };
    // Only clear defaults within the SAME class-range bucket.
    // null classRangeFrom/To is treated as "global" — a separate bucket.
    if (this.classRangeFrom !== null && this.classRangeTo !== null) {
      rangeFilter.classRangeFrom = this.classRangeFrom;
      rangeFilter.classRangeTo   = this.classRangeTo;
    } else {
      // Global template — only clear other global defaults (no range set)
      rangeFilter.classRangeFrom = null;
      rangeFilter.classRangeTo   = null;
    }
    await this.constructor.updateMany(rangeFilter, { isDefault: false });
  }
  next();
});

module.exports = mongoose.model('ReportTemplate', reportTemplateSchema);
