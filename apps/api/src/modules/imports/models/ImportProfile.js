/**
 * ImportProfile Schema - Saves column mappings and settings for reuse
 * Allows users to save templates and reuse them for future imports
 * Multi-tenant scoped by schoolId
 */

const mongoose = require('mongoose');

const importProfileSchema = new mongoose.Schema(
  {
    // Tenant & ownership
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Profile metadata
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    entity: {
      type: String,
      enum: ['student', 'teacher', 'fee', 'attendance', 'class', 'section', 'subject', 'payroll', 'inventory'],
      required: true,
      index: true,
    },
    version: {
      type: String,
      default: '1.0',
    },

    // Column mapping - core of the profile
    columnMapping: {
      // Maps file columns to entity fields
      // E.g., { 'First Name': 'firstName', 'Last Name': 'lastName', ... }
      type: Map,
      of: {
        targetField: String, // The field in the schema
        dataType: {
          type: String,
          enum: ['string', 'number', 'date', 'boolean', 'email', 'phone', 'enum', 'objectId'],
        },
        required: Boolean,
        optional: Boolean,
        transformations: [String], // Applied transformations
        validators: [String], // Custom validators
        defaultValue: mongoose.Schema.Types.Mixed,
        enumValues: [String], // If dataType is enum
        dateFormat: String, // If dataType is date
        phoneFormat: String, // If dataType is phone
        notes: String,
      },
    },

    // Advanced transformations per column
    transformations: {
      type: Map,
      of: {
        type: String,
        enum: [
          'trim',
          'uppercase',
          'lowercase',
          'capitalize',
          'normalizePhone',
          'normalizeEmail',
          'convertDateFormat',
          'parseBoolean',
          'convertToInteger',
          'convertToDecimal',
          'splitName',
          'concatenateFields',
          'customFunction',
        ],
      },
    },

    // Custom transformation scripts (for advanced users)
    customTransformations: [
      {
        columnName: String,
        functionName: String,
        script: String, // JavaScript code (sandboxed)
        description: String,
      },
    ],

    // Import settings tied to this profile
    settings: {
      duplicateMode: {
        type: String,
        enum: ['skip', 'update', 'stop'],
        default: 'skip',
      },
      validationStrictness: {
        type: String,
        enum: ['strict', 'moderate', 'lenient'],
        default: 'moderate',
      },
      autoAssignDefaults: Boolean, // For entities that need defaults
      maxRowsPerBatch: Number,
      allowFormulasInCells: Boolean,
      headerRowNumber: {
        type: Number,
        default: 1,
      },
      skipEmptyRows: Boolean,
      treatAsHeaderIfMissing: Boolean,
      ignoreColumns: [String], // Columns to skip
      requiredColumns: [String], // Enforce which columns must exist
    },

    // Validation rules for this profile
    validationRules: [
      {
        field: String,
        rule: String, // e.g., 'required', 'unique', 'minLength', 'pattern', 'custom'
        params: mongoose.Schema.Types.Mixed, // Rule parameters
        errorMessage: String,
        skipIfEmpty: Boolean,
      },
    ],

    // Business rules for this profile
    businessRules: [
      {
        name: String,
        description: String,
        rules: [String], // Rules to apply
        action: {
          type: String,
          enum: ['warn', 'error', 'skip', 'auto_correct'],
        },
      },
    ],

    // Sample data from last successful import
    sampleData: {
      headers: [String],
      rows: [mongoose.Schema.Types.Mixed],
      rowCount: Number,
    },

    // Template usage statistics
    stats: {
      totalUsed: Number,
      lastUsedAt: Date,
      totalSuccessfulImports: Number,
      totalFailedImports: Number,
      averageSuccessRate: Number,
      averageProcessingTime: Number,
    },

    // Visibility & sharing
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        permission: {
          type: String,
          enum: ['view', 'duplicate', 'edit', 'admin'],
        },
        sharedAt: Date,
      },
    ],

    // Related profiles (for chains/dependencies)
    relatedProfiles: [
      {
        profileId: mongoose.Schema.Types.ObjectId,
        relation: String, // e.g., 'dependency', 'related', 'replacement'
      },
    ],

    // Versioning
    isActive: {
      type: Boolean,
      default: true,
    },
    previousVersions: [
      {
        version: String,
        createdAt: Date,
        columnMapping: Map,
        transformations: Map,
        settings: mongoose.Schema.Types.Mixed,
      },
    ],

    // Audit trail
    lastModifiedBy: mongoose.Schema.Types.ObjectId,
    lastModifiedAt: Date,
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvedAt: Date,

    // Soft delete tracking
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: mongoose.Schema.Types.ObjectId,
    archiveReason: String,

    // Tags for organization
    tags: [String],
    category: String,
  },
  {
    timestamps: true,
    strict: 'throw',
    collection: 'importProfiles',
  }
);

