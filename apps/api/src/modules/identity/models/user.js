const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    // Core identity
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      trim: true, // optional — many students have only a first name
    },
    email: {
      type: String,
      // Not globally unique — uniqueness enforced per school via compound index below
      sparse: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => !value || validator.isEmail(value),
        message: 'Please provide a valid email',
      },
    },
    phone: {
      type: String,
      trim: true,
    },

    // Auth
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: [
        'admin',
        'teacher',
        'student',
        'admission',
        'accounts',
        'librarian',
        'exam_controller',
      ],
      required: [true, 'Role is required'],
      default: 'student',
    },

    // Multi-tenancy
    // Which school this user belongs to.
    // Set at user creation and embedded into the JWT → req.schoolId on every request.
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      index: true,
      // Kept optional for backward-compat during migration; enforce after migration
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },

    //OASES ROLE
    oasesRole: {
      type: String,
      enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCAN_OPERATOR', 'EVALUATOR', 'HEAD_EXAMINER'],
      default: null,
    },

    // Password reset
    resetPasswordToken: String,
    resetPasswordExpired: Date,

    // Email verification
    varificationToken: String,
    varificationTokenExpired: Date,

    // Staff Credential Management (Sprint: Staff Onboarding)
    // Set to true when admin creates a staff account.
    // Cleared to false once the staff member sets their own password.
    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    // Tracks which admin user created this staff account.
    // null when created by super admin (no User doc) or self-registered.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Email unique within a school, but only when an actual email string is present.
// Null/empty emails are allowed so students without an email can still register.
userSchema.index(
  { email: 1, schoolId: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

userSchema.pre('save', function (next) {
  if (this.email === null || this.email === undefined || this.email === '') {
    this.email = undefined;
  }
  next();
});

userSchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  const update = this.getUpdate && this.getUpdate();
  if (!update) return next();

  const op = update.$set || update;
  if (op.email === null || op.email === undefined || op.email === '') {
    op.email = undefined;
    if (update.$set) {
      update.$set = op;
    } else {
      this.setUpdate(op);
    }
  }

  next();
});

// Virtual 'name' — payroll module and other consumers use user.name
userSchema.virtual('name').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

exports.User = mongoose.model('User', userSchema);
