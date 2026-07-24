const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

/**
 * SuperAdmin — Platform-level administrator.
 * Completely separate from the school User model.
 * Uses its own JWT secret (SUPER_ADMIN_JWT_SECRET) and cookie (superAdminToken).
 * Does NOT have a schoolId — operates across ALL schools.
 */
const superAdminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Please provide a valid email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    permissions: {
      type: [String],
      enum: [
        'manage_schools',
        'manage_subscriptions',
        'view_analytics',
        'manage_users',
        'system_settings',
      ],
      default: ['manage_schools', 'view_analytics'],
    },
    // null for the first/root super admin; ObjectId for ones created by another super admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SuperAdmin',
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Pre-save hook: hash password if it has been modified.
 * bcrypt rounds: 12 (production-grade)
 */
superAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('SuperAdmin', superAdminSchema);
