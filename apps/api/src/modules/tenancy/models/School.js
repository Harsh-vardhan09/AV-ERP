const mongoose = require('mongoose');

/**
 * School — top-level tenant.
 * One document per school. All other collections reference this via schoolId.
 * Created only by the platform owner via the /api/platform/* routes
 * (protected by PLATFORM_SECRET env var, not a user role).
 */
const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
  },
  // Short slug used as the login identifier for this school's users.
  // e.g. "DPS01", "SUNRISE2025"
  code: {
    type: String,
    required: [true, 'School code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    match: [/^[A-Z0-9]{3,12}$/, 'School code must be 3-12 alphanumeric characters (uppercase)'],
  },
  // The admin user of this school (admin role, same User collection)
  adminUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  logoUrl: { type: String },
  isActive: { type: Boolean, default: true },

  // Optional — used for Transfer / Migration certificates (UDISE & address lines)
  udiseCode: { type: String, trim: true },
  certBlockMunicipality: { type: String, trim: true },
  certCircle: { type: String, trim: true },
  certDistrict: { type: String, trim: true },
  certPin: { type: String, trim: true },

  // Super Admin fields (added Phase 1)
  // Set when a school is suspended by a super admin
  suspendedAt: { type: Date, default: null },
  suspendReason: { type: String, trim: true, default: null },
  // Which super admin onboarded this school (null if created via platformRoutes)
  onboardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    default: null,
  },
}, { timestamps: true });

// Case-insensitive code lookup helper
schoolSchema.statics.findByCode = function (code) {
  return this.findOne({ code: code.toUpperCase().trim() });
};

module.exports = mongoose.model('School', schoolSchema);
