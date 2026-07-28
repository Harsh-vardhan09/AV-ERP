import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  useFinalizeReportCardMutation,
  useGetReportCardQuery,
  useUnlockReportCardMutation,
  useUpdateReportCardMutation,
} from '../../redux/api/reportCardApi';
import { getDisplayExams } from '../../utils/reportCardValidation';
import './reportCard.css';

// ─────────────────────────────────────────────────────────────────────────────
// PURE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const CO_MAX_PER_SKILL = 10;

const toNum = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : null;
};

const calculateGrade = (pct) => {
  const s = Number(pct) || 0;
  if (s >= 91) return 'A+';
  if (s >= 81) return 'A';
  if (s >= 71) return 'B+';
  if (s >= 61) return 'B';
  if (s >= 51) return 'C';
  if (s >= 41) return 'D';
  return 'E';
};

/**
 * Normalise dynamicMarks from the server (could be a plain object or Map-like)
 * into a plain JS object keyed by examId string.
 */
const normaliseDynamicMarks = (raw) => {
  if (!raw) return {};
  // Mongoose "Map" may arrive as a real Map instance (or Map-like). Convert reliably.
  if (raw instanceof Map) return Object.fromEntries(raw.entries());
  if (typeof raw?.entries === 'function') {
    try {
      return Object.fromEntries(raw.entries());
    } catch {
      // fallthrough
    }
  }
  if (typeof raw === 'object') return { ...raw };
  return {};
};

/** Compute total marks and grade for one subject row given the current dynamic marks and exam list */
const computeRowSummary = (dynamicMarks = {}, exams = []) => {
  let obtained = 0;
  let achievedMax = 0;
  exams.forEach((exam) => {
    const val = toNum(dynamicMarks[String(exam._id)]);
    if (val !== null) {
      obtained += val;
      achievedMax += exam.maxMarks;
    }
  });
  const pct = achievedMax > 0 ? Number(((obtained / achievedMax) * 100).toFixed(2)) : 0;
  return {
    rowTotal: Number(obtained.toFixed(2)),
    rowMaxAchieved: achievedMax,
    rowGrade: achievedMax > 0 ? calculateGrade(pct) : '—',
    hasAnyMark: achievedMax > 0,
  };
};

