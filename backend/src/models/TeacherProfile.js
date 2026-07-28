const mongoose = require('mongoose');

const teacherProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },

  // ===== IDs =====
  employeeId: {
    type: String,
    sparse: true,
    trim: true
  },
  teacherId: {
    type: String,
    sparse: true,
    trim: true
  },

  // ===== PERSONAL =====
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  middleName: { type: String, trim: true },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', '']
  },
  dateOfBirth: { type: Date },
  nationality: { type: String, default: 'Indian' },
  religion: String,
  caste: String,
  category: {
    type: String,
    enum: ['General', 'OBC', 'SC', 'ST', 'EWS', '']
  },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed', '']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
  },
  motherTongue: String,

  // ===== IDENTITY =====
  aadharCard: { type: String, trim: true },
  panCard: { type: String, trim: true },

  // ===== CONTACT =====
  phone: { type: String, trim: true },
  alternatePhone: { type: String, trim: true },
  address: String,
  addressLine2: String,
  city: String,
  state: String,
  pincode: String,

  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },

  // ===== PROFESSIONAL =====
  qualification: { type: String, trim: true },
  specialization: { type: String, trim: true },
  experience: { type: Number }, // years
  department: { type: String, trim: true },
  designation: { type: String, trim: true },
  joiningDate: { type: Date, default: Date.now },

  // ===== FAMILY =====
  familyDetails: {
    fatherName: String,
    fatherPhone: String,
    motherName: String,
    motherPhone: String,
    spouseName: String,
    spousePhone: String
  },

  // ===== BANK =====
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifsc: String,
    branchName: String
  },

  // ===== SALARY =====
  salary: {
    basic: Number,
    hra: Number,
    transport: Number,
    total: Number
  },

  // ===== DOCUMENTS (URLs) =====
  documents: {
    photo: String,
    resume: String,
    idProof: String,
    qualificationCert: String,
    experienceLetter: String,
    aadharCardDoc: String,
    panCardDoc: String
  },

  remarks: String,

  status: {
    type: String,
    enum: ['active', 'inactive', 'resigned', 'terminated'],
    default: 'active'
  },

  // ===== SOFT DELETE =====
  isDeleted:    { type: Boolean, default: false, index: true },
  deletedAt:    { type: Date },
  deletedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deleteReason: { type: String },

  // ===== STATUTORY (Payroll Module) =====
  panNumber:  { type: String, trim: true },  // alias for panCard (used by payroll PAN reports)
  uanNumber:  { type: String, trim: true },  // Universal Account Number (PF)
  esiNumber:  { type: String, trim: true },  // ESI IP Number

  // Multi-tenancy
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    index: true,
  },
}, { timestamps: true });

// Virtual 'name' — payroll module and other consumers can do teacher.name
// instead of manually concatenating firstName + lastName everywhere
teacherProfileSchema.virtual('name').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Ensure virtuals are included when converting to JSON / plain objects
teacherProfileSchema.set('toJSON',   { virtuals: true });
teacherProfileSchema.set('toObject', { virtuals: true });

// Per-school unique constraints
teacherProfileSchema.index({ userId: 1, schoolId: 1 }, { unique: true, sparse: true });
teacherProfileSchema.index({ employeeId: 1, schoolId: 1 }, { unique: true, sparse: true });
teacherProfileSchema.index({ teacherId: 1, schoolId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TeacherProfile', teacherProfileSchema);
