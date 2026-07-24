const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    // unique across school is enforced via schoolId compound index below
  },

  // ===== AUTO-GENERATED / MANUAL IDs =====
  admissionNumber: {
    type: String,
    sparse: true,
    trim: true
  },
  studentId: {
    type: String,
    sparse: true,
    trim: true
  },
  rollNo: {
    type: String,
    trim: true
  },
  scholarNo: {
    type: String,
    trim: true,
    sparse: true
  },
  /** Permanent Education Number (government / board identifier) */
  pen: {
    type: String,
    trim: true,
    sparse: true
  },

  // ===== PERSONAL (name + DOB mandatory, rest optional) =====
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true   // optional — single-name students are valid
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', '']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  placeOfBirth: String,
  nationality: {
    type: String,
    default: 'Indian'
  },
  religion: String,
  caste: String,
  category: {
    type: String,
    enum: ['General', 'OBC', 'SC', 'ST', 'EWS', '']
  },
  motherTongue: String,
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
  },

  // ===== IDENTITY =====
  aadharCard: { type: String, trim: true },
  ssmId: { type: String, trim: true },           // Samagra / SSM ID
  familyId: { type: String, trim: true },         // Govt. Family ID
  apaarId: { type: String, trim: true },          // APAAR / ABC ID (Academic Bank of Credits)
  rte: { type: Boolean, default: false },
  bplStudent: { type: Boolean, default: false },  // BPL card holder
  bplCardNo: { type: String, trim: true },        // BPL card number

  // ===== PARENT AADHAAR =====
  fatherAadharCard: { type: String, trim: true },
  motherAadharCard: { type: String, trim: true },
  guardianAadharCard: { type: String, trim: true },

  // ===== CASTE CERTIFICATE =====
  casteApplicationNo: { type: String, trim: true },
  casteApplicationDate: { type: Date },

  // ===== GOVERNMENT SCHEME IDs =====
  boardEnrollNo: { type: String, trim: true },    // Board / state enrollment number
  ladliLaxmiNo: { type: String, trim: true },     // Ladli Laxmi Yojana number
  scholarshipId: { type: String, trim: true },    // Scholarship ID
  domicileApplicationNo: { type: String, trim: true },
  rteApplicationNo: { type: String, trim: true },
  srnNo: { type: String, trim: true },            // State Registration Number
  penNo: { type: String, trim: true },            // Alias for pen (PEN)

  // ===== CONTACT EXTRAS =====
  whatsappNo: { type: String, trim: true },
  alternateNumber: { type: String, trim: true },

  // ===== ACADEMIC (class, section mandatory) =====
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassModel',
    required: [true, 'Class is required']
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SectionModel',
    required: [true, 'Section is required']
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: [true, 'Academic session is required']
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  previousSchool: String,
  previousClass: String,
  diseCode: { type: String, trim: true },          // DISE / UDISE code of previous school
  previousResult: { type: String, enum: ['Pass', 'Fail', ''] },  // Previous class result

  // ===== STREAM (only for Class 11th & 12th) =====
  stream: {
    type: String,
    enum: ['Science', 'Commerce', 'Arts', null, ''],
    default: null,
    trim: true
  },

  // ===== CONTACT =====
  phone: String,
  address: {
    type: String,
    required: [true, 'Address is required']
  },
  addressLine2: String,
  city: String,
  state: String,
  pincode: String,

  emergencyContact: {
    name: String,
    phone: String,
    relation: String
  },

  // ===== PARENT / GUARDIAN (father mandatory) =====
  parentDetails: {
    father: {
      name: { type: String, required: [true, "Father's name is required"] },
      occupation: String,
      qualification: String,
      phone: { type: String, required: [true, "Father's phone is required"] },
      email: String,
      annualIncome: String
    },
    mother: {
      name: String,
      occupation: String,
      qualification: String,
      phone: String,
      email: String
    },
    guardian: {
      name: String,
      relation: String,
      phone: String,
      email: String,
      qualification: String,
      income: String
    }
  },

  // ===== BANK =====
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifsc: String,
    branchName: String
  },

  // ===== HEALTH =====
  healthInfo: {
    healthIssues: String,
    allergies: String,
    medications: String,
    disabilityType: String
  },

  // ===== TRANSPORT & HOSTEL =====
  transportation: {
    transportRequired: { type: Boolean, default: false },
    pickupPoint: String,
    routeNo: String
  },
  hostel: {
    hostelRequired: { type: Boolean, default: false },
    roomNo: String
  },

  // ===== DOCUMENTS (URLs for uploaded files) =====
  documents: {
    photo: String,
    birthCertificate: String,
    transferCertificate: String,
    previousMarksheets: String,
    medicalCertificate: String,
    aadharCardDoc: String,
    addressProof: String,
    casteProof: String
  },

  remarks: String,

  status: {
    type: String,
    enum: ['active', 'inactive', 'left', 'passed_out', 'passed', 'dropped', 'suspended', 'deleted'],
    default: 'active',
    index: true
  },

  // ===== STUDENT MANAGEMENT — SOFT DELETE =====
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deleteReason: {
    type: String,
    trim: true,
    default: null
  },

  // ===== PASSED OUT / ALUMNI =====
  passedOutYear: {
    type: String,
    default: null,
    trim: true
  },
  passedOutClass: {
    type: String,
    default: null,
    trim: true
  },

  // ===== DROPPED OUT =====
  droppedDate: {
    type: Date,
    default: null
  },
  dropReason: {
    type: String,
    trim: true,
    default: null
  },

  // ===== SUSPENSION =====
  suspendedFrom: {
    type: Date,
    default: null
  },
  suspendedUntil: {
    type: Date,
    default: null
  },
  suspensionReason: {
    type: String,
    trim: true,
    default: null
  },

  // ===== BULK EDIT TRACKING =====
  lastBulkEditAt: {
    type: Date,
    default: null
  },
  lastBulkEditBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // ===== PROMOTION / MIGRATION TRACKING =====
  promotedFrom: {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassModel',
      default: null
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SectionModel',
      default: null
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      default: null
    },
    promotedAt: {
      type: Date,
      default: null
    },
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },

  // Multi-tenancy
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    index: true,
  },
}, { timestamps: true });

// Per-school unique constraints
studentProfileSchema.index({ userId: 1, schoolId: 1 }, { unique: true, sparse: true });
studentProfileSchema.index({ admissionNumber: 1, schoolId: 1 }, { unique: true, sparse: true });
studentProfileSchema.index({ studentId: 1, schoolId: 1 }, { unique: true, sparse: true });
studentProfileSchema.index({ scholarNo: 1, schoolId: 1 }, { unique: true, sparse: true });
studentProfileSchema.index({ firstName: 'text', lastName: 'text', rollNo: 'text' });
studentProfileSchema.index({ schoolId: 1, status: 1 });
studentProfileSchema.index({ schoolId: 1, isDeleted: 1 });
studentProfileSchema.index({ schoolId: 1, classId: 1, status: 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
