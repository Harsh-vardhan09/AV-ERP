/**
 * MarksSourceService  (OASES-Ready Abstraction)
 *
 * Single source of truth for fetching student marks.
 * Internally routes to the correct data source based on school settings:
 *
 *   OASES enabled  → stub (logs warning, returns [])
 *                    Ready for real OASES implementation when the model is built.
 *   OASES disabled → MarksModel (default)
 *
 * ╔════════════════════════════════════════════════════════════════╗
 * ║  HOW TO ADD OASES SUPPORT LATER:                               ║
 * ║  1. Create the OASESResult mongoose model                      ║
 * ║  2. Replace the stub block below with:                         ║
 * ║     const OASESResult = require('../models/OASESResult');       ║
 * ║     return await OASESResult.find({ studentId, schoolId,       ║
 * ║       examId: { $in: examIds } }).lean();                      ║
 * ║  3. Map returned docs to the MarksModel shape:                 ║
 * ║     { examId, subjectId, marksType, marksObtained }            ║
 * ╚════════════════════════════════════════════════════════════════╝
 */

const MarksModel    = require('../models/MarksModel');
const School        = require('../models/School');
const SchoolSettings= require('../models/SchoolSettings');

class MarksSourceService {

  /**
   * Fetch marks records for a student, routing to OASES or MarksModel.
   *
   * ID MISMATCH FIX (permanent):
   *   MarksModel.studentId was sometimes stored as User._id, sometimes as
   *   StudentProfile._id depending on which controller uploaded the marks.
   *   We always query with $in: [userId, studentProfileId] so we find marks
   *   regardless of which ID was used at upload time.
   *
   * @param {Object} params
   * @param {string|ObjectId} params.studentId       User._id (primary)
   * @param {string|ObjectId} params.studentProfileId StudentProfile._id (fallback)
   * @param {string|ObjectId} params.classId
   * @param {string|ObjectId} params.sessionId
   * @param {string|ObjectId} params.schoolId
   * @param {Array}           params.examIds    Array of exam ObjectIds to scope
   * @returns {Promise<Array>}  Array of mark documents in canonical shape
   */
  static async getMarks({ studentId, studentProfileId, classId, sessionId, schoolId, examIds = [] }) {
    // Check school settings for OASES toggle
    const oasesEnabled = await this._isOASESEnabled(schoolId);

    if (oasesEnabled) {
      console.warn(
        `[MarksSource] OASES is enabled for school ${schoolId} but the ` +
        `OASES marks model is not yet implemented. ` +
        `Report will show N/A for all marks. ` +
        `See marksSourceService.js for implementation notes.`
      );
      return [];
    }

    // ── Build ID candidates ─────────────────────────────────────────────────
    // Always query with $in so marks stored with either ID are found.
    const idCandidates = [studentId];
    if (studentProfileId && String(studentProfileId) !== String(studentId)) {
      idCandidates.push(studentProfileId);
    }

    const filter = {
      studentId: idCandidates.length === 1 ? idCandidates[0] : { $in: idCandidates },
      classId,
      session: sessionId,
      schoolId,
    };
    if (examIds.length > 0) {
      filter.examId = { $in: examIds };
    }

    const marks = await MarksModel.find(filter).lean();
    console.log(`[MarksSource] Query ids=${idCandidates.map(String).join(',')} → ${marks.length} marks found`);
    return marks;
  }

  /**
   * Check if OASES is enabled for the given school.
   * Looks for `modules.OASES.enabled` on the school settings/profile.
   *
   * @param {string|ObjectId} schoolId
   * @returns {Promise<boolean>}
   */
  static async _isOASESEnabled(schoolId) {
    try {
      const settings = await SchoolSettings.findOne({ schoolId }).select('modules').lean();
      if (settings?.modules?.OASES?.enabled) return true;

      const school = await School.findById(schoolId).select('settings modules').lean();
      return !!(school?.modules?.OASES?.enabled || school?.settings?.oasesEnabled);
    } catch {
      return false;
    }
  }
}

module.exports = MarksSourceService;
