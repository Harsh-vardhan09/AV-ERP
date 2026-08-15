const mongoose = require('mongoose');
const { MODULES, DEFAULT_MODULES } = require('@av-erp/shared');

// Derived from the registry, never hand-listed: `modules` is a strict nested
// subdocument, so any key missing here is silently dropped on write AND read —
// a hardcoded list drifted behind modules.json and broke five toggles
const moduleFlags = {};
Object.entries(MODULES).forEach(([key, def]) => {
  moduleFlags[key] = { type: Boolean, default: def.defaultEnabled };
});

const schoolSettingsSchema = new mongoose.Schema(
  {
    // Auto-generation toggles for student registration
    autoGenerateAdmissionNo: { type: Boolean, default: true },
    autoGenerateRollNo: { type: Boolean, default: true },
    autoGenerateStudentId: { type: Boolean, default: true },

    // Counters for auto-generation (internal use)
    lastAdmissionSerial: { type: Number, default: 0 },
    lastTeacherSerial: { type: Number, default: 0 },

    // Attendance settings
    allowHallAttendance: { type: Boolean, default: false },

    // The school's local timezone, used to decide which calendar day a mark
    // belongs to. Render runs UTC; a naive new Date() would put anything marked
    // after 18:30 IST onto the following day and split one school day in two.
    // An IANA zone name, validated on write — see attendance/lib/schoolDay.js.
    timezone: { type: String, default: 'Asia/Kolkata', trim: true },

    // OASES workflow toggle — PRESERVED for backward compatibility.
    isOasesEnabled: { type: Boolean, default: false },

    // Module permission flags (Super Admin Panel)
    modules: {
      type: moduleFlags,
      default: () => ({ ...DEFAULT_MODULES }),
    },

    // Report card template selection (school-wide)
    // The ONE template a school admin has chosen for report cards.
    // Consumed by templateResolver as a priority below class-specific targeting,
    // so a school-wide pick never overrides a per-class template.
    selectedReportTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportTemplate',
      default: null,
    },

    // Multi-tenancy — one settings doc per school
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      unique: true,
      index: true,
    },

    // School-wide notification control
    notificationSettings: {
      emailEnabled: { type: Boolean, default: true },
      enabledTypes: {
        attendance: { type: Boolean, default: true },
        marks: { type: Boolean, default: true },
        fee: { type: Boolean, default: true },
        leave: { type: Boolean, default: true },
        assignment: { type: Boolean, default: true },
        notice: { type: Boolean, default: true },
        complaint: { type: Boolean, default: true },
        system: { type: Boolean, default: true },
        announcement: { type: Boolean, default: true },
      },
      digestTime: { type: String, default: '18:00' },
    },

    // School Profile — redesigned Settings → School tab
    // Every tenant has its own isolated profile document via schoolId scoping.
    schoolProfile: {
      // Basic Details
      fullName: { type: String, default: '' },
      tagline: { type: String, default: '' },
      headerTagline: { type: String, default: '' }, // comma-separated taglines
      shortName: { type: String, default: '', maxlength: 20 },
      schoolCode: { type: String, default: '' },
      affiliatedTo: { type: String, default: '' }, // CBSE / ICSE / State Board etc.
      affiliatedToText: { type: String, default: '' },
      affiliationCode: { type: String, default: '' },
      udiseCode: { type: String, default: '' },

      // Contact Details
      contactPerson: { type: String, default: '' },
      mobileNumber: { type: String, default: '' },
      whatsappNumber: { type: String, default: '' },
      phoneNumber: { type: String, default: '' },
      emailId: { type: String, default: '' },
      website: { type: String, default: '' },
      pincode: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      address: { type: String, default: '' },

      // Logo & Media (Cloudinary URLs)
      schoolLogo: { type: String, default: '' },
      watermarkLogo: { type: String, default: '' },
      authoritySignature: { type: String, default: '' },
      marksheetQrCode: { type: String, default: '' },

      // Language & Currency
      country: { type: String, default: '' },
      currency: { type: String, default: '' },
      language: { type: String, default: 'English|Hindi' },

      // Others
      weekOffDay: { type: String, default: 'Sunday' },
      gstNo: { type: String, default: '' },
      fontForPdf: { type: String, default: 'Helvetica' },
      aboutSchool: { type: String, default: '' },
      admissionFormNote: { type: String, default: '' }, // rich-text HTML
    },
  },
  { timestamps: true }
);

// Sync isOasesEnabled ↔ modules.oases on every save
schoolSettingsSchema.pre('save', function (next) {
  if (this.isModified('modules.oases')) {
    this.isOasesEnabled = this.modules.oases;
  }
  next();
});

module.exports = mongoose.model('SchoolSettings', schoolSettingsSchema);
