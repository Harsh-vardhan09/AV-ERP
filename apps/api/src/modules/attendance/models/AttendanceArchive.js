const mongoose = require('mongoose');

/**
 * Verbatim copy of the per-period Attendance documents, taken BEFORE they are
 * collapsed into DailyAttendance.
 *
 * Deliberately schemaless (`strict: false`): the point is to preserve exactly
 * what was there, including any field the old schema never declared. A typed
 * copy would silently drop whatever it did not know about, which defeats the
 * purpose of an archive.
 *
 * Append-only in practice. Nothing reads it in normal operation; it exists so
 * the collapse can be audited or reversed.
 */
const attendanceArchiveSchema = new mongoose.Schema(
  {
    // The _id of the original Attendance document, so a row can be traced back
    // and so re-running the archive step is idempotent.
    originalId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    archivedAt: { type: Date, default: Date.now },
    archivedBy: { type: String, default: 'migration' },
    // The original document, untouched
    document: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { strict: false, timestamps: false }
);

module.exports = mongoose.model('AttendanceArchive', attendanceArchiveSchema);