// Indexes for efficient querying
importProfileSchema.index({ schoolId: 1, entity: 1, isActive: 1 });
importProfileSchema.index({ schoolId: 1, createdBy: 1, isDeleted: 0 });
importProfileSchema.index({ schoolId: 1, isPublic: 1 });
importProfileSchema.index({ schoolId: 1, entity: 1, category: 1 });

// Static method to find active profiles for an entity
importProfileSchema.statics.getActiveProfiles = async function (schoolId, entity) {
  return this.find(
    {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      entity,
      isActive: true,
      isDeleted: false,
    },
    {
      name: 1,
      description: 1,
      version: 1,
      stats: 1,
      createdAt: 1,
      createdBy: 1,
    }
    // Dot path, not a nested object — Mongo rejects { stats: { totalUsed: -1 } }
  ).sort({ 'stats.totalUsed': -1 });
};

// Static method to get template by name
importProfileSchema.statics.getProfileByName = async function (schoolId, entity, name) {
  return this.findOne({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    entity,
    name,
    isActive: true,
    isDeleted: false,
  });
};

// Instance method to increment usage stats
importProfileSchema.methods.recordUsage = async function (successful = true, processingTime = 0) {
  this.stats.totalUsed = (this.stats.totalUsed || 0) + 1;
  this.stats.lastUsedAt = new Date();

  if (successful) {
    this.stats.totalSuccessfulImports = (this.stats.totalSuccessfulImports || 0) + 1;
  } else {
    this.stats.totalFailedImports = (this.stats.totalFailedImports || 0) + 1;
  }

  // Calculate average processing time
  const totalTime = (this.stats.averageProcessingTime || 0) * (this.stats.totalUsed - 1) + processingTime;
  this.stats.averageProcessingTime = totalTime / this.stats.totalUsed;

  // Calculate success rate
  const total = this.stats.totalSuccessfulImports + this.stats.totalFailedImports;
  this.stats.averageSuccessRate = ((this.stats.totalSuccessfulImports / total) * 100).toFixed(2);

  return this.save();
};

// Instance method to create a new version
importProfileSchema.methods.createNewVersion = async function (newVersion, updatedData) {
  // Archive current state
  this.previousVersions.push({
    version: this.version,
    createdAt: new Date(),
    columnMapping: new Map(this.columnMapping),
    transformations: new Map(this.transformations),
    settings: JSON.parse(JSON.stringify(this.settings)),
  });

  // Update to new version
  this.version = newVersion;
  Object.assign(this, updatedData);
  this.lastModifiedAt = new Date();

  return this.save();
};

// Instance method to clone this profile
importProfileSchema.methods.cloneProfile = async function (newName, newDescription, userId) {
  const cloned = new this.constructor({
    schoolId: this.schoolId,
    createdBy: userId,
    name: newName,
    description: newDescription,
    entity: this.entity,
    version: '1.0',
    columnMapping: new Map(this.columnMapping),
    transformations: new Map(this.transformations),
    customTransformations: JSON.parse(JSON.stringify(this.customTransformations)),
    settings: JSON.parse(JSON.stringify(this.settings)),
    validationRules: JSON.parse(JSON.stringify(this.validationRules)),
    businessRules: JSON.parse(JSON.stringify(this.businessRules)),
    tags: [...this.tags],
    category: this.category,
  });

  return cloned.save();
};

module.exports = mongoose.model('ImportProfile', importProfileSchema);
