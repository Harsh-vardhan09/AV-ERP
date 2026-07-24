import React, { useState, useRef, useCallback } from 'react';
import { previewImport, startImport, getImportStatus, getErrorReportUrl } from '../../api/importApi';
import axios from 'axios';

// Use VITE_PORT — same env var used by the entire app for the backend URL
// VITE_API_URL is kept as secondary fallback for backward-compat
const _base = import.meta.env.VITE_PORT || import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

// ── Step constants ─────────────────────────────────────────────────────────
const STEPS = { SELECT: 1, PREVIEW: 2, IMPORTING: 3, DONE: 4 };

export default function BulkImport() {
  const [step, setStep]           = useState(STEPS.SELECT);
  const [entity, setEntity]       = useState('student');
  const [file, setFile]           = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [sessions, setSessions]   = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [importLog, setImportLog] = useState(null);
  const [progress, setProgress]   = useState(0);
  const [pollTimer, setPollTimer] = useState(null);
  const fileRef = useRef();

  // Load sessions on mount
  React.useEffect(() => {
    axios.get(`${API}/admin/sessions`, { withCredentials: true })
      .then(r => {
        const list = r.data?.data || [];
        setSessions(list);
        if (list.length === 0) {
          setError('No academic sessions found. Please create a session in Session Manager first.');
        }
      })
      .catch((err) => {
        console.error('[BulkImport] Failed to load sessions:', err);
        setError('Could not load academic sessions. Please check your connection or re-login.');
      });
  }, []);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback((f) => {
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Only CSV and XLSX files are allowed'); return;
    }
    setError(''); setFile(f);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ── Step 1 → Preview ──────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!file) { setError('Please select a file'); return; }
    if (entity === 'student' && !sessionId) { setError('Please select an academic session'); return; }
    setError(''); setLoading(true);
    try {
      // previewImport returns flat object: { success, totalRows, validRows, ... }
      const data = await previewImport(file, entity, sessionId);
      if (!data?.success) {
        setError(data?.message || 'Preview failed.');
        return;
      }
      setPreview(data);
      setStep(STEPS.PREVIEW);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Preview failed. Check your file format.');
    } finally { setLoading(false); }
  };

  // ── Step 2 → Import ───────────────────────────────────────────────────────
  const handleStartImport = async () => {
    setError(''); setLoading(true);
    try {
      const res = await startImport(file, {
        entity,
        duplicateMode: 'skip',
        strictness: 'moderate',
        sessionId: sessionId || undefined,
      });

      // res is already the parsed data (importApi returns data directly)
      if (!res?.success) {
        setError(res?.message || res?.error || 'Import failed to start.');
        return;
      }

      const logId = res?.importLogId || res?._id;

      // ── Synchronous import: backend already finished, jump straight to Done ─
      if (!res?.async) {
        setImportLog({
          _id:          logId,
          status:       res.status       || 'completed',
          totalRows:    res.totalRows    || 0,
          successCount: res.successCount || 0,
          failureCount: res.failureCount || 0,
          skippedCount: res.skippedCount || 0,
          duration:     res.duration,
        });
        setProgress(100);
        setStep(STEPS.DONE);
        return;
      }

      // ── Async / queued import: show progress screen and poll ───────────────
      setImportLog({ _id: logId, status: 'pending', totalRows: preview?.totalRows || 0 });
      setStep(STEPS.IMPORTING);
      pollStatus(logId);

    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Import failed to start.');
    } finally { setLoading(false); }
  };

  // ── Polling (only for async/queued imports) ────────────────────────────────
  const pollStatus = (logId) => {
    if (!logId) { setStep(STEPS.DONE); return; }
    const timer = setInterval(async () => {
      try {
        const log = await getImportStatus(logId);
        // getImportStatus already returns data directly (no .data wrapper)
        const pct = log?.totalRows > 0
          ? Math.round(((log.processedRows || 0) / log.totalRows) * 100) : 0;
        setProgress(pct);
        setImportLog(log);
        if (['completed', 'failed', 'partial'].includes(log?.status)) {
          clearInterval(timer);
          setPollTimer(null);
          setStep(STEPS.DONE);
        }
      } catch { clearInterval(timer); setPollTimer(null); setStep(STEPS.DONE); }
    }, 3000);
    setPollTimer(timer);
  };

  const reset = () => {
    if (pollTimer) clearInterval(pollTimer);
    setStep(STEPS.SELECT); setFile(null); setPreview(null);
    setImportLog(null); setProgress(0); setError('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📥 Bulk Data Import</h1>
          <p style={styles.subtitle}>Upload CSV or Excel file to import students or teachers</p>
        </div>
        {step !== STEPS.SELECT && (
          <button onClick={reset} style={styles.resetBtn}>← New Import</button>
        )}
      </div>

      {/* Step Indicator */}
      <StepBar current={step} />

      {error && <div style={styles.errorBox}>⚠️ {error}</div>}

      {/* ── STEP 1: Select ──────────────────────────────────────────────── */}
      {step === STEPS.SELECT && (
        <div style={styles.card}>
          {/* Entity Tabs */}
          <div style={styles.tabs}>
            {['student', 'teacher'].map(e => (
              <button key={e} onClick={() => setEntity(e)}
                style={{ ...styles.tab, ...(entity === e ? styles.tabActive : {}) }}>
                {e === 'student' ? '🎓 Students' : '👨‍🏫 Teachers'}
              </button>
            ))}
          </div>

          {/* Session selector (students only) */}
          {entity === 'student' && (
            <div style={styles.field}>
              <label style={styles.label}>Academic Session *</label>
              <select value={sessionId} onChange={e => setSessionId(e.target.value)} style={styles.select}>
                <option value="">-- Select Session --</option>
                {sessions.map(s => (
                  <option key={s._id} value={s._id}>{s.name}{s.isActive ? ' (Active)' : ''}</option>
                ))}
              </select>
              <p style={styles.hint}>Import data will be linked to this session. School must have session + classes + sections set up first.</p>
            </div>
          )}

          {/* Drop zone */}
          <div style={styles.field}>
            <label style={styles.label}>Upload File *</label>
            <div
              style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}), ...(file ? styles.dropZoneSuccess : {}) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div>
                  <div style={{ fontSize: 32 }}>✅</div>
                  <p style={{ fontWeight: 700, marginTop: 8 }}>{file.name}</p>
                  <p style={{ color: '#6b7280', fontSize: 13 }}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 40 }}>📂</div>
                  <p style={{ fontWeight: 600, marginTop: 8 }}>Drag & drop your CSV or XLSX file here</p>
                  <p style={{ color: '#6b7280', fontSize: 13 }}>or click to browse — Max 100MB</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileRef} accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>

          {/* Info box */}
          <div style={styles.infoBox}>
            <b>📋 Before importing:</b>
            <ul style={{ margin: '8px 0 0 16px', fontSize: 13, lineHeight: 1.7 }}>
              <li>Make sure Academic Session exists (e.g. "2025-26")</li>
              <li>Classes and Sections must be set up in that session</li>
              <li>Column names in Excel should match — e.g. <code>First Name</code>, <code>Class</code>, <code>Section</code>, <code>DOB</code></li>
              <li>Duplicates are <b>skipped</b> — you'll see a list of skipped rows to enter manually</li>
            </ul>
          </div>

          <button onClick={handlePreview} disabled={loading || !file} style={styles.primaryBtn}>
            {loading ? 'Analyzing File...' : '🔍 Preview Import →'}
          </button>
        </div>
      )}

      {/* ── STEP 2: Preview ─────────────────────────────────────────────── */}
      {step === STEPS.PREVIEW && preview && (
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>📊 Preview</h2>

          {/* Stats */}
          <div style={styles.statsRow}>
            <StatCard label="Total Rows" value={preview.totalRows || 0} color="#3b82f6" />
            <StatCard label="Valid Rows" value={preview.validRows || 0} color="#10b981" />
            <StatCard label="Invalid Rows" value={preview.invalidRows || 0} color="#ef4444" />
            <StatCard label="Columns Found" value={preview.columnsFound || 0} color="#8b5cf6" />
          </div>

          {/* Column mapping */}
          {preview.columnMapping && Object.keys(preview.columnMapping).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Column Mapping</h3>
              <div style={styles.mappingGrid}>
                {Object.entries(preview.columnMapping).map(([excel, internal]) => (
                  <div key={excel} style={styles.mappingRow}>
                    <span style={styles.excelCol}>{excel}</span>
                    <span style={{ color: '#6b7280' }}>→</span>
                    <span style={styles.internalCol}>{internal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample rows */}
          {preview.sampleRows?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>First 5 Rows</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>{Object.keys(preview.sampleRows[0]).slice(0, 8).map(k => (
                      <th key={k} style={styles.th}>{k}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {preview.sampleRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>{Object.values(row).slice(0, 8).map((v, j) => (
                        <td key={j} style={styles.td}>{String(v || '—')}</td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Errors in preview */}
          {preview.errors?.length > 0 && (
            <div style={{ marginTop: 16, background: '#fef2f2', borderRadius: 8, padding: 12 }}>
              <p style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>⚠️ Issues found ({preview.errors.length})</p>
              {preview.errors.slice(0, 5).map((e, i) => (
                <p key={i} style={{ fontSize: 13, color: '#7f1d1d', margin: '2px 0' }}>Row {e.row}: {e.message}</p>
              ))}
              {preview.errors.length > 5 && <p style={{ fontSize: 12, color: '#9ca3af' }}>...and {preview.errors.length - 5} more</p>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button onClick={() => setStep(STEPS.SELECT)} style={styles.secondaryBtn}>← Back</button>
            <button
              onClick={handleStartImport}
              disabled={loading || (preview.validRows ?? preview.totalRows) === 0}
              style={styles.primaryBtn}
            >
              {loading ? 'Starting...' : `🚀 Import ${preview.validRows ?? preview.totalRows ?? 0} Valid Rows`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Importing ───────────────────────────────────────────── */}
      {step === STEPS.IMPORTING && (
        <div style={{ ...styles.card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Importing Data...</h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>Please wait. Do not close this window.</p>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <p style={{ marginTop: 12, fontWeight: 600, color: '#3b82f6' }}>{progress}%</p>
          {importLog && (
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
              {importLog.processedRows || 0} of {importLog.totalRows || '?'} rows processed
            </p>
          )}
        </div>
      )}

      {/* ── STEP 4: Done ────────────────────────────────────────────────── */}
      {step === STEPS.DONE && importLog && (
        <div style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 56 }}>
              {importLog.status === 'completed' ? '✅' : importLog.status === 'partial' ? '⚠️' : '❌'}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>
              {importLog.status === 'completed' ? 'Import Completed!' :
               importLog.status === 'partial' ? 'Import Completed with Errors' : 'Import Failed'}
            </h2>
          </div>

          <div style={styles.statsRow}>
            <StatCard label="Total Rows"  value={importLog.totalRows    || 0} color="#3b82f6" />
            <StatCard label="Inserted"    value={importLog.successCount || 0} color="#10b981" />
            <StatCard label="Skipped"     value={importLog.skippedCount || 0} color="#f59e0b" />
            <StatCard label="Failed"      value={importLog.failureCount || 0} color="#ef4444" />
          </div>

          {/* Skipped / Error rows notice */}
          {((importLog.skippedCount || 0) > 0 || (importLog.failureCount || 0) > 0) && (
            <div style={{ marginTop: 20, background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: 16 }}>
              <p style={{ fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                ⚠️ {(importLog.skippedCount || 0) + (importLog.failureCount || 0)} rows were not imported
              </p>
              <p style={{ fontSize: 13, color: '#78350f', marginBottom: 12 }}>
                These rows were skipped (duplicates) or had errors. Please review the error report and add them manually.
              </p>
              <a
                href={getErrorReportUrl(importLog._id || importLog.importLogId)}
                target="_blank" rel="noreferrer"
                style={styles.downloadBtn}
              >
                📥 Download Skipped/Error Report (CSV)
              </a>
            </div>
          )}

          {importLog.duration && (
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 16 }}>
              Completed in {(importLog.duration / 1000).toFixed(1)}s
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
            <button onClick={reset} style={styles.primaryBtn}>📥 New Import</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBar({ current }) {
  const steps = ['Select & Upload', 'Preview', 'Importing', 'Done'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
      {steps.map((label, i) => {
        const num = i + 1;
        const done = current > num;
        const active = current === num;
        return (
          <React.Fragment key={num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
                background: done ? '#10b981' : active ? '#3b82f6' : '#e5e7eb',
                color: done || active ? '#fff' : '#6b7280',
              }}>{done ? '✓' : num}</div>
              <span style={{ fontSize: 11, marginTop: 4, color: active ? '#3b82f6' : '#9ca3af', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: current > num ? '#10b981' : '#e5e7eb', margin: '0 8px', marginBottom: 18 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: '#f9fafb', borderRadius: 10, padding: '16px 12px', textAlign: 'center', border: `2px solid ${color}20` }}>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</p>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = {
  page:        { maxWidth: 860, margin: '0 auto', padding: '24px 16px', fontFamily: 'Inter, sans-serif' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title:       { fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 },
  subtitle:    { color: '#6b7280', marginTop: 4, fontSize: 14 },
  card:        { background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 8px rgba(0,0,0,0.08)', marginBottom: 20 },
  tabs:        { display: 'flex', gap: 8, marginBottom: 24 },
  tab:         { flex: 1, padding: '10px 16px', borderRadius: 8, border: '2px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#6b7280' },
  tabActive:   { border: '2px solid #3b82f6', background: '#eff6ff', color: '#2563eb' },
  field:       { marginBottom: 20 },
  label:       { display: 'block', fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 6 },
  select:      { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 14, outline: 'none' },
  hint:        { fontSize: 12, color: '#6b7280', marginTop: 6, lineHeight: 1.5 },
  dropZone:    { border: '2px dashed #d1d5db', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: '#f9fafb' },
  dropZoneActive:  { borderColor: '#3b82f6', background: '#eff6ff' },
  dropZoneSuccess: { borderColor: '#10b981', background: '#f0fdf4', borderStyle: 'solid' },
  infoBox:     { background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 13, color: '#0c4a6e' },
  primaryBtn:  { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: 1 },
  secondaryBtn:{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  resetBtn:    { background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: '#374151' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', color: '#dc2626', marginBottom: 16, fontSize: 14 },
  sectionTitle:{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 16 },
  statsRow:    { display: 'flex', gap: 12 },
  mappingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 },
  mappingRow:  { display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 6, padding: '6px 10px', fontSize: 13 },
  excelCol:    { fontWeight: 600, color: '#374151', flex: 1 },
  internalCol: { color: '#2563eb', fontWeight: 500, flex: 1 },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:          { background: '#f3f4f6', padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  td:          { padding: '8px 12px', borderBottom: '1px solid #f3f4f6', color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  progressBar: { width: '100%', height: 14, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', maxWidth: 400, margin: '0 auto' },
  progressFill:{ height: '100%', background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', borderRadius: 99, transition: 'width 0.5s ease' },
  downloadBtn: { display: 'inline-block', background: '#f59e0b', color: '#fff', textDecoration: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13 },
};
