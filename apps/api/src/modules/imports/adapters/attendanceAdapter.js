/**
 * AttendanceAdapter — real codebase integration
 *
 * Attendance is stored as ONE document per class+section+date+attendanceType with
 * an embedded records[] array, not one document per student. A CSV row describes
 * one entry inside that array, so this adapter finds-or-creates the parent
 * document and then upserts the student's entry into records[].
 *
 * Duplicate handling lives here on purpose: migrations 07 and 08 dropped the
 * unique attendance index and moved prevention into application logic.
 *
 * Every write is stamped with schoolId, and every lookup is filtered by it
 * (NON-NEGOTIABLE #3 in IMPORT_SYSTEM_ARCHITECTURE.md).
 */

const BaseAdapter = require('./baseAdapter');
const DateNormalizer = require('../utils/dateNormalizer');
const { normalizeStatus, ATTENDANCE_STATUSES } = require('../configs/attendanceImportConfig');
const logger = require('../../../core/logging/logger.js');

// Lazy requires to avoid circular deps (same pattern as studentAdapter)
const getModels = () => ({
  Attendance: require('../../attendance').Attendance,
  StudentProfile: require('../../people').StudentProfile,
  ClassModel: require('../../academics').ClassModel,
  SectionModel: require('../../academics').SectionModel,
  AcademicSession: require('../../academics').AcademicSession,
});

/**
 * A per-import-run lookup cache hung off the engine's context object.
 *
 * The engine calls the adapter one row at a time, so a true up-front batch query
 * is not expressible here. Memoising by lookup key collapses the N+1 to one query
 * per DISTINCT student / class / section — for a 500-row class-day file that is
 * ~3 queries instead of ~1500.
 * ponytail: memoisation, not prefetch. If a genuine batch hook lands on
 * BaseAdapter (prepare(rows)), move these to a single $in query per column.
 */
const cacheFor = (context) => {
  if (!context._attendanceCache) {
    context._attendanceCache = {
      student: new Map(),
      class: new Map(),
      section: new Map(),
      session: new Map(),
      doc: new Map(),
    };
  }
  return context._attendanceCache;
};

const memo = async (map, key, loader) => {
  if (map.has(key)) return map.get(key);
  const value = await loader();
  map.set(key, value);
  return value;
};

/** A structured, actionable row error. */
const fail = (field, value, message) => ({ field, value: value ?? '', message });

class AttendanceAdapter extends BaseAdapter {
  constructor(config = {}, services = {}) {
    super(config, services);
    this.entityType = 'attendance';
  }

  getEntityType() {
    return 'attendance';
  }
  getEntityConfig() {
    return this.config;
  }

  /**
   * Own the row flow rather than inheriting BaseAdapter.importRow, which returns
   * { success: true } around whatever create() gave back — a failed create would
   * otherwise be reported to the user as an imported row.
   *
   * Returns the shape the engine and service both read: `error` (a readable
   * one-liner) plus `errors` (structured {field, value, message} for ImportError).
   */
  async importRow(rowData, schoolId, context = {}) {
    const result = await this.create(rowData, schoolId, context);
    if (result.success) {
      return {
        success: true,
        id: result.id,
        data: result.data,
        action: result.action,
        warnings: [],
      };
    }
    const errors = result.errors || [];
    return {
      success: false,
      errors,
      error: errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join('; '),
    };
  }

  // LOOKUPS

  /** Student by admission number, then roll number, then studentId code. */
  async _resolveStudent(raw, schoolId, context) {
    const key = String(raw).trim();
    return memo(cacheFor(context).student, key.toLowerCase(), async () => {
      const { StudentProfile } = getModels();
      const rx = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      return (
        (await StudentProfile.findOne({ schoolId, admissionNumber: rx }).lean()) ||
        (await StudentProfile.findOne({ schoolId, rollNo: rx }).lean()) ||
        (await StudentProfile.findOne({ schoolId, studentId: rx }).lean()) ||
        null
      );
    });
  }

  async _resolveClass(name, schoolId, context) {
    const key = String(name).trim();
    return memo(cacheFor(context).class, key.toLowerCase(), async () => {
      const { ClassModel } = getModels();
      const rx = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      return (await ClassModel.findOne({ schoolId, name: rx }).lean()) || null;
    });
  }

