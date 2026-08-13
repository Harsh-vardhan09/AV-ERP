/**
 * DataAggregatorService  (v4 — fully dynamic, template-agnostic, OASES-ready)
 *
 * Data flow:
 *   ClassSubjectMap   → which subjects exist in the class
 *   MarksSourceService→ raw marks (routes to MarksModel or OASES based on school settings)
 *   ExamSubjectConfig → max marks per exam+subject + marksDistribution
 *   Exam              → exam name/type for term classification
 *   StudentProfile    → student identity (always live)
 *   Attendance        → daily attendance records
 *   AcademicSession   → year tokens
 *
 * Token families produced:
 *   Flat slug  : {{eng_obt_th}}, {{eng_obt_pr}}, {{eng_total}}, {{t1_theory}}, ...
 *   Loop       : {{#subjects}} {{name}} {{term1.theory}} {{#components}} {{/subjects}}
 *   Namespace  : {{student.*}}, {{summary.*}}, {{academic.*}}, {{attendance.*}}
 *   Global     : {{name}}, {{className}}, {{rollNo}}, {{grandTotal}}, {{grade}}, ...
 */

const StudentProfile = require('../../people').StudentProfile;
const ReportCard = require('../models/ReportCard');
const { ClassSubjectMap, AcademicSession } = require('../../academics');
const {
  ExamSubjectConfig,
  Exam,
  CoScholasticMark,
  marksSourceService: MarksSourceService, // OASES-ready abstraction
} = require('../../examination');
const Attendance = require('../../attendance').Attendance;
const School = require('../../tenancy').School;
const SchoolSettings = require('../../tenancy').SchoolSettings;
const logger = require('../../../core/logging/logger.js');

// CBSE co-scholastic part membership
// Normalised skill names (lowercase, alphanumeric only). Anything not listed
// here lands in Part A — see the _partOf() helper in _buildFlat.
// Matched as substrings so real-world compound names still land correctly
// (e.g. "Punctuality / Regularity", "Discipline / Confidence").
const CO_PART_B = [
  'regularity',
  'sincerity',
  'behaviour',
  'behavior',
  'values',
  'punctuality',
  'discipline',
  'attitude',
  'neatness',
  'cleanliness',
];
const CO_PART_C = [
  'selfawareness',
  'empathy',
  'communication',
  'literacy',
  'creative',
  'scientific',
  'criticalthinking',
  'problemsolving',
  'decisionmaking',
  'thinking',
  'awareness',
];

// Subject name → short slug
const SLUG_MAP = {
  english: 'eng',
  hindi: 'hin',
  sanskrit: 'san',
  urdu: 'urd',
  punjabi: 'pun',
  maths: 'mat',
  mathematics: 'mat',
  science: 'sci',
  biology: 'bio',
  physics: 'phy',
  chemistry: 'chem',
  'social science': 'sst',
  'social studies': 'sst',
  's.science': 'sst',
  'so. science': 'sst',
  'evs / science': 'evs',
  evs: 'evs',
  computer: 'comp',
  'computer science': 'comp',
  drawing: 'draw',
  'physical education': 'pe',
  'p.e.': 'pe',
  'general knowledge': 'gk',
  'g.k.': 'gk',
  history: 'his',
  geography: 'geo',
  civics: 'civ',
  economics: 'eco',
  accountancy: 'acc',
  'business studies': 'bst',
};

// Component abbreviation aliases for templates that use short tokens
const COMPONENT_ALIASES = {
  theory: 'th',
  practical: 'pr',
  project: 'proj',
  internal: 'int',
};

function subjectSlug(name = '') {
  const lower = name.toLowerCase().trim();
  if (SLUG_MAP[lower]) return SLUG_MAP[lower];
  return lower.replace(/[^a-z0-9]/g, '').slice(0, 4) || 'sub';
}

// Classify an exam name into nature: theory | practical | project | internal
function classifyExam(examName = '', examType = '') {
  const n = (examName + ' ' + examType).toLowerCase();
  if (/practical|lab|experiment|practicum/.test(n)) return 'practical';
  if (/project|assignment|portfolio/.test(n)) return 'project';
  if (/internal|viva|oral|assessment/.test(n)) return 'internal';
  return 'theory';
}

// Which term does this exam belong to?
// Term 1 = first half of year  (Half Yearly, Mid-Term, SA1, PT1, Unit Test 1)
// Term 2 = second half / final  (Annual, Final, Yearly, SA2, Term 2)
function classifyTerm(examName = '', examType = '') {
  const n = (examName + ' ' + examType).toLowerCase();
  // Term 1 identifiers are tested FIRST: "half yearly" contains "yearly", so
  // the term2 pattern below would otherwise swallow every half-yearly exam and
  // collapse Term I marks into Term II. No term1 pattern matches an annual /
  // final / SA-II name, so this ordering is safe.
  if (/term.?1|half.?year|midterm|mid.?term|sa.?1|unit.?test/i.test(n)) return 'term1';
  // Explicit Term 2 identifiers
  if (/term.?2|annual|final|yearly|sa.?2/i.test(n)) return 'term2';
  // Default: term1 (safer — avoids inflating annual/term2 totals)
  return 'term1';
}

// Safe number
const toNum = (v) => (v !== null && v !== undefined && isFinite(Number(v)) ? Number(v) : null);

// Grade
function gradeOf(pct) {
  if (pct >= 91) return 'A+';
  if (pct >= 81) return 'A';
  if (pct >= 71) return 'B+';
  if (pct >= 61) return 'B';
  if (pct >= 51) return 'C';
  if (pct >= 41) return 'D';
  return 'E';
}

