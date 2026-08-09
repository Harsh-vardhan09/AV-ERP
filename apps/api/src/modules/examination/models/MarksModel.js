const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubjectMaster',
      required: [true, 'Subject is required'],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassModel',
      required: [true, 'Class is required'],
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SectionModel',
      required: [true, 'Section is required'],
    },
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session is required'],
    },

    // ── OLD FORMAT (backward compat) ─────────────────────────────────────────────
    // Single mark value for one component (e.g. theory = 80)
    // Required ONLY for old-format records; new records use `fields` instead.
    marksObtained: {
      type: Number,
      required: false, // no longer always required — `fields` map handles new records
      min: 0,
    },

    // Type of marks: theory, practical, project, internal, or any custom type.
    // For NEW format records this will be set to the sentinel value "fields".
    // No enum restriction — allows custom components (e.g. 'viva', 'assignment')
    marksType: {
      type: String,
      default: 'theory',
      lowercase: true,
      trim: true,
      validate: { validator: (v) => v && v.length > 0, message: 'marksType cannot be empty' },
    },

    // ── NEW FORMAT (template-driven) ─────────────────────────────────────────────
    // Flexible key→value map where keys are template field names:
    //   { "math_theory": 80, "math_practical": 15, "science_project": 25 }
    // When this field is present (non-empty), the aggregator reads from here
    // instead of marksObtained + marksType.
    fields: {
      type: Map,
      of: Number,
      default: undefined, // undefined = old record (uses marksObtained)
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader (teacher) is required'],
    },
    remarks: String,

    // Multi-tenancy
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      index: true,
      required: [true, 'School context is required'],
    },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// OLD format: unique per exam + student + subject + marksType + school
// Allows theory AND practical for same subject in same exam as separate docs.
marksSchema.index(
  { examId: 1, studentId: 1, subjectId: 1, marksType: 1, schoolId: 1 },
  { unique: true }
);

// NEW format: one doc per exam + student + subject (when fields map is used)
// Non-unique since old-format docs may also exist for the same triple.
marksSchema.index({ examId: 1, studentId: 1, subjectId: 1, schoolId: 1 });

module.exports = mongoose.model('Marks', marksSchema);