  async _resolveSection(name, classId, schoolId, context) {
    const key = `${classId}:${String(name).trim().toLowerCase()}`;
    return memo(cacheFor(context).section, key, async () => {
      const { SectionModel } = getModels();
      const rx = new RegExp(
        `^${String(name)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        'i'
      );
      return (await SectionModel.findOne({ schoolId, name: rx }).lean()) || null;
    });
  }

  // VALIDATION

  /**
   * Validate one row. Returns an array of structured errors (empty = valid).
   * Never weakens a rule: a row that cannot be filed correctly fails here.
   */
  async validateRow(row, schoolId, context = {}) {
    const errors = [];

    const rawStudent = row.studentId ?? row.admissionNumber ?? row.rollNo;
    if (!rawStudent || !String(rawStudent).trim()) {
      errors.push(
        fail(
          'studentId',
          rawStudent,
          "Required. Give the student's admission number or roll number."
        )
      );
    }

    // Date
    let isoDate = null;
    if (!row.date || !String(row.date).trim()) {
      errors.push(fail('date', row.date, 'Required. Expected DD/MM/YYYY or YYYY-MM-DD.'));
    } else {
      try {
        isoDate = DateNormalizer.normalize(row.date);
      } catch (e) {
        errors.push(
          fail(
            'date',
            row.date,
            `${e.message} Expected DD/MM/YYYY, YYYY-MM-DD, or an Excel date cell.`
          )
        );
      }
    }

    // Status
    const status = normalizeStatus(row.status);
    if (!row.status || !String(row.status).trim()) {
      errors.push(
        fail(
          'status',
          row.status,
          `Required. Expected one of: ${ATTENDANCE_STATUSES.join(', ')} (or P/A/L).`
        )
      );
    } else if (!status) {
      errors.push(
        fail(
          'status',
          row.status,
          `Unrecognised status "${row.status}". Expected one of: ${ATTENDANCE_STATUSES.join(', ')} — short codes P, A, L are accepted.`
        )
      );
    }

    if (errors.length) return errors;

    // Student must exist in THIS school
    const student = await this._resolveStudent(rawStudent, schoolId, context);
    if (!student) {
      errors.push(
        fail(
          'studentId',
          rawStudent,
          `No student found with admission number or roll number "${rawStudent}" in this school.`
        )
      );
      return errors;
    }

    // Class/section are optional. When given they must resolve AND match the
    // student — otherwise the row would file attendance against the wrong class.
    if (row.className && String(row.className).trim()) {
      const classDoc = await this._resolveClass(row.className, schoolId, context);
      if (!classDoc) {
        errors.push(
          fail('className', row.className, `Class "${row.className}" not found in this school.`)
        );
      } else if (student.classId && String(student.classId) !== String(classDoc._id)) {
        errors.push(
          fail(
            'className',
            row.className,
            `Student "${rawStudent}" is not in class "${row.className}". Leave the column blank to use the student's own class.`
          )
        );
      }

      if (classDoc && row.sectionName && String(row.sectionName).trim()) {
        const sectionDoc = await this._resolveSection(
          row.sectionName,
          classDoc._id,
          schoolId,
          context
        );
        if (!sectionDoc) {
          errors.push(
            fail(
              'sectionName',
              row.sectionName,
              `Section "${row.sectionName}" not found in this school.`
            )
          );
        } else if (student.sectionId && String(student.sectionId) !== String(sectionDoc._id)) {
          errors.push(
            fail(
              'sectionName',
              row.sectionName,
              `Student "${rawStudent}" is not in section "${row.sectionName}".`
            )
          );
        }
      }
    }

    // The parent Attendance document cannot be built without these.
    if (!student.classId) {
      errors.push(
        fail(
          'className',
          row.className,
          `Student "${rawStudent}" has no class on their profile. Set it before importing attendance.`
        )
      );
    }
    if (!student.sectionId) {
      errors.push(
        fail(
          'sectionName',
          row.sectionName,
          `Student "${rawStudent}" has no section on their profile. Set it before importing attendance.`
        )
      );
    }
    if (!student.session) {
      errors.push(
        fail(
          'sessionName',
          row.sessionName,
          `Student "${rawStudent}" has no academic session on their profile. Set it before importing attendance.`
        )
      );
    }