// Format a date value
function fmtDate(raw) {
  if (!raw) return 'N/A';
  const d = new Date(raw);
  return isNaN(d.getTime())
    ? 'N/A'
    : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Main service
class DataAggregatorService {
  /**
   * getStudentSnapshot — single entry point for BOTH preview and PDF.
   *
   * examId is intentionally REMOVED. For report cards we ALWAYS aggregate
   * all exams in the session and split into term1 / term2 in code.
   * Filtering by a single exam was the root cause of the 808-total bug.
   */
  static async getStudentSnapshot({ studentId, schoolId, sessionId, examType = 'annual' }) {
    const t0 = Date.now();

    const [studentData, reportCard, sessionData, coScholastic, attendance, school] =
      await Promise.all([
        this._fetchStudent(studentId, schoolId),
        ReportCard.findOne({ studentId, schoolId, session: sessionId }).lean(),
        AcademicSession.findById(sessionId).lean(),
        this._fetchCoScholastic(studentId, schoolId, sessionId),
        this._fetchAttendance(studentId, schoolId, sessionId),
        this._fetchSchool(schoolId),
      ]);

    if (!studentData) throw new Error(`Student not found: ${studentId}`);

    // Always fetch ALL exams — never scope to a single examId
    const { rows: subjectRows, flatDynamicFields } = await this._aggregateMarks(
      studentData,
      schoolId,
      sessionId
    );

    const calc = this._calcTotals(subjectRows);
    const flatMap = this._buildFlat({
      studentData,
      reportCard,
      sessionData,
      subjectRows,
      calc,
      coScholastic,
      attendance,
      school,
    });

    // NOTE: flatDynamicFields is intentionally NOT injected into the root flatMap
    // Injecting it (Object.assign) caused all subjects to show the same marks because
    // Mustache walks up to the parent context when a field is undefined on a subject row.
    // Each subject row already carries its own field values (or explicit 0s). Safe to skip.
    if (flatDynamicFields && Object.keys(flatDynamicFields).length > 0) {
      logger.debug(
        '[DataAggregator] Dynamic field tokens available (subject-scoped only):',
        Object.keys(flatDynamicFields).length
      );
    }

    // Rank (centralized — no longer needed in controller)
    const classId = studentData.classId?._id || studentData.classId;
    if (flatMap.rank === 'N/A' && classId) {
      try {
        flatMap.rank = flatMap.rank_number = await this.getClassRank(
          studentId,
          classId,
          sessionId,
          schoolId
        );
      } catch {
        /* non-fatal */
      }
    }

    logger.debug(
      '[DataAggregator] Student:',
      flatMap.name,
      '| Subjects:',
      subjectRows.length,
      '| grandObt:',
      calc.grandObt,
      '/',
      calc.grandMax,
      '| rank:',
      flatMap.rank,
      '| dynamicFields:',
      Object.keys(flatDynamicFields || {}).length
    );
    subjectRows.forEach((r) => logger.debug(`  ├ ${r.name}: obt=${r.grandObt} max=${r.grandMax}`));

    return {
      ...flatMap,
      _meta: { generationTime: Date.now() - t0, subjectCount: subjectRows.length },
    };
  }

  /**
   * Fetch school identity + branding for the report header.
   *
   * Logo precedence: SchoolSettings.schoolProfile.schoolLogo (the topbar logo
   * uploaded via /admission/school-settings/upload-logo) → School.logoUrl.
   * Returns a plain object with '' defaults so templates never render "N/A"
   * or a broken <img> when a school hasn't uploaded anything.
   */
  static async _fetchSchool(schoolId) {
    const [school, settings] = await Promise.all([
      School.findById(schoolId).select('name code address phone email logoUrl udiseCode').lean(),
      SchoolSettings.findOne({ schoolId }).select('schoolProfile').lean(),
    ]);

    const p = settings?.schoolProfile || {};
    return {
      name: p.fullName || school?.name || '',
      shortName: p.shortName || school?.name || '',
      code: p.schoolCode || school?.code || '',
      tagline: p.tagline || '',
      address: p.address || school?.address || '',
      city: p.city || '',
      state: p.state || '',
      pincode: p.pincode || '',
      phone: p.phoneNumber || p.mobileNumber || school?.phone || '',
      email: p.emailId || school?.email || '',
      website: p.website || '',
      affiliatedTo: p.affiliatedTo || '',
      udiseCode: p.udiseCode || school?.udiseCode || '',
      logo: p.schoolLogo || school?.logoUrl || '',
      boardLogo: p.boardLogo || '',
      watermark: p.watermarkLogo || '',
      signature: p.authoritySignature || '',
      qrCode: p.marksheetQrCode || '',
    };
  }

  // Fetch student (always live)
  static async _fetchStudent(studentId, schoolId) {
    return StudentProfile.findOne({
      _id: studentId,
      schoolId,
      status: { $in: ['active', 'passed', 'passed_out'] },
    })
      .populate('userId', 'firstName lastName email')
      .populate('classId', 'name numericOrder')
      .populate('sectionId', 'name')
      .populate('session', 'name year startDate endDate')
      .lean();
  }

  static async _fetchCoScholastic(studentId, schoolId, sessionId) {
    const rc = await ReportCard.findOne({ studentId, schoolId, session: sessionId })
      .select('_id')
      .lean();
    if (!rc) return [];
    return CoScholasticMark.find({ reportCardId: rc._id, schoolId }).lean();
  }

  static async _fetchAttendance(studentId, schoolId, sessionId) {
    const student = await StudentProfile.findOne({ _id: studentId, schoolId })
      .select('classId sectionId')
      .lean();
    if (!student) return null;

    const records = await Attendance.find({
      classId: student.classId,
      sectionId: student.sectionId,
      session: sessionId,
      schoolId,
    }).lean();

    let total = 0,
      present = 0,
      absent = 0,
      late = 0,
      leave = 0;
    records.forEach((rec) => {
      const sr = (rec.records || []).find((r) => String(r.studentId) === String(studentId));
      if (sr) {
        total++;
        if (sr.status === 'present') present++;
        else if (sr.status === 'absent') absent++;
        else if (sr.status === 'late') late++;
        else if (sr.status === 'leave') leave++;
      }
    });

    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return {
      totalDays: total,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      leaveDays: leave,
      percentage: pct,
    };
  }

  /**
   * _aggregateMarks — THE CORE of the pipeline
   *
   * 1. Get subject list from ClassSubjectMap (source of truth)
   * 2. Get ALL exams for the class in this session
   * 3. Get ExamSubjectConfig (max marks per exam+subject)
   * 4. Get Marks uploaded by teachers (MarksModel) — always live
   * 5. Group by subject → { term1: { theory, practical, project }, term2: {...} }
   *
   * studentData.userId is the User reference in MarksModel.studentId
   */
  /**
   * _aggregateMarks — always aggregates ALL exams for the session.
   * Never filtered by examId; term classification happens in code.
   */
  static async _aggregateMarks(studentData, schoolId, sessionId) {
    const classId = studentData.classId?._id || studentData.classId;
    const userId = studentData.userId?._id || studentData.userId; // User._id
    const studentProfileId = studentData._id; // StudentProfile._id
    if (!classId) return [];

    // 1. Subjects for this class
    const subjectMappings = await ClassSubjectMap.find({ classId, session: sessionId, schoolId })
      .populate('subjectId', 'name')
      .sort({ createdAt: 1 })
      .lean();

    const subjects = subjectMappings
      .filter((m) => m.subjectId?.name)
      .map((m) => ({
        id: String(m.subjectId._id),
        name: m.subjectId.name,
        // idSlug: last 6 hex chars of MongoDB ObjectId — guaranteed unique per subject
        idSlug: String(m.subjectId._id).slice(-6),
      }));

    if (subjects.length === 0) return [];

    // 2. ALL exams for this class+session (never filtered by examId)
    // Use $or to handle both classIds (array) and classId (singular) schema variants
    const exams = await Exam.find({
      $or: [{ classIds: classId }, { classId: classId }],
      session: sessionId,
      schoolId,
    })
      .select('name type startDate')
      .lean();

    const examIds = exams.map((e) => e._id);
    logger.debug('[DataAggregator] Exams found:', exams.map((e) => e.name).join(', ') || 'NONE');

    // 3. Max marks per exam+subject (ExamSubjectConfig.classId is singular)
    const configs = await ExamSubjectConfig.find({
      examId: { $in: examIds },
      classId,
      schoolId,
    }).lean();
    const maxMap = {}; // `${examId}:${subjectId}` → maxMarks
    configs.forEach((c) => {
      maxMap[`${c.examId}:${c.subjectId}`] = c.maxMarks;
    });

    // 4. Actual marks — via MarksSourceService (OASES-aware)
    //    Pass BOTH userId and studentProfileId — service queries with $in to handle
    //    marks uploaded against either ID (permanent ID mismatch fix).
    const marksDocs = await MarksSourceService.getMarks({
      studentId: userId,
      studentProfileId: studentProfileId,
      classId,
      sessionId,
      schoolId,
      examIds,
    });

    // Build marks index: supports BOTH old and new format
    // OLD: marksIndex[`${examId}:${subjectId}:${marksType}`] = marksObtained
    // NEW: marksIndex[`${examId}:${subjectId}:${fieldName}`] = value  (from fields Map)
    //      ALSO: flatDynamicFields[fieldName] = value  (for direct template token resolution)
    const marksIndex = {};
    const flatDynamicFields = {}; // NEW: direct {{field}} → value, no subject prefix needed

    marksDocs.forEach((m) => {
      const examKey = String(m.examId);
      const subjectKey = String(m.subjectId);

      if (
        m.fields &&
        (m.fields instanceof Map ? m.fields.size > 0 : Object.keys(m.fields).length > 0)
      ) {
        // NEW FORMAT: iterate over all field entries
        const fieldsObj = m.fields instanceof Map ? Object.fromEntries(m.fields) : m.fields;
        Object.entries(fieldsObj).forEach(([fieldName, value]) => {
          // Index by examId:subjectId:fieldName (for component-level lookup)
          marksIndex[`${examKey}:${subjectKey}:${fieldName}`] = Number(value);
          // Also expose as direct flat token (template can use {{math_theory}} globally)
          flatDynamicFields[fieldName] = Number(value);
        });
      } else if (m.marksObtained !== undefined && m.marksObtained !== null) {
        // OLD FORMAT: single marksType → marksObtained
        const nature = (m.marksType || 'theory').toLowerCase().trim();
        marksIndex[`${examKey}:${subjectKey}:${nature}`] = Number(m.marksObtained);
      }
    });

    // Auto-discover ALL unique marksTypes per subject across all exams
    // This captures dynamic types (oral, viva, etc.) even when ExamSubjectConfig.marksDistribution is absent.
    const subjectMarksTypes = {}; // subjectId → Set<string>
    marksDocs.forEach((m) => {
      const sid = String(m.subjectId);
      if (
        m.fields &&
        (m.fields instanceof Map ? m.fields.size > 0 : Object.keys(m.fields).length > 0)
      ) {
        // NEW: field names ARE the mark types
        const fieldsObj = m.fields instanceof Map ? Object.fromEntries(m.fields) : m.fields;
        if (!subjectMarksTypes[sid]) subjectMarksTypes[sid] = new Set();
        Object.keys(fieldsObj).forEach((k) => subjectMarksTypes[sid].add(k));
      } else {
        const mtype = (m.marksType || 'theory').toLowerCase().trim();
        if (!subjectMarksTypes[sid]) subjectMarksTypes[sid] = new Set();
        subjectMarksTypes[sid].add(mtype);
      }
    });

    // All unique dynamic field names across ALL subjects
    // Used to zero-out missing fields on subject rows that have no marks,
    // preventing Mustache from walking up to parent context and bleeding marks
    // from one subject (e.g. Math) into unrelated subjects (Science, English…).
    const allDynamicFieldNames = new Set();
    Object.values(subjectMarksTypes).forEach((typeSet) =>
      typeSet.forEach((t) => allDynamicFieldNames.add(t))
    );

    // A stored field key may carry a term prefix ("t1_pertest") while the
    // configured component is the bare name ("pertest"). The upload path already
    // treats these as the same thing — teacherController.resolveFieldMax strips
    // /^t[12]_/ before looking up a component's max. This read path did not, so a
    // prefixed key missed every lookup below and the mark never reached
    // row[term].total / grandObt: the card showed 0 while the marks sat in Mongo.
    const readMark = (examKey, subjectKey, type) => {
      const direct = toNum(marksIndex[`${examKey}:${subjectKey}:${type}`]);
      if (direct !== null) return direct;
      for (const prefix of ['t1_', 't2_']) {
        const v = toNum(marksIndex[`${examKey}:${subjectKey}:${prefix}${type}`]);
        if (v !== null) return v;
      }
      return null;
    };

    // Normalized view of every component the config declares, used to spot field
    // keys that no configured component covers.
    const stripTerm = (k) =>
      String(k)
        .toLowerCase()
        .replace(/^t[12]_/, '');

    logger.debug('[DataAggregator] Total mark records fetched:', marksDocs.length);
    logger.debug(
      '[DataAggregator] MarksIndex keys (sample):',
      Object.keys(marksIndex).slice(0, 10)
    );
    logger.debug('[DataAggregator] All dynamic field names:', [...allDynamicFieldNames]);
    if (Object.keys(flatDynamicFields).length > 0) {
      logger.debug(
        '[DataAggregator] Dynamic field tokens (subject-scoped):',
        Object.keys(flatDynamicFields)
      );
    }

    // 5. Build per-subject aggregated rows
    const rows = subjects.map((sub) => {
      // Track whether ANY marks were actually uploaded for this student+subject.
      // Kept false when no MarksDocs exist → grade stays '' instead of 'E'
      let _hasMarks = false;

      const row = {
        id: sub.id,
        name: sub.name,
        slug: subjectSlug(sub.name),
        idSlug: sub.idSlug, // guaranteed-unique 6-char hex suffix of subjectId
        // term breakdown — keys added dynamically from marksDistribution
        term1: { total: 0, max: 0 },
        term2: { total: 0, max: 0 },
        maxMarks: { total: 0 },
        grandObt: 0,
        grandMax: 0,
      };

      exams.forEach((exam) => {
        const term = classifyTerm(exam.name, exam.type);

        // Resolve config for this exam+subject
        const cfg = configs.find(
          (c) => String(c.examId) === String(exam._id) && String(c.subjectId) === String(sub.id)
        );

        // GUARD: Skip this exam if there is NO ExamSubjectConfig for this subject
        //           AND no marks were actually uploaded for this exam+subject.
        //           Without this guard, every exam in the session (Unit Tests, PTs, etc.)
        //           adds a phantom 100 to grandMax even if the subject was never configured.
        const configuredMax = toNum(maxMap[`${exam._id}:${sub.id}`]); // null if no config
        const examHasMarks = marksDocs.some(
          (m) => String(m.examId) === String(exam._id) && String(m.subjectId) === String(sub.id)
        );

        if (configuredMax === null && !examHasMarks) {
          // No config, no marks → this exam is irrelevant for this subject. Skip it.
          logger.debug(
            `[DataAggregator] Skipping exam "${exam.name}" for subject "${sub.name}" — no config and no marks`
          );
          return;
        }

        // Use the EXACT admin-configured max. If no config but marks exist, derive from marks.
        // NEVER default to 100 — that was the root cause of inflation.
        const baseMax = configuredMax ?? 0;

        // Auto-discovered mark types: use actual types from DB if no marksDistribution
        let components;
        if (cfg?.marksDistribution?.length > 0) {
          components = cfg.marksDistribution; // [{type, label, maxMarks}]

          // Union in any field key the marks actually carry that no configured
          // component covers. Without this the aggregator reads ONLY the config's
          // component names, so marks stored under different keys are invisible and
          // the subject totals come out 0 while the marks exist. maxMarks is 0 for
          // these so they contribute obtained marks without inflating grandMax.
          const covered = new Set(components.map((c) => stripTerm(c.type)));
          const discovered = subjectMarksTypes[sub.id] ? [...subjectMarksTypes[sub.id]] : [];
          const extras = discovered.filter((k) => !covered.has(stripTerm(k)));
          if (extras.length > 0) {
            logger.warn(
              `[DataAggregator] Subject "${sub.name}": marks stored under field(s) ` +
                `[${extras.join(', ')}] that no ExamSubjectConfig component declares ` +
                `[${[...covered].join(', ')}]. Counting them toward the total, but the ` +
                `report template cannot address them by name — check the marks-entry ` +
                `template against the exam's marks distribution.`
            );
            components = [
              ...components,
              ...extras.map((k) => ({ type: k, label: k, maxMarks: 0 })),
            ];
          }
        } else {
          const discoveredTypes = subjectMarksTypes[sub.id] ? [...subjectMarksTypes[sub.id]] : [];
          if (discoveredTypes.length > 0) {
            components = discoveredTypes.map((mtype) => {
              // Use explicit per-type max from config if available; fall back to baseMax (not 100)
              let maxForType = baseMax;
              if (mtype === 'practical') maxForType = cfg?.practicalMaxMarks || 0;
              else if (mtype === 'project') maxForType = cfg?.projectMaxMarks || 0;
              else maxForType = cfg?.maxMarks ?? baseMax;
              return {
                type: mtype,
                label: mtype.charAt(0).toUpperCase() + mtype.slice(1),
                maxMarks: maxForType,
              };
            });
          } else {
            // Flat legacy fields — maxMarks must come from config only (no ??100 fallback)
            components = [{ type: 'theory', label: 'Theory', maxMarks: cfg?.maxMarks ?? baseMax }];
            if ((cfg?.practicalMaxMarks || 0) > 0)
              components.push({
                type: 'practical',
                label: 'Practical',
                maxMarks: cfg.practicalMaxMarks,
              });
            if ((cfg?.projectMaxMarks || 0) > 0)
              components.push({ type: 'project', label: 'Project', maxMarks: cfg.projectMaxMarks });
          }
        }

        // Accumulate grandMax ONCE per exam (not per dynamic field)
        // When using auto-discovered dynamic field names as components (no marksDistribution),
        // each field would otherwise add cfg.maxMarks to grandMax, inflating it to
        // (numFields × maxMarks). Instead, add the exam's total configured max ONCE.
        const hasDynamicFields =
          !cfg?.marksDistribution?.length && subjectMarksTypes[sub.id]?.size > 0;
        if (hasDynamicFields && baseMax > 0) {
          // Add exam's configured max ONCE — not per field
          row.grandMax += baseMax;
          row[term].max += baseMax;
          row.maxMarks.total += baseMax;
        }

        // Accumulate obtained marks per component
        components.forEach((comp) => {
          const { type } = comp;

          // Skip auto-calculated total fields — they are display-only sums.
          // Adding them again would double-count (e.g. grandObt = 284 instead of 142).
          const isAutoTotal = /total/i.test(type);
          const obt = readMark(exam._id, sub.id, type);

          if (isAutoTotal) {
            // Store for template display only — do not add to sums
            if (obt !== null && !row[term][type]) row[term][type] = obt;
            return;
          }

          // For static marksDistribution components, add per-component max as before
          if (!hasDynamicFields) {
            const max = Number(comp.maxMarks) || 0;
            if (max > 0 || obt !== null) {
              row.maxMarks[type] = (row.maxMarks[type] || 0) + max;
              row.maxMarks.total += max;
              row[term].max += max;
              row.grandMax += max;
            }
          }

          // Track obtained marks
          if (!row[term][type]) row[term][type] = null;
          if (obt !== null) {
            _hasMarks = true; // ← at least one real mark found
            row[term][type] = (row[term][type] || 0) + obt;
            row[term].total += obt;
            row.grandObt += obt;
          }
        });
      });

      // Build components[] array (dynamic, no hardcoding)
      // Collect all unique component types encountered across exams
      const componentMap = {}; // type → { type, label, marks: null|number, max: number }
      exams.forEach((exam) => {
        const cfg2 = configs.find(
          (c) => String(c.examId) === String(exam._id) && String(c.subjectId) === String(sub.id)
        );
        let comps;
        if (cfg2?.marksDistribution?.length > 0) {
          comps = cfg2.marksDistribution;
        } else {
          comps = [{ type: 'theory', label: 'Theory', maxMarks: cfg2?.maxMarks || 100 }];
          if ((cfg2?.practicalMaxMarks || 0) > 0)
            comps.push({ type: 'practical', label: 'Practical', maxMarks: cfg2.practicalMaxMarks });
          if ((cfg2?.projectMaxMarks || 0) > 0)
            comps.push({ type: 'project', label: 'Project', maxMarks: cfg2.projectMaxMarks });
        }
        comps.forEach(({ type, label, maxMarks: cMax }) => {
          if (!componentMap[type]) {
            componentMap[type] = { type, label: label || type, marks: null, max: 0 };
          }
          componentMap[type].max += Number(cMax) || 0;
          const obtained = readMark(exam._id, sub.id, type);
          if (obtained !== null) {
            componentMap[type].marks = (componentMap[type].marks || 0) + obtained;
          }
        });
      });

      row.components = Object.values(componentMap).map((c) => ({
        type: c.type,
        label: c.label,
        marks: c.marks ?? '',
        max: c.max,
        grade: c.max > 0 && c.marks !== null ? gradeOf((c.marks / c.max) * 100) : '',
      }));

      // FULLY DYNAMIC flat aliases
      // Emit obt_<component> / max_<component> for EVERY component found in
      // maxMarks — not just theory/practical/project.
      Object.keys(row.maxMarks || {}).forEach((component) => {
        if (component === 'total') return;
        const obtVal = row.term1?.[component] ?? row.term2?.[component] ?? null;
        row[`max_${component}`] = row.maxMarks[component] || 0;
        row[`obt_${component}`] = obtVal; // null = not entered (renders as '')
      });

      // Dynamic t1/t2 per component across exams
      const allDiscoveredTypes = subjectMarksTypes[sub.id] ? [...subjectMarksTypes[sub.id]] : [];
      allDiscoveredTypes.forEach((mtype) => {
        let t1Val = null,
          t2Val = null;
        exams.forEach((exam) => {
          const term = classifyTerm(exam.name, exam.type);
          const val = toNum(marksIndex[`${exam._id}:${sub.id}:${mtype}`]);
          if (val !== null) {
            if (term === 'term1') t1Val = (t1Val ?? 0) + val;
            else t2Val = (t2Val ?? 0) + val;
          }
        });
        row[`t1_${mtype}`] = t1Val; // null = not entered
        row[`t2_${mtype}`] = t2Val;
        if (t1Val !== null) row.term1[mtype] = t1Val;
        if (t2Val !== null) row.term2[mtype] = t2Val;
        // Also set obt_ alias if not already set
        if (row[`obt_${mtype}`] === undefined) {
          row[`obt_${mtype}`] = t1Val ?? t2Val ?? null;
        }
        // KEY FIX: expose raw field name directly on the row
        // Templates use {{subjects[0].t1_oral}} which reads subjects[i].t1_oral.
        // Without this, only subjects[i].t1_t1_oral existed (double-prefixed).
        // This also handles fields that already carry a term prefix (t1_oral, t2_theory).
        if (row[mtype] === undefined) {
          // Prefer the term-matched value, fall back to whichever is non-null
          const directVal = (mtype.startsWith('t2_') ? t2Val : t1Val) ?? t2Val ?? t1Val;
          row[mtype] = directVal;
        }
      });

      // Override grandObt with stored term totals (authoritative source)
      // t1_total / t2_total are canonical sums auto-filled by the teacher form.
      // Using them prevents double-counting AND gives the correct subject total
      // even when ExamSubjectConfig maxMarks doesn't align with dynamic field names.
      let _storedGrand = 0,
        _hasStoredTotals = false;
      exams.forEach((exam) => {
        ['t1_total', 't2_total'].forEach((tf) => {
          const v = toNum(marksIndex[`${exam._id}:${sub.id}:${tf}`]);
          if (v !== null) {
            _storedGrand += v;
            _hasStoredTotals = true;
            _hasMarks = true;
          }
        });
      });
      if (_hasStoredTotals) row.grandObt = _storedGrand;

      // Zero-out any dynamic field this subject is missing
      // Critical: without explicit 0s, Mustache walks up to parent flatMap context
      // and reads marks from whatever subject was last injected (the bleed-through bug).
      // By setting 0 on the row itself, we block the parent-context fallback.
      allDynamicFieldNames.forEach((fieldName) => {
        // The raw field name (e.g. 't1_oral') — template uses subjects[i].t1_oral
        if (row[fieldName] === undefined) row[fieldName] = 0;
        // Also cover t1_/t2_ prefixed versions that the row builder may emit
        if (row[`t1_${fieldName}`] === undefined) row[`t1_${fieldName}`] = 0;
        if (row[`t2_${fieldName}`] === undefined) row[`t2_${fieldName}`] = 0;
      });

      row.total = row.grandObt;
      row.grandTotal = row.grandObt; // per-subject alias — prevents Mustache parent fallback
      row.grand_total = row.grandObt;
      // Clamp pct to 100 so grade isn't deflated when stored totals exceed single-exam config max
      const _subPct = row.grandMax > 0 ? Math.min(100, (row.grandObt / row.grandMax) * 100) : null;
      // Only assign a letter grade when actual marks were uploaded.
      // Without this guard, students with no marks get grade 'E' (0/total = 0%)
      row.grade = _subPct !== null && _hasMarks ? gradeOf(_subPct) : '';
      row.remark = '';

      return row;
    });

    return { rows, flatDynamicFields };
  }

  // Grand totals across all subjects
  static _calcTotals(subjectRows) {
    let grandObt = 0,
      grandMax = 0;
    subjectRows.forEach((s) => {
      grandObt += s.grandObt || 0;
      grandMax += s.grandMax || 0;
    });
    const pct = grandMax > 0 ? Number(((grandObt / grandMax) * 100).toFixed(2)) : 0;
    return {
      grandObt,
      grandMax,
      percentage: pct,
      grade: grandMax > 0 ? gradeOf(pct) : 'N/A',
      subjectCount: subjectRows.length,
    };
  }

  // Build the COMPLETE flat token map
  static _buildFlat({
    studentData,
    reportCard,
    sessionData,
    subjectRows,
    calc,
    coScholastic,
    attendance,
    school,
  }) {
    const d = {};

    // School identity & branding
    // Empty string (not 'N/A') on purpose: these land in headers and <img> tags,
    // where "N/A" would print literally. _normalizeData builds the school.*
    // namespace from these; the parser's fuzzy matcher maps {{school-name}},
    // {{school_name}} and {{schoolName}} onto d.schoolName automatically.
    const sc = school || {};
    d.schoolName = d.school_name = sc.name || '';
    d.schoolShortName = d.school_shortname = sc.shortName || '';
    d.schoolCode = d.school_code = sc.code || '';
    d.schoolTagline = d.school_tagline = sc.tagline || '';
    d.schoolAddress = d.school_address = [sc.address, sc.city, sc.state, sc.pincode]
      .filter(Boolean)
      .join(', ');
    d.schoolPhone = d.school_phone = sc.phone || '';
    d.schoolEmail = d.school_email = sc.email || '';
    d.schoolWebsite = d.school_website = sc.website || '';
    d.affiliatedTo = d.affiliated_to = sc.affiliatedTo || '';
    d.udiseCode = d.udise_code = sc.udiseCode || '';
    // Raw asset URLs — the parser turns schoolLogo into the {{school-logo}} <img> tag.
    d.schoolLogoUrl = sc.logo || '';
    d.schoolWatermarkUrl = sc.watermark || '';
    d.schoolSignatureUrl = sc.signature || '';
    d.schoolQrCodeUrl = sc.qrCode || '';
    // Optional board/affiliation crest — no upload slot exists yet, so this is
    // '' today and {{board-logo}} renders nothing. Wiring an uploader later
    // only needs schoolProfile.boardLogo to be populated.
    d.boardLogoUrl = sc.boardLogo || '';
    // Student photo for the CBSE photo box; '' → {{student-photo}} renders nothing.
    d.studentPhotoUrl = studentData.photo || '';

    // Student identity
    const fullName =
      [studentData.firstName, studentData.middleName, studentData.lastName]
        .filter(Boolean)
        .join(' ') || 'N/A';
    d.name = d.student_name = d.studentName = fullName;
    d.firstName = d.first_name = studentData.firstName || '';
    d.lastName = d.last_name = studentData.lastName || '';
    d.middleName = studentData.middleName || '';

    d.scholarNo =
      d.scholar_no =
      d.scholarNumber =
      d.scholar_number =
        studentData.scholarNo || 'N/A';
    d.rollNo = d.roll_no = d.rollNumber = d.roll_number = studentData.rollNo || 'N/A';
    d.admissionNumber =
      d.admission_number =
      d.admissionNo =
      d.admission_no =
        studentData.admissionNumber || 'N/A';
    d.pen = studentData.pen || 'N/A';

    // Class & section
    const className = studentData.classId?.name || 'N/A';
    const sectionName = studentData.sectionId?.name || 'N/A';
    d.className = d.class_name = d.class = className;
    d.sectionName = d.section_name = d.section = sectionName;
    d.classSection = d.class_section = `${className} ${sectionName}`.trim();
    d._studentClassId = studentData.classId?._id || studentData.classId || null;
    d._studentSectionId = studentData.sectionId?._id || studentData.sectionId || null;

    // Personal
    d.dateOfBirth = d.date_of_birth = d.dob = fmtDate(studentData.dateOfBirth);
    d.gender = studentData.gender || 'N/A';
    d.nationality = studentData.nationality || 'Indian';
    d.religion = studentData.religion || 'N/A';
    d.caste = studentData.caste || 'N/A';
    d.category = studentData.category || 'N/A';
    d.bloodGroup = d.blood_group = studentData.bloodGroup || 'N/A';

    // Parents
    const fName = studentData.parentDetails?.father?.name || 'N/A';
    const mName = studentData.parentDetails?.mother?.name || 'N/A';
    d.fatherName = d.father_name = d.father = fName;
    d.motherName = d.mother_name = d.mother = mName;
    d.parentName = d.parent_name = `${fName} / ${mName}`;
    d.fatherOccupation = d.father_occupation =
      studentData.parentDetails?.father?.occupation || 'N/A';
    d.motherOccupation = d.mother_occupation =
      studentData.parentDetails?.mother?.occupation || 'N/A';
    d.fatherPhone = d.father_phone = studentData.parentDetails?.father?.phone || 'N/A';
    d.motherPhone = d.mother_phone = studentData.parentDetails?.mother?.phone || 'N/A';

    // Contact
    d.address = studentData.address || 'N/A';
    d.city = studentData.city || 'N/A';
    d.state = studentData.state || 'N/A';
    d.pincode = studentData.pincode || 'N/A';
    d.phone = studentData.phone || 'N/A';
    d.email = studentData.userId?.email || 'N/A';

    // Session / Academic year
    const sessName = sessionData?.name || studentData.session?.name || 'N/A';
    const sessYear = sessionData?.year || studentData.session?.year || sessName;
    const startDate = sessionData?.startDate || studentData.session?.startDate;
    const endDate = sessionData?.endDate || studentData.session?.endDate;

    d.session = sessName;
    d.academicYear = d.academic_year = d.sessionYear = d.session_year = sessYear;
    d.session_start_date = startDate ? fmtDate(startDate) : 'N/A';
    d.session_end_date = endDate ? fmtDate(endDate) : 'N/A';

    const yp = (sessYear || '').split('-');
    d.year_start = d.appear_year_start = d.year_start1 = d.year_start2 = yp[0]?.trim() || 'N/A';
    d.year_end = d.appear_year_end = d.year_end1 = d.year_end2 = yp[1]?.trim() || 'N/A';
    d.appear_year = sessYear;

    // Attendance (flat — never an object)
    const att = attendance || {
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      leaveDays: 0,
      percentage: 0,
    };
    d.attendance = `${att.presentDays}/${att.totalDays} (${att.percentage}%)`;
    d.attendance_str = d.attendance;
    d.attendance_data = { ...att };
    d.attendance_total = d.total_days = att.totalDays;
    d.attendance_present = d.present_days = att.presentDays;
    d.attendance_absent = d.absent_days = att.absentDays;
    d.attendance_late = d.late_days = att.lateDays;
    d.attendance_leave = d.leave_days = att.leaveDays;
    d.attendance_percentage = d.attendance_percent = att.percentage;

    // Subjects (loop-ready array)
    d.subjects = subjectRows;

    // Grand totals
    d.grandTotal = d.grand_total = d.totalMarks = d.total_marks = calc.grandObt;
    d.grandMaxTotal = d.grand_max_total = d.gt_max_th = d.gt_max_theory = calc.grandMax;
    d.gt_obt_th = d.gt_obt_theory = calc.grandObt;
    d.gt_max_pr = d.gt_max_practical = 0;
    d.gt_obt_pr = d.gt_obt_practical = 0;
    d.gt_total = calc.grandObt;
    d.totalPercentage = d.total_percentage = d.percentage = calc.percentage;
    d.totalGrade = d.total_grade = d.grade = d.final_grade = calc.grade;
    // {{overall-grade}} / {{overall_grade}} — used by the CBSE summary strip
    d.overallGrade = d.overall_grade = calc.grade;
    d.rank = d.rank_number = 'N/A';
    d.subjectCount = d.subject_count = calc.subjectCount;

    // Per-subject FLAT slug tokens
    // Primary key: sub_N (1-based) — never collides regardless of subject name.
    // Secondary key: slug-prefixed — deduplicated with numeric suffix if collision.
    const usedSlugs = {};
    subjectRows.forEach((sub, idx) => {
      let slug = sub.slug;
      usedSlugs[slug] = (usedSlugs[slug] || 0) + 1;
      const safeSlug = usedSlugs[slug] > 1 ? `${slug}${usedSlugs[slug]}` : slug;

      const tot = sub.total ?? sub.grandObt ?? '';
      const maxT = sub.grandMax || '';
      const gr = sub.grade || '';

      // Slug-prefixed tokens (name-based, may collide for similar names)
      d[`${safeSlug}_name`] = sub.name;
      d[`${safeSlug}_total`] = d[`${safeSlug}_marks`] = tot;
      d[`${safeSlug}_max`] = maxT;
      d[`${safeSlug}_grade`] = gr;
      d[`${safeSlug}_remark`] = sub.remark || '';

      // Emit obt_<component> / max_<component> for every component in this subject
      Object.keys(sub.maxMarks || {}).forEach((component) => {
        if (component === 'total') return;
        d[`${safeSlug}_max_${component}`] = sub.maxMarks[component] || 0;
        d[`${safeSlug}_obt_${component}`] = sub[`obt_${component}`] ?? '';
        // Also emit abbreviated aliases (theory->th, practical->pr, project->proj, internal->int)
        const alias = COMPONENT_ALIASES[component];
        if (alias) {
          d[`${safeSlug}_max_${alias}`] = sub.maxMarks[component] || 0;
          d[`${safeSlug}_obt_${alias}`] = sub[`obt_${component}`] ?? '';
        }
      });
      // Expose all t1/t2 component tokens under slug prefix
      ['term1', 'term2'].forEach((termKey, ti) => {
        const T = sub[termKey] || {};
        const tLabel = `t${ti + 1}`;
        Object.keys(T).forEach((k) => {
          if (!['total', 'max'].includes(k)) {
            d[`${safeSlug}_${tLabel}_${k}`] = T[k];
          }
        });
        d[`${safeSlug}_${tLabel}_total`] = T.total || 0;
      });

      // PRIMARY index-based tokens — stable, never collide
      const i = idx + 1;
      d[`sub_${i}_name`] = sub.name;
      d[`sub_${i}_id`] = String(sub.id || '');
      d[`sub_${i}_idSlug`] = sub.idSlug || '';
      d[`sub_${i}_slug`] = safeSlug;
      d[`sub_${i}_total`] = tot;
      d[`sub_${i}_max`] = maxT;
      d[`sub_${i}_grade`] = gr;
      d[`sub_${i}_remark`] = sub.remark || '';
      // sub_N_obt_<component> / sub_N_max_<component> for every component
      Object.keys(sub.maxMarks || {}).forEach((component) => {
        if (component === 'total') return;
        d[`sub_${i}_max_${component}`] = sub.maxMarks[component] || 0;
        d[`sub_${i}_obt_${component}`] = sub[`obt_${component}`] ?? '';
        const alias = COMPONENT_ALIASES[component];
        if (alias) {
          d[`sub_${i}_max_${alias}`] = sub.maxMarks[component] || 0;
          d[`sub_${i}_obt_${alias}`] = sub[`obt_${component}`] ?? '';
        }
      });

      // sid_<idSlug>_* tokens — GUARANTEED UNIQUE, use to avoid slug collision
      // e.g. English (eng) vs Engineering (eng2) → sid_a3f91c_name, sid_b7d002_name
      // Template authors can use {{sid_a3f91c_obt_theory}} for guaranteed unique reference
      if (sub.idSlug) {
        const idKey = `sid_${sub.idSlug}`;
        d[`${idKey}_name`] = sub.name;
        d[`${idKey}_total`] = tot;
        d[`${idKey}_max`] = maxT;
        d[`${idKey}_grade`] = gr;
        Object.keys(sub.maxMarks || {}).forEach((component) => {
          if (component === 'total') return;
          d[`${idKey}_max_${component}`] = sub.maxMarks[component] || 0;
          d[`${idKey}_obt_${component}`] = sub[`obt_${component}`] ?? '';
          const alias = COMPONENT_ALIASES[component];
          if (alias) {
            d[`${idKey}_max_${alias}`] = sub.maxMarks[component] || 0;
            d[`${idKey}_obt_${alias}`] = sub[`obt_${component}`] ?? '';
          }
        });
      }
    });

    // Report card meta
    // Result: always compute from percentage (33% = pass threshold), don't require isFinalized
    const passPct = 33;
    const computedResult =
      calc.grandMax > 0 ? (calc.percentage >= passPct ? 'PASS' : 'FAIL') : 'N/A';

    if (reportCard) {
      d.rank = d.rank_number = reportCard.rank || d.rank;
      d.result = d.result_status = reportCard.isFinalized ? computedResult : computedResult; // show PASS/FAIL regardless of finalization
      d.remarksTerm1 = d.remarks_term_1 = reportCard.remarksTerm1 || '';
      d.remarksTerm2 = d.remarks_term_2 = reportCard.remarksTerm2 || '';
      d.remark = reportCard.remarksTerm1 || reportCard.remarksTerm2 || '';
      d.isFinalized = d.is_finalized = reportCard.isFinalized || false;
      d.heightTerm1 = d.height_term_1 = reportCard.healthTerm1?.height || 'N/A';
      d.weightTerm1 = d.weight_term_1 = reportCard.healthTerm1?.weight || 'N/A';
      d.heightTerm2 = d.height_term_2 = reportCard.healthTerm2?.height || 'N/A';
      d.weightTerm2 = d.weight_term_2 = reportCard.healthTerm2?.weight || 'N/A';
    } else {
      // No report card doc yet — still compute result from live marks
      d.result = d.result_status = computedResult;
      d.remark = '';
    }

    // Helper: convert 0-10 numeric term marks → letter grade (A, B, C, D)
    const _numToLetterGrade = (val) => {
      if (val === null || val === undefined || val === '') return '';
      const n = Number(val);
      if (isNaN(n)) return String(val); // already a letter — pass through
      if (n >= 9) return 'A+';
      if (n >= 7) return 'A';
      if (n >= 5) return 'B';
      if (n >= 3) return 'C';
      if (n >= 1) return 'D';
      return '';
    };

    // Build CLEAN loop-safe co_scholastic items.
    // CRITICAL: never spread raw Mongoose docs (contains _id, reportCardId, createdAt…)
    // which bleed into every loop-item context and resolve template tokens incorrectly.
    const _cleanCoItems = (coScholastic || []).map((c, idx) => {
      const skillName = (c.skillName || c.name || c.activity || '').trim();

      // Priority: new string t1Grade/t2Grade → numeric term marks → empty
      const t1Grade =
        c.t1Grade || // new field set by upgraded save controller
        (c.term1Marks != null ? _numToLetterGrade(c.term1Marks) : '');
      const t2Grade = c.t2Grade || (c.term2Marks != null ? _numToLetterGrade(c.term2Marks) : '');
      const overallGrade = c.grade || t1Grade || t2Grade || '';

      return {
        activity: skillName,
        name: skillName,
        skillName,
        grade: overallGrade,
        // Term-split grades (T1/T2 columns in PDF template)
        t1_grade: t1Grade,
        t2_grade: t2Grade,
        t1: t1Grade,
        t2: t2Grade,
        // Raw numeric marks (for templates that display numbers)
        term1: c.term1Marks ?? '',
        term2: c.term2Marks ?? '',
        index: idx + 1,
      };
    });

    // Drop any DB records whose skillName is a reserved system token
    // These end up in the DB when old/buggy code saved template row-labels
    // (Overall Total, T1, T2, Element, Remarks, Promoted Class, Date, Rank…)
    // as skill names. They must never appear in the {{#co_scholastic}} loop.
    const RESERVED_SKILL_NAMES = new Set([
      'overall',
      'overalltotal',
      'overalltotals',
      'overall_total',
      'overallrank',
      'overall_rank',
      'overallgrade',
      'overall_grade',
      't1',
      't2',
      'term1',
      'term2',
      'element',
      'elements',
      'remarks',
      'remark',
      'promotedclass',
      'promoted_class',
      'promoted',
      'promotedto',
      'date',
      'dates',
      'total',
      'totals',
      'grandtotal',
      'grand_total',
      'rank',
      'result',
      'grade',
      'grades',
      'signature',
      'principal',
      'teacher',
    ]);
    const _validCoItems = _cleanCoItems.filter((c) => {
      if (!c.skillName) return false;
      const norm = c.skillName.toLowerCase().replace(/[^a-z0-9]/g, '');
      return !RESERVED_SKILL_NAMES.has(norm);
    });

    d.co_scholastic = _validCoItems;
    d.coScholastic = _validCoItems; // camelCase alias
    d.skills = _validCoItems.map((c) => ({ name: c.skillName, grade: c.grade }));
    d.observations = d.skills; // alias for {{#observations}} templates

    // CBSE Part A / B / C split
    // CoScholasticMark has no "part" column, so the three-table CBSE layout
    // can't come from the schema. Derive it from the cleaned list by skill
    // name; anything unrecognised falls into Part A so no skill is ever lost.
    // Existing {{#co_scholastic}} consumers are unaffected — this is additive.
    const _partOf = (skillName) => {
      const n = String(skillName)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (CO_PART_B.some((k) => n.includes(k))) return 'b';
      if (CO_PART_C.some((k) => n.includes(k))) return 'c';
      return 'a';
    };
    d.co_scholastic_a = [];
    d.co_scholastic_b = [];
    d.co_scholastic_c = [];
    _validCoItems.forEach((c) => d[`co_scholastic_${_partOf(c.skillName)}`].push(c));
    // Re-index within each part so {{index}} counts per table
    ['a', 'b', 'c'].forEach((p) => {
      d[`co_scholastic_${p}`] = d[`co_scholastic_${p}`].map((c, i) => ({ ...c, index: i + 1 }));
    });

    // Expose each skill as a FLAT field by its normalised name
    // e.g. skillName = "Discipline" → d.discipline = "A", d.discipline_t1 = "A"
    // Use _validCoItems for flat tokens — only emit tokens for legitimate skills
    _validCoItems.forEach((c, idx) => {
      const rawName = c.skillName;
      const slug =
        rawName
          .toLowerCase()
          .split(/[^a-z0-9]+/)[0] // first word only: avoids super-long slugs
          .replace(/[^a-z0-9]/g, '') || `skill${idx}`;
      const fullSlug = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');

      // By first-word slug (e.g. d.discipline = "A")
      d[slug] = c.grade;
      d[`${slug}_grade`] = c.grade;
      d[`${slug}_t1`] = c.t1_grade;
      d[`${slug}_t2`] = c.t2_grade;
      d[`${slug}_t1_grade`] = c.t1_grade;
      d[`${slug}_t2_grade`] = c.t2_grade;

      // By full slug (e.g. d.discipline_confidence = "A")
      d[fullSlug] = c.grade;
      d[`${fullSlug}_grade`] = c.grade;
      d[`${fullSlug}_t1`] = c.t1_grade;
      d[`${fullSlug}_t2`] = c.t2_grade;

      // By index (e.g. d.skill_1_name / d.skill_1_grade)
      d[`skill_${idx + 1}_name`] = rawName;
      d[`skill_${idx + 1}_grade`] = c.grade;
      d[`skill_${idx + 1}_t1`] = c.t1_grade;
      d[`skill_${idx + 1}_t2`] = c.t2_grade;
    });

    // Default values for common co-scholastic / behaviour template tokens
    // Ensures templates that reference {{discipline}}, {{activity}} etc. never
    // trigger a "Missing Fields" warning when no CoScholasticMark record exists.
    const _coDefaults = [
      'discipline',
      'punctuality',
      'behaviour',
      'behavior',
      'neatness',
      'regularity',
      'activity',
      'games',
      'sports',
      'drawing',
      'music',
      'dance',
      'confidence',
      'leadership',
      'communication',
      'hygiene',
    ];
    _coDefaults.forEach((token) => {
      if (d[token] === undefined || d[token] === null) d[token] = '';
      if (d[`${token}_grade`] === undefined) d[`${token}_grade`] = '';
    });

    // PromotedTo
    // Compute actual next class name by incrementing the numeric part of current class name.
    // e.g. "Class 9" → "Class 10", "9th" → "10th", "Grade 5" → "Grade 6"
    function _nextClassName(name = '') {
      const m = name.match(/(\d+)/);
      if (m) return name.replace(/\d+/, String(parseInt(m[1], 10) + 1));
      return `${name} (Next)`;
    }
    const currentClassName = studentData.classId?.name || '';
    const promotedClassName = reportCard?.promotedToClass || '';
    const computedResult2 = calc.grandMax > 0 ? (calc.percentage >= 33 ? 'PASS' : 'FAIL') : 'N/A';
    if (promotedClassName) {
      d.promotedTo = d.promoted_to = promotedClassName;
    } else if (computedResult2 === 'PASS') {
      d.promotedTo = d.promoted_to = _nextClassName(currentClassName);
    } else {
      d.promotedTo = d.promoted_to = computedResult2 === 'FAIL' ? 'Not Promoted' : currentClassName;
    }

    logger.debug(
      '[DataAggregator] Co-scholastic flat fields:',
      Object.keys(d)
        .filter((k) => !k.includes('_') || k.startsWith('skill'))
        .slice(0, 20)
    );
    logger.debug(
      '[DataAggregator] Final data keys count:',
      Object.keys(d).length,
      '| promotedTo:',
      d.promotedTo
    );

    return d;
  }

  // Class rank helper
  static async getClassRank(studentId, classId, sessionId, schoolId) {
    const students = await StudentProfile.find({
      classId,
      session: sessionId,
      schoolId,
      status: { $in: ['active', 'passed', 'passed_out'] },
    }).select('_id');
    const reportCards = await require('../models/ReportCard')
      .find({
        studentId: { $in: students.map((s) => s._id) },
        session: sessionId,
        schoolId,
      })
      .select('studentId rank');
    const found = reportCards.find((rc) => String(rc.studentId) === String(studentId));
    return found?.rank ? parseInt(found.rank) || 'N/A' : 'N/A';
  }
}

module.exports = DataAggregatorService;