const clampCoRowFromServer = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  ['term1Marks', 'term2Marks'].forEach((field) => {
    if (out[field] === '' || out[field] === null || out[field] === undefined) return;
    const n = Number(out[field]);
    if (!Number.isFinite(n)) return;
    out[field] = Math.min(CO_MAX_PER_SKILL, Math.max(0, n));
  });
  return out;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const ReportCardEditor = () => {
  const navigate       = useNavigate();
  const { studentId: routeStudentId } = useParams();
  const [searchParams] = useSearchParams();

  const role      = useSelector((state) => state?.user?.user?.user?.role);
  const isOasesEnabled = useSelector((state) => state?.oasesSettings?.isOasesEnabled ?? false);
  const isStudent = role === 'student';
  const effectiveStudentId = isStudent ? 'me' : (routeStudentId || 'me');
  const session   = searchParams.get('session') || undefined;

  const {
    data: apiResponse,
    error,
    isFetching,
    refetch,
  } = useGetReportCardQuery(
    { studentId: effectiveStudentId, session },
    { skip: !effectiveStudentId }
  );

  const [updateReportCard,   { isLoading: isSaving }]    = useUpdateReportCardMutation();
  const [finalizeReportCard, { isLoading: isFinalizing }] = useFinalizeReportCardMutation();
  const [unlockReportCard,   { isLoading: isUnlocking }]  = useUnlockReportCardMutation();

  // ── local editable state ──
  const [marksRows,    setMarksRows]    = useState([]);
  const [coScholastic, setCoScholastic] = useState([]);
  const [rank,         setRank]         = useState('');
  const [remarksTerm1, setRemarksTerm1] = useState('');
  const [remarksTerm2, setRemarksTerm2] = useState('');
  const [healthTerm1,  setHealthTerm1]  = useState({ height: '', weight: '' });
  const [healthTerm2,  setHealthTerm2]  = useState({ height: '', weight: '' });
  const [isDirty,      setIsDirty]      = useState(false);
  const [lastSavedAt,  setLastSavedAt]  = useState(null);
  const [markErrors,   setMarkErrors]   = useState({}); // { rowId_examId: msg }
  const saveTimerRef = useRef(null);

  // ── derived from API ──
  const reportData  = apiResponse?.data;
  const reportCard  = reportData?.reportCard;
  const canEdit     = Boolean(reportData?.permissions?.canEdit);
  const isFinalized = Boolean(reportData?.permissions?.isFinalized);
  const readOnly    = !canEdit || isFinalized;

  // ── DUAL WORKFLOW: Filter exams based on OASES toggle ──
  // All exams come from API; we filter based on workflow
  const exams = useMemo(
    () => getDisplayExams({ isOasesEnabled, allExams: reportData?.exams || [] }),
    [isOasesEnabled, reportData?.exams]
  );

  // ── sync server state → local state ──
  useEffect(() => {
    if (!reportData) return;

    setRank(reportData.reportCard?.rank || '');
    setRemarksTerm1(reportData.reportCard?.remarksTerm1 || '');
    setRemarksTerm2(reportData.reportCard?.remarksTerm2 || '');
    setHealthTerm1({
      height: reportData.reportCard?.healthTerm1?.height || '',
      weight: reportData.reportCard?.healthTerm1?.weight || '',
    });
    setHealthTerm2({
      height: reportData.reportCard?.healthTerm2?.height || '',
      weight: reportData.reportCard?.healthTerm2?.weight || '',
    });
    // Normalise dynamicMarks for every row so it's always a plain object
    setMarksRows(
      (reportData.marksRows || []).map((row) => ({
        ...row,
        dynamicMarks: normaliseDynamicMarks(row.dynamicMarks),
      }))
    );
    setCoScholastic((reportData.coScholastic || []).map(clampCoRowFromServer));
    setIsDirty(false);
    setMarkErrors({});
  }, [reportData]);

  useEffect(() => {
    if (!readOnly) return;
    setIsDirty(false);
    setMarkErrors({});
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, [readOnly]);

  // ── auto-save debounce (500 ms) ──
  useEffect(() => {
    if (!isDirty || readOnly || !reportCard?._id) return;
    if (Object.keys(markErrors).length > 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        await updateReportCard({
          id: reportCard._id,
          rank,
          remarksTerm1,
          remarksTerm2,
          healthTerm1,
          healthTerm2,
          marks: marksRows.map((row) => ({
            _id: row._id,
            subject: row.subject,
            subjectId: row.subjectId,
            dynamicMarks: row.dynamicMarks || {},
          })),
          coScholastic,
        }).unwrap();
        setIsDirty(false);
        setLastSavedAt(new Date());
      } catch (err) {
        const msg = err?.data?.message || 'Auto-save failed';
        if (err?.data?.code === 'MARKS_VALIDATION_ERROR') {
          const detail = (err?.data?.errors || []).join('\n');
          toast.error(`❌ Validation error:\n${detail || msg}`);
        } else if (err?.data?.code === 'REPORT_CARD_LOCKED') {
          toast.error('🔒 Report card was locked externally. Refreshing...');
          refetch();
        } else {
          toast.error(msg);
        }
      }
    }, 500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [
    isDirty, readOnly, reportCard?._id,
    rank, remarksTerm1, remarksTerm2,
    healthTerm1, healthTerm2, marksRows, coScholastic,
    markErrors, updateReportCard, refetch,
  ]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  // ── Dynamic mark cell change ──
  const handleDynamicMarkChange = useCallback((rowId, examId, rawValue, maxMarks) => {
    if (readOnly) return;
    const errorKey = `${rowId}.${examId}`;

    const clearErr = () =>
      setMarkErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });

    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      clearErr();
      setMarksRows((prev) =>
        prev.map((row) =>
          row._id !== rowId
            ? row
            : { ...row, dynamicMarks: { ...row.dynamicMarks, [examId]: null }, isEdited: true }
        )
      );
      markDirty();
      return;
    }

    const num = Number(rawValue);
    if (!Number.isFinite(num) || num < 0) {
      setMarkErrors((prev) => ({ ...prev, [errorKey]: 'Enter a valid number (≥ 0)' }));
      return;
    }

    if (num > maxMarks) {
      setMarkErrors((prev) => ({ ...prev, [errorKey]: `Max: ${maxMarks}` }));
      // Still update state with clamped value so the input doesn't freeze
      clearErr();
      const capped = maxMarks;
      setMarksRows((prev) =>
        prev.map((row) =>
          row._id !== rowId
            ? row
            : { ...row, dynamicMarks: { ...row.dynamicMarks, [examId]: capped }, isEdited: true }
        )
      );
      markDirty();
      return;
    }

    clearErr();
    setMarksRows((prev) =>
      prev.map((row) =>
        row._id !== rowId
          ? row
          : { ...row, dynamicMarks: { ...row.dynamicMarks, [examId]: num }, isEdited: true }
      )
    );
    markDirty();
  }, [readOnly, markDirty]);

  // ── co-scholastic change ──
  const handleCoChange = useCallback((rowId, field, rawValue) => {
    if (readOnly) return;
    const errorKey = `co.${rowId}.${field}`;
    const clearErr = () =>
      setMarkErrors((prev) => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });

    if (rawValue === '' || rawValue === null || rawValue === undefined) {
      clearErr();
      setCoScholastic((prev) =>
        prev.map((row) => (row._id !== rowId ? row : { ...row, [field]: null }))
      );
      markDirty();
      return;
    }

    const num = Number(rawValue);
    if (!Number.isFinite(num) || num < 0) {
      setMarkErrors((prev) => ({ ...prev, [errorKey]: 'Enter a valid number (≥ 0)' }));
      return;
    }

    clearErr();
    const capped = Math.min(CO_MAX_PER_SKILL, num);
    setCoScholastic((prev) =>
      prev.map((row) => (row._id !== rowId ? row : { ...row, [field]: capped }))
    );
    markDirty();
  }, [readOnly, markDirty]);

  // ── finalize ──
  const handleFinalize = async () => {
    if (!reportCard?._id) return;
    try {
      await finalizeReportCard(reportCard._id).unwrap();
      toast.success('Report card finalized and locked');
      await refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to finalize');
    }
  };

  // ── unlock ──
  const handleUnlock = async () => {
    if (!reportCard?._id) return;
    try {
      await unlockReportCard(reportCard._id).unwrap();
      toast.success('Report card unlocked');
      await refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to unlock');
    }
  };

  // ── print ──
  const handlePrint = () => window.print();

  // ─────────────────────────────────────────────────────────────────
  // COMPUTED SUMMARY VALUES
  // ─────────────────────────────────────────────────────────────────

  // Per-row enrichment (with computed totals)
  const enrichedRows = useMemo(() =>
    marksRows.map((row) => ({
      ...row,
      ...computeRowSummary(row.dynamicMarks || {}, exams),
    })),
    [marksRows, exams]
  );

  const maxPerSubject = useMemo(
    () => exams.reduce((s, e) => s + e.maxMarks, 0),
    [exams]
  );

  const scoringRows = useMemo(
    () => enrichedRows.filter((r) => r.hasAnyMark),
    [enrichedRows]
  );

  const grandTotal   = useMemo(() => Number(scoringRows.reduce((s, r) => s + r.rowTotal, 0).toFixed(2)), [scoringRows]);
  const maxTotal     = scoringRows.length * maxPerSubject;

  // Co-scholastic totals
  const coTerm1Total = useMemo(() => coScholastic.reduce((s, r) => s + (toNum(r.term1Marks) || 0), 0), [coScholastic]);
  const coTerm2Total = useMemo(() => coScholastic.reduce((s, r) => s + (toNum(r.term2Marks) || 0), 0), [coScholastic]);
  const coMaxTotal   = coScholastic.length * CO_MAX_PER_SKILL;

  const overallMax = maxTotal + coMaxTotal;
  const overallTotal = grandTotal + coTerm1Total; // term1 for now; can split if needed
  const overallPct   = overallMax > 0 ? Number(((overallTotal / overallMax) * 100).toFixed(2)) : 0;

  // ─────────────────────────────────────────────────────────────────
  // LOADING / EMPTY STATES
  // ─────────────────────────────────────────────────────────────────
  if (isFetching) {
    return <div className="rc-empty">⏳ Loading report card...</div>;
  }
  if (!reportData) {
    const msg = (error && (error?.data?.message || error?.error)) || null;
    return (
      <div className="rc-empty">
        Report card data not found.
        {msg ? <div style={{ marginTop: 8, color: '#b91c1c', fontWeight: 600 }}>{msg}</div> : null}
      </div>
    );
  }

  const { student, classInfo } = reportData;
  const studentName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="rc-editor-page">

      {/* ── Toolbar (hidden in print) ── */}
      <div className="rc-toolbar no-print">
        <button type="button" className="rc-secondary-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="rc-toolbar-right">
          {!readOnly && (
            <span className="rc-save-status">
              {Object.keys(markErrors).length > 0
                ? <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠ Fix errors before saving</span>
                : isSaving
                  ? '💾 Saving...'
                  : lastSavedAt
                    ? `✅ Saved at ${lastSavedAt.toLocaleTimeString()}`
                    : 'Auto-save: 500 ms'}
            </span>
          )}

          {isFinalized && (
            <span className="rc-finalized-badge">🔒 Finalized &amp; Locked</span>
          )}

          <button type="button" className="rc-secondary-btn" onClick={handlePrint}>
            🖨️ Print / Download PDF
          </button>

          {(role === 'teacher' || role === 'admin') && !isFinalized && (
            <button
              type="button"
              className="rc-primary-btn"
              onClick={handleFinalize}
              disabled={isFinalizing}
            >
              {isFinalizing ? 'Finalizing...' : '✔ Finalize'}
            </button>
          )}

          {role === 'admin' && isFinalized && (
            <button
              type="button"
              className="rc-danger-btn"
              onClick={handleUnlock}
              disabled={isUnlocking}
            >
              {isUnlocking ? 'Unlocking...' : '🔓 Unlock'}
            </button>
          )}
        </div>
      </div>

      {/* ── Lock Banner ── */}
      {isFinalized && (
        <div className="rc-lock-banner no-print">
          🔒 This report card has been <strong>finalized and locked</strong>. No edits are allowed.
          {role === 'admin' && ' Use the Unlock button to re-open it.'}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PRINTABLE SHEET
          ═══════════════════════════════════════════════════════════════ */}
      <div className="rc-sheet" id="rc-print-area">

        {/* ── School Header ── */}
        <div className="rc-school-header">
          <p className="rc-school-name">Annual Progress Report Card</p>
          <p className="rc-school-tagline">
            {classInfo?.sessionName || 'Academic Session'}
          </p>
        </div>

        {/* ── Student Info Strip ── */}
        <div className="rc-info-strip">
          <div className="rc-info-cell">
            <b>Name:</b> {studentName}
          </div>
          <div className="rc-info-cell">
            <b>Class:</b> {classInfo?.className} – {classInfo?.sectionName}
          </div>
          <div className="rc-info-cell">
            <b>Roll No:</b> {student?.rollNo || '—'}
          </div>
          <div className="rc-info-cell">
            <b>Adm. No:</b> {student?.admissionNumber || '—'}
          </div>
          <div className="rc-info-cell">
            <b>Rank:</b>
            <input
              className={`rc-info-input ${!readOnly ? 'rc-editable' : ''}`}
              value={rank}
              onChange={(e) => {
                if (readOnly) return;
                setRank(e.target.value);
                markDirty();
              }}
              disabled={readOnly}
              readOnly={readOnly}
              placeholder="—"
            />
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────
            PART I : SCHOLASTIC
            ───────────────────────────────────────────────────────── */}
        <div className="rc-part-label">Part I : Scholastic</div>

        <div className="rc-part1-wrapper">
          {/* ── Scholastic Marks Table ── */}
          <div className="rc-scholastic-outer">

            {exams.length === 0 ? (
              /* ── NO EXAMS CASE ── */
              <div className="rc-no-exams-notice">
                <div className="rc-no-exams-icon">📋</div>
                <div className="rc-no-exams-title">No Exams Found</div>
                <div className="rc-no-exams-body">
                  No exams have been created for this class and session yet.<br />
                  Go to <strong>Exam Management</strong> to create exams, then return here.
                </div>
              </div>
            ) : (
              <table className="rc-scholastic-table">
                <thead>
                  {/* Row 1: Subject | Exam columns | Total | % | Grade */}
                  <tr>
                    <th className="rc-th-subject" rowSpan={2}>Subject</th>
                    {exams.map((exam) => (
                      <th key={String(exam._id)} className="rc-th-term1">
                        {exam.name}
                        <span className="rc-th-max">Max: {exam.maxMarks}</span>
                      </th>
                    ))}
                    <th className="rc-th-term1" rowSpan={2}>Total<br /><span className="rc-th-max">/{maxPerSubject}</span></th>
                    <th className="rc-th-term1" rowSpan={2}>%</th>
                    <th className="rc-th-term1" rowSpan={2}>GRADE</th>
                  </tr>
                  <tr>
                    {/* second header row — empty, covered by rowSpan above */}
                  </tr>
                </thead>

                <tbody>
                  {enrichedRows.map((row) => {
                    const pct = row.rowMaxAchieved > 0
                      ? Number(((row.rowTotal / row.rowMaxAchieved) * 100).toFixed(1))
                      : null;

                    return (
                      <tr key={row._id}>
                        {/* Subject name */}
                        <td className="rc-td-subject">
                          {row.subject}
                          {row.isEdited && <span className="rc-edited-dot" title="Manually edited" />}
                        </td>

                        {/* One input per exam */}
                        {exams.map((exam) => {
                          const examId  = String(exam._id);
                          const errKey  = `${row._id}.${examId}`;
                          const hasErr  = Boolean(markErrors[errKey]);
                          const cellVal = row.dynamicMarks?.[examId];

                          return (
                            <td key={examId}>
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <input
                                  type="number"
                                  min={0}
                                  max={exam.maxMarks}
                                  className={`rc-cell-input ${!readOnly ? 'rc-editable' : ''} ${hasErr ? 'rc-cell-error' : ''}`}
                                  value={cellVal ?? ''}
                                  onChange={(e) => handleDynamicMarkChange(row._id, examId, e.target.value, exam.maxMarks)}
                                  disabled={readOnly}
                                  readOnly={readOnly}
                                  title={hasErr ? markErrors[errKey] : `Max: ${exam.maxMarks}`}
                                />
                                {hasErr && (
                                  <span className="rc-err-tooltip" title={markErrors[errKey]}>
                                    Max {exam.maxMarks}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total, %, Grade */}
                        <td className="rc-td-total">
                          {row.hasAnyMark ? row.rowTotal : <span className="rc-td-dash">—</span>}
                        </td>
                        <td className="rc-td-total">
                          {pct !== null ? `${pct}%` : <span className="rc-td-dash">—</span>}
                        </td>
                        <td className="rc-td-grade">
                          {row.hasAnyMark ? row.rowGrade : <span className="rc-td-dash">—</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {/* ── Co-Scholastic summary row ── */}
                  <tr className="rc-tr-summary">
                    <td className="rc-td-subject">Co-Scholastic Marks ({coMaxTotal})</td>
                    <td className="rc-td-val" colSpan={exams.length + 3}>
                      Term-I: {coTerm1Total}/{coMaxTotal}&nbsp;&nbsp;
                      Term-II: {coTerm2Total}/{coMaxTotal}
                    </td>
                  </tr>

                  {/* ── Grand Total & Percentage row ── */}
                  <tr className="rc-tr-summary">
                    <td className="rc-td-subject">Total &amp; Percentage</td>
                    <td className="rc-td-val" colSpan={exams.length + 3}>
                      {grandTotal}/{maxTotal}&nbsp;&nbsp;
                      {maxTotal > 0
                        ? `${Number(((grandTotal / maxTotal) * 100).toFixed(2))}%`
                        : '—'}
                    </td>
                  </tr>

                  {/* ── Rank row ── */}
                  <tr className="rc-tr-summary">
                    <td className="rc-td-subject">Rank</td>
                    <td className="rc-td-val" colSpan={exams.length + 3}>
                      <input
                        className={`rc-info-input ${!readOnly ? 'rc-editable' : ''}`}
                        value={rank}
                        onChange={(e) => {
                          if (readOnly) return;
                          setRank(e.target.value);
                          markDirty();
                        }}
                        disabled={readOnly}
                        readOnly={readOnly}
                        placeholder="—"
                        style={{ width: 80 }}
                      />
                    </td>
                  </tr>

                  {/* ── Signatures ── */}
                  <tr className="rc-tr-sign">
                    <td className="rc-td-subject" style={{ fontWeight: 700 }}>Sign. of Class Teacher</td>
                    <td colSpan={exams.length + 3}>&nbsp;</td>
                  </tr>
                  <tr className="rc-tr-sign">
                    <td className="rc-td-subject" style={{ fontWeight: 700 }}>Sign. of Parents</td>
                    <td colSpan={exams.length + 3}>&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* ── Health Status Box ── */}
          <div className="rc-health-box">
            <div className="rc-health-title">Health Status</div>

            <div className="rc-health-term-label">Term-I</div>
            <div className="rc-health-row">
              <span>Height (cm)</span>
              <input
                className={`rc-health-input ${!readOnly ? 'rc-editable' : ''}`}
                value={healthTerm1.height}
                onChange={(e) => { if (readOnly) return; setHealthTerm1((p) => ({ ...p, height: e.target.value })); markDirty(); }}
                disabled={readOnly} readOnly={readOnly} placeholder="—"
              />
            </div>
            <div className="rc-health-row">
              <span>Weight (kg)</span>
              <input
                className={`rc-health-input ${!readOnly ? 'rc-editable' : ''}`}
                value={healthTerm1.weight}
                onChange={(e) => { if (readOnly) return; setHealthTerm1((p) => ({ ...p, weight: e.target.value })); markDirty(); }}
                disabled={readOnly} readOnly={readOnly} placeholder="—"
              />
            </div>

            <div className="rc-health-term-label">Term-II</div>
            <div className="rc-health-row">
              <span>Height (cm)</span>
              <input
                className={`rc-health-input ${!readOnly ? 'rc-editable' : ''}`}
                value={healthTerm2.height}
                onChange={(e) => { if (readOnly) return; setHealthTerm2((p) => ({ ...p, height: e.target.value })); markDirty(); }}
                disabled={readOnly} readOnly={readOnly} placeholder="—"
              />
            </div>
            <div className="rc-health-row">
              <span>Weight (kg)</span>
              <input
                className={`rc-health-input ${!readOnly ? 'rc-editable' : ''}`}
                value={healthTerm2.weight}
                onChange={(e) => { if (readOnly) return; setHealthTerm2((p) => ({ ...p, weight: e.target.value })); markDirty(); }}
                disabled={readOnly} readOnly={readOnly} placeholder="—"
              />
            </div>
          </div>
        </div>{/* end rc-part1-wrapper */}


        {/* ─────────────────────────────────────────────────────────
            PART II : CO-SCHOLASTIC MARKS + REMARKS
            ───────────────────────────────────────────────────────── */}
        <div className="rc-part-label">Part-II : Co-Scholastic Marks</div>

        <div className="rc-part2-wrapper">
          {/* ── Co-Scholastic Skills Table ── */}
          <div className="rc-co-outer">
            <table className="rc-co-table">
              <thead>
                <tr>
                  <th className="rc-co-skill">Skill</th>
                  <th className="rc-th-term1">Term-I</th>
                  <th className="rc-th-term2">Term-II</th>
                </tr>
              </thead>
              <tbody>
                {coScholastic.map((row) => (
                  <tr key={row._id}>
                    <td className="rc-co-skill">
                      {row.skillName} ({CO_MAX_PER_SKILL})
                    </td>
                    <td>
                      {(() => {
                        const errKey = `co.${row._id}.term1Marks`;
                        const hasErr = Boolean(markErrors[errKey]);
                        return (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input
                              type="number" min={0} max={CO_MAX_PER_SKILL}
                              className={`rc-cell-input ${!readOnly ? 'rc-editable' : ''} ${hasErr ? 'rc-cell-error' : ''}`}
                              value={row.term1Marks ?? ''}
                              onChange={(e) => handleCoChange(row._id, 'term1Marks', e.target.value)}
                              disabled={readOnly} readOnly={readOnly}
                              title={hasErr ? markErrors[errKey] : `Max: ${CO_MAX_PER_SKILL}`}
                            />
                            {hasErr && <span className="rc-err-tooltip" title={markErrors[errKey]}>Max {CO_MAX_PER_SKILL}</span>}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const errKey = `co.${row._id}.term2Marks`;
                        const hasErr = Boolean(markErrors[errKey]);
                        return (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input
                              type="number" min={0} max={CO_MAX_PER_SKILL}
                              className={`rc-cell-input ${!readOnly ? 'rc-editable' : ''} ${hasErr ? 'rc-cell-error' : ''}`}
                              value={row.term2Marks ?? ''}
                              onChange={(e) => handleCoChange(row._id, 'term2Marks', e.target.value)}
                              disabled={readOnly} readOnly={readOnly}
                              title={hasErr ? markErrors[errKey] : `Max: ${CO_MAX_PER_SKILL}`}
                            />
                            {hasErr && <span className="rc-err-tooltip" title={markErrors[errKey]}>Max {CO_MAX_PER_SKILL}</span>}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Remarks Panel ── */}
          <div className="rc-remarks-panel">
            <div className="rc-remarks-box">
              <div className="rc-remarks-header">Term - I (Remarks)</div>
              <textarea
                className={`rc-remarks-textarea ${!readOnly ? 'rc-editable' : ''}`}
                value={remarksTerm1}
                onChange={(e) => { if (readOnly) return; setRemarksTerm1(e.target.value); markDirty(); }}
                disabled={readOnly} readOnly={readOnly}
                placeholder="Enter Term-I remarks..."
              />
            </div>
            <div className="rc-remarks-box">
              <div className="rc-remarks-header">Term - II (Remarks)</div>
              <textarea
                className={`rc-remarks-textarea ${!readOnly ? 'rc-editable' : ''}`}
                value={remarksTerm2}
                onChange={(e) => { if (readOnly) return; setRemarksTerm2(e.target.value); markDirty(); }}
                disabled={readOnly} readOnly={readOnly}
                placeholder="Enter Term-II remarks..."
              />
            </div>
          </div>
        </div>{/* end rc-part2-wrapper */}

      </div>{/* end rc-sheet */}
    </div>/* end rc-editor-page */
  );
};

export default ReportCardEditor;