    return errors;
  }

  // WRITE

  /**
   * Upsert one attendance entry.
   * Signature matches BaseAdapter.importRow → this.create(data, schoolId, context).
   */
  async create(row, schoolIdOrContext, maybeContext = {}) {
    const { Attendance } = getModels();

    // Two call conventions exist in this codebase and both reach here:
    //   BaseAdapter.importRow  → create(data, schoolId, context)
    //   ImportController       → create(data, { schoolId, ...context })
    const isCtxObject =
      schoolIdOrContext && typeof schoolIdOrContext === 'object' && !schoolIdOrContext._bsontype;
    const context = isCtxObject ? schoolIdOrContext : maybeContext || {};
    const schoolId = isCtxObject ? schoolIdOrContext.schoolId : schoolIdOrContext;

    try {
      if (!schoolId) {
        return {
          success: false,
          errors: [fail('schoolId', null, 'Missing school context for this import.')],
        };
      }

      const errors = await this.validateRow(row, schoolId, context);
      if (errors.length) return { success: false, errors };

      const rawStudent = row.studentId ?? row.admissionNumber ?? row.rollNo;
      const student = await this._resolveStudent(rawStudent, schoolId, context);
      const isoDate = DateNormalizer.normalize(row.date);
      const status = normalizeStatus(row.status);
      const attendanceType =
        String(row.attendanceType || 'hall').toLowerCase() === 'subject' ? 'subject' : 'hall';

      // Store the date at UTC midnight so one calendar day is one document.
      const date = new Date(`${isoDate}T00:00:00.000Z`);

      const takenBy = context.userId || context.user?._id;
      if (!takenBy) {
        return {
          success: false,
          errors: [
            fail(
              'takenBy',
              null,
              'Could not determine the importing user; attendance must record who took it.'
            ),
          ],
        };
      }

      const key = {
        schoolId,
        classId: student.classId,
        sectionId: student.sectionId,
        date,
        attendanceType,
      };

      // Duplicate prevention is application-level (migrations 07/08 dropped the
      // unique index), so find-or-create the parent day document.
      const docCacheKey = `${student.classId}:${student.sectionId}:${isoDate}:${attendanceType}`;
      const cache = cacheFor(context).doc;

      let doc = cache.get(docCacheKey);
      if (!doc) {
        doc = await Attendance.findOne(key);
        if (!doc) {
          doc = new Attendance({
            ...key,
            session: student.session,
            takenBy,
            records: [],
          });
        }
        cache.set(docCacheKey, doc);
      }

      const existing = doc.records.find((r) => String(r.studentId) === String(student._id));
      let action;
      if (existing) {
        // duplicateMode 'update' — re-importing a corrected file fixes the row
        // rather than creating a second entry for the same student and day.
        existing.status = status;
        action = 'updated';
      } else {
        doc.records.push({ studentId: student._id, status });
        action = 'created';
      }

      await doc.save();

      return {
        success: true,
        action,
        id: doc._id,
        data: { attendanceId: doc._id, studentId: student._id, date: isoDate, status, action },
      };
    } catch (err) {
      logger.error('[AttendanceAdapter] create() error:', err.message);
      return { success: false, errors: [fail(null, null, err.message)] };
    }
  }

  /**
   * A row is a duplicate when this student already has an entry on this day.
   * Reported for visibility; create() updates rather than rejecting.
   */
  async checkDuplicate(row, schoolId, context = {}) {
    const { Attendance } = getModels();
    try {
      const rawStudent = row.studentId ?? row.admissionNumber ?? row.rollNo;
      const student = await this._resolveStudent(rawStudent, schoolId, context);
      if (!student) return false;
      const isoDate = DateNormalizer.normalize(row.date);
      const found = await Attendance.findOne({
        schoolId,
        classId: student.classId,
        sectionId: student.sectionId,
        date: new Date(`${isoDate}T00:00:00.000Z`),
        'records.studentId': student._id,
      })
        .select('_id')
        .lean();
      return Boolean(found);
    } catch {
      return false;
    }
  }

  getTransformRules() {
    return this.config?.transformationRules || {};
  }
  getValidationRules() {
    return this.config?.fieldRules || {};
  }
}

module.exports = AttendanceAdapter;
