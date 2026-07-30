import React, { useState, useRef, useCallback } from 'react';
import { previewImport, startImport, getImportStatus, getErrorReportUrl } from '../../api/importApi';
import axios from 'axios';
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet, ArrowLeft, ArrowRight, Download, RefreshCw, FileText } from 'lucide-react';

const _base = import.meta.env.VITE_PORT || import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API = _base.endsWith('/api/v1') ? _base : `${_base}/api/v1`;

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

  const handlePreview = async () => {
    if (!file) { setError('Please select a file'); return; }
    if (entity === 'student' && !sessionId) { setError('Please select an academic session'); return; }
    setError(''); setLoading(true);
    try {
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

  const handleStartImport = async () => {
    setError(''); setLoading(true);
    try {
      const res = await startImport(file, {
        entity,
        duplicateMode: 'skip',
        strictness: 'moderate',
        sessionId: sessionId || undefined,
      });

      if (!res?.success) {
        setError(res?.message || res?.error || 'Import failed to start.');
        return;
      }

      const logId = res?.importLogId || res?._id;

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

      setImportLog({ _id: logId, status: 'pending', totalRows: preview?.totalRows || 0 });
      setStep(STEPS.IMPORTING);
      pollStatus(logId);

    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Import failed to start.');
    } finally { setLoading(false); }
  };

  const pollStatus = (logId) => {
    if (!logId) { setStep(STEPS.DONE); return; }
    const timer = setInterval(async () => {
      try {
        const log = await getImportStatus(logId);
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

  return (
    <div className="max-w-4xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bulk Data Import</h1>
          <p className="text-xs text-slate-500 mt-0.5">Upload CSV or Excel files to import student or teacher records</p>
        </div>
        {step !== STEPS.SELECT && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Import</span>
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <StepBar current={step} />

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── STEP 1: Select ── */}
      {step === STEPS.SELECT && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          
          {/* Entity Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            {[
              { id: 'student', label: 'Students' },
              { id: 'teacher', label: 'Teachers' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setEntity(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  entity === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Session selector */}
          {entity === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Session *</label>
              <select
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
              >
                <option value="">Select Session</option>
                {sessions.map(s => (
                  <option key={s._id} value={s._id}>{s.name}{s.isActive ? ' (Active)' : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Upload File *</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                file
                  ? 'border-emerald-300 bg-emerald-50/30'
                  : dragOver
                  ? 'border-indigo-400 bg-indigo-50/40'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              {file ? (
                <div className="space-y-1.5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-slate-900 text-xs">{file.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700 text-xs">Drag & drop your CSV or XLSX file here</p>
                  <p className="text-[11px] text-slate-400">or click to browse — Max 100MB</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileRef} accept=".csv,.xlsx,.xls" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handlePreview}
              disabled={loading || !file}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <span>{loading ? 'Analyzing File...' : 'Preview Import'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === STEPS.PREVIEW && preview && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-slate-900">Preview Data</h2>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Rows" value={preview.totalRows || 0} />
            <StatCard label="Valid Rows" value={preview.validRows || 0} highlight />
            <StatCard label="Invalid Rows" value={preview.invalidRows || 0} danger={preview.invalidRows > 0} />
            <StatCard label="Columns Found" value={preview.columnsFound || 0} />
          </div>

          {/* Sample Table */}
          {preview.sampleRows?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-600">Sample Preview (First 5 Rows)</h3>
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-left">
                      {Object.keys(preview.sampleRows[0]).slice(0, 8).map(k => (
                        <th key={k} className="py-2.5 px-3">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {preview.sampleRows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).slice(0, 8).map((v, j) => (
                          <td key={j} className="py-2 px-3 truncate max-w-[140px]">{String(v || '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={() => setStep(STEPS.SELECT)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleStartImport}
              disabled={loading || (preview.validRows ?? preview.totalRows) === 0}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <span>{loading ? 'Starting...' : `Import ${preview.validRows ?? preview.totalRows ?? 0} Rows`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Importing ── */}
      {step === STEPS.IMPORTING && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xs text-center space-y-4">
          <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-base font-bold text-slate-900">Importing Data...</h2>
            <p className="text-xs text-slate-500 mt-1">Please wait while rows are processed</p>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-xs mx-auto">
            <div className="bg-slate-900 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs font-bold text-slate-900">{progress}%</p>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === STEPS.DONE && importLog && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5 text-center">
          <div>
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-slate-900">
              {importLog.status === 'completed' ? 'Import Complete' : 'Import Finished'}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <StatCard label="Total Rows" value={importLog.totalRows || 0} />
            <StatCard label="Inserted" value={importLog.successCount || 0} highlight />
            <StatCard label="Skipped" value={importLog.skippedCount || 0} />
            <StatCard label="Failed" value={importLog.failureCount || 0} danger={importLog.failureCount > 0} />
          </div>

          {((importLog.skippedCount || 0) > 0 || (importLog.failureCount || 0) > 0) && (
            <div className="pt-2">
              <a
                href={getErrorReportUrl(importLog._id || importLog.importLogId)}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 px-4 py-2 rounded-xl transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Error Report (CSV)</span>
              </a>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-center">
            <button
              onClick={reset}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
            >
              Start New Import
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function StepBar({ current }) {
  const steps = ['Select & Upload', 'Preview', 'Importing', 'Done'];
  return (
    <div className="flex items-center justify-between px-2 py-1">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = current > num;
        const active = current === num;
        return (
          <React.Fragment key={num}>
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                done ? 'bg-emerald-600 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {done ? '✓' : num}
              </div>
              <span className={`text-xs font-semibold hidden sm:inline ${
                active ? 'text-slate-900' : 'text-slate-400'
              }`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${current > num ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StatCard({ label, value, highlight, danger }) {
  return (
    <div className={`p-3.5 rounded-xl border text-center ${
      highlight ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' :
      danger ? 'bg-rose-50/50 border-rose-200 text-rose-900' :
      'bg-slate-50/50 border-slate-200/80 text-slate-900'
    }`}>
      <div className="text-xs font-semibold opacity-75">{label}</div>
      <div className="text-lg font-bold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
