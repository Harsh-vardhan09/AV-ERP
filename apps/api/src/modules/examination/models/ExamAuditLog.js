// Append-only trail for exam lifecycle changes (edit / archive / delete / unlock).
//
// Separate from MarksAuditLog on purpose: that model describes a marks UPLOAD and
// requires classId, sectionId, subjectId, uploadMethod and studentCount, none of
// which an exam edit has. Writing exam events there would mean faking five
// required fields and breaking the marks audit UI that reads it.
//
// Modelled on oases/models/AuditLog, which could not be reused directly: the
// oases module dependsOn examination, so importing it here is a dependency cycle,
// and oases/index.js exports nothing.
const mongoose = require('mongoose');

const examAuditLogSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam is required'],
      index: true,
    },
    // Denormalised: a hard delete removes the Exam, and an audit row that can no
    // longer say which exam it described is useless.
    examName: { type: String, required: [true, 'Exam name is required'] },

    action: {
      type: String,
      enum: ['updated', 'archived', 'restored', 'deleted', 'unlocked'],
      required: [true, 'Action is required'],
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor is required'],
    },
    actorRole: { type: String, required: [true, 'Actor role is required'] },

    // Only the fields that actually changed, so a diff stays readable.
    before: { type: mongoose.Schema.Types.Mixed, default: {} },
    after: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Set when the action destroyed marks, so the count survives the rows.
    marksAffected: { type: Number, default: 0 },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      index: true,
      required: [true, 'School context is required'],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

examAuditLogSchema.index({ schoolId: 1, createdAt: -1 });

// Append-only. A trail that can be edited is not a trail.
const refuse = function () {
  throw new Error('ExamAuditLog is append-only — no updates or deletes.');
};
examAuditLogSchema.pre('findOneAndUpdate', refuse);
examAuditLogSchema.pre('updateOne', refuse);
examAuditLogSchema.pre('updateMany', refuse);
examAuditLogSchema.pre('findOneAndDelete', refuse);
examAuditLogSchema.pre('deleteOne', refuse);
examAuditLogSchema.pre('deleteMany', refuse);

module.exports = mongoose.model('ExamAuditLog', examAuditLogSchema);
