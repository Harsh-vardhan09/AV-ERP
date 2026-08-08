// ══════════════════════════════════════════════════════════════════
// OASES — Scan Operator: UploadQueue (Fixed — Sprint 2+)
// react-dropzone · exam + class + section + subject dropdowns
// · per-file preview · progress bar · auto-assign routing metadata
// ══════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle,
  Loader2, ChevronDown,
} from 'lucide-react';
import OasesRoleGuard from '../shared/OasesRoleGuard';
import { OASES_ROLES } from '../utils/oasesConstants';
import { useGetExamsQuery, useGetActiveSessionQuery, useGetClassesQuery, useGetSectionsQuery, useGetSubjectsQuery } from '@/redux/api/adminApi';
import { useGetSchoolSettingsQuery } from '@modules/admissions/api/admissionApi';
import { useUploadSheets } from '../hooks/mutations/useUploadSheets';

// ── File size formatter ───────────────────────────────────────────
const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Processing status badge ───────────────────────────────────────
const ProcessBadge = ({ status }) => {
  const map = {
    pending:    { cls: 'bg-amber-100 text-amber-700', label: 'Queued' },
    processing: { cls: 'bg-blue-100 text-blue-700',   label: 'Processing' },
    done:       { cls: 'bg-green-100 text-green-700',  label: 'Ready' },
    failed:     { cls: 'bg-red-100 text-red-600',      label: 'Failed' },
  };
  const s = map[status] || { cls: 'bg-gray-100 text-gray-500', label: status };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {status === 'processing' && <Loader2 className="inline w-3 h-3 animate-spin mr-1" />}
      {s.label}
    </span>
  );
};

// ── Select wrapper ────────────────────────────────────────────────
const SelectField = ({ label, value, onChange, disabled, children, required }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm appearance-none
                   focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white pr-8
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════
const UploadQueue = () => {
  const [examConfigId, setExamConfigId] = useState('');
  const [classId,      setClassId]      = useState('');
  const [sectionId,    setSectionId]    = useState('');
  const [subjectId,    setSubjectId]    = useState('');
  const [files,        setFiles]        = useState([]);
  const [sessionLog,   setSessionLog]   = useState([]);

  // ── Fetch active session → exams ───────────────────────────────
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data: examData, isLoading: examsLoading } = useGetExamsQuery(
    { session: sessionId, excludeCompleted: 'true' },
    { skip: !sessionId }
  );

  const { data: settingsData, isLoading: settingsLoading } = useGetSchoolSettingsQuery();
  const isOasesEnabled = settingsData?.data?.isOasesEnabled ?? settingsData?.isOasesEnabled ?? true;

  // Show only non-completed exams for OASES upload queue
  const exams = Array.isArray(examData?.data) ? examData.data : [];

  // ── Class / Section / Subject dropdowns ───────────────────────
  // getClasses: pass undefined to get all classes
  const { data: classData }   = useGetClassesQuery(undefined);
  const classes                = Array.isArray(classData?.data) ? classData.data : (Array.isArray(classData) ? classData : []);

  // getSections: takes { classId } object
  const { data: sectionData } = useGetSectionsQuery(
    { classId },
    { skip: !classId }
  );
  const sections = Array.isArray(sectionData?.data) ? sectionData.data : (Array.isArray(sectionData) ? sectionData : []);

  // getSubjects: takes no args
  const { data: subjectData } = useGetSubjectsQuery();
  const subjects = Array.isArray(subjectData?.data) ? subjectData.data : (Array.isArray(subjectData) ? subjectData : []);

  // Reset dependent dropdowns when parent changes
  useEffect(() => { setSectionId(''); setSubjectId(''); }, [classId]);
  useEffect(() => { setSubjectId(''); },                   [sectionId]);

  // Upload mutation
  const { mutateAsync: doUpload, isPending, progress } = useUploadSheets();

  // ── Dropzone ──────────────────────────────────────────────────
  const extractRollNo = (name) => {
    const base = name.replace(/\.[^.]+$/, '');
    const m = base.match(/rollno[_-]?(\w+)/i) || base.match(/^(\d{4,12})/);
    return m ? m[1] : '—';
  };

  const onDrop = useCallback((accepted, rejected) => {
    const valid = accepted.map((f) => ({
      file:   f,
      name:   f.name,
      size:   f.size,
      rollNo: extractRollNo(f.name),
      status: 'staged',
    }));
    setFiles((prev) => [...prev, ...valid]);
    if (rejected.length) {
      rejected.forEach(({ file }) =>
        alert(`Rejected: ${file.name} — only PDF files are accepted.`)
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  // Require exam + class + subject before upload
  const canUpload = examConfigId && classId && subjectId && files.length > 0;

  // ── Upload handler ────────────────────────────────────────────
  const handleUpload = async () => {
    if (!examConfigId) return alert('Please select an exam first.');
    if (!classId)      return alert('Please select the class.');
    if (!subjectId)    return alert('Please select the subject.');
    if (files.length === 0) return alert('Please add at least one PDF file.');

    const fd = new FormData();
    files.forEach(({ file }) => fd.append('sheets', file));

    // ── Routing metadata — critical for auto-assign to find the right teacher ──
    fd.append('classId', classId);
    if (sectionId) fd.append('sectionId', sectionId);
    fd.append('subjectId', subjectId);

    console.log('[UploadQueue] Uploading:', {
      examConfigId,
      classId,
      sectionId: sectionId || '(none)',
      subjectId,
      fileCount: files.length,
    });

    try {
      const result = await doUpload({ examConfigId, formData: fd });
      setSessionLog((prev) => [...(result.sheets || []), ...prev]);
      setFiles([]);
    } catch (err) {
      console.error('[UploadQueue] Upload error:', err);
    }
  };

  return (
    <OasesRoleGuard roles={[OASES_ROLES.SCAN_OPERATOR, OASES_ROLES.SCHOOL_ADMIN]}>
      <div className="p-6 max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-100 rounded-xl">
            <Upload className="w-6 h-6 text-cyan-700" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Upload Queue</h2>
            <p className="text-sm text-gray-500">Upload scanned PDF answer sheets for processing</p>
          </div>
        </div>

        {/* OASES disabled banner */}
        {!isOasesEnabled && !settingsLoading && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              OASES is disabled for this school. Enable it in School Settings → OASES to allow uploads.
            </p>
          </div>
        )}

        {/* Exam + routing dropdowns */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

          <SelectField
            label="Exam"
            value={examConfigId}
            onChange={setExamConfigId}
            required
          >
            <option value="">— Choose exam —</option>
            {examsLoading && <option disabled>Loading exams…</option>}
            {!examsLoading && exams.length === 0 && (
              <option disabled>No exams available — create one from the Exams module</option>
            )}
            {exams.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} · {(e.type || '').replace(/_/g, ' ')}
                {e.classIds?.length ? ` · ${e.classIds.map(c => c.name || c).join(', ')}` : ''}
              </option>
            ))}
          </SelectField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectField label="Class" value={classId} onChange={setClassId} required>
              <option value="">— Class —</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </SelectField>

            <SelectField
              label="Section"
              value={sectionId}
              onChange={setSectionId}
              disabled={!classId}
            >
              <option value="">— Section (opt.) —</option>
              {sections.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </SelectField>

            <SelectField label="Subject" value={subjectId} onChange={setSubjectId} required>
              <option value="">— Subject —</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </SelectField>
          </div>


        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-cyan-400 bg-cyan-50'
              : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-cyan-600' : 'text-gray-300'}`} />
          <p className="text-sm font-medium text-gray-600">
            {isDragActive ? 'Drop PDF files here…' : 'Drag & drop PDF answer sheets here'}
          </p>
          <p className="text-xs text-gray-400 mt-1">or click to browse · PDF only · Max 50 MB/file · Up to 30 files</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Files Staged ({files.length})
              </span>
              <button onClick={() => setFiles([])} className="text-xs text-red-400 hover:text-red-600">
                Clear all
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {files.map((f, idx) => (
                <div key={idx} className="flex items-center gap-3 px-5 py-3">
                  <FileText className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">
                      {fmtSize(f.size)}
                      {f.rollNo !== '—' && <> · Roll No: <span className="font-mono">{f.rollNo}</span></>}
                    </p>
                  </div>
                  <button onClick={() => removeFile(idx)} className="p-1 rounded hover:bg-red-50 text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {isPending && (
              <div className="px-5 py-3 bg-cyan-50 border-t border-cyan-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-cyan-700 font-medium">Uploading…</span>
                  <span className="text-xs text-cyan-600 font-bold">{progress}%</span>
                </div>
                <div className="w-full bg-cyan-100 rounded-full h-2">
                  <div
                    className="bg-cyan-600 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Validation hint */}
            {!canUpload && files.length > 0 && (
              <div className="px-5 py-2 bg-amber-50 border-t border-amber-100">
                <p className="text-xs text-amber-700">
                  {!examConfigId && '· Select an exam  '}
                  {!classId      && '· Select a class  '}
                  {!subjectId    && '· Select a subject'}
                </p>
              </div>
            )}

            {/* Upload button */}
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                onClick={handleUpload}
                disabled={isPending || !canUpload}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50 transition shadow-sm"
              >
                {isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading {files.length} file(s)…</>
                  : <><Upload className="w-4 h-4" /> Upload {files.length} Sheet{files.length !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        )}

        {/* Session upload log */}
        {sessionLog.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Uploaded This Session ({sessionLog.length})
              </span>
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {sessionLog.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-mono text-xs text-green-800 font-semibold">{s.anonymousCode}</p>
                    <p className="text-xs text-gray-400 truncate">{s.filename}</p>
                  </div>
                  <ProcessBadge status={s.processingStatus} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </OasesRoleGuard>
  );
};

export default UploadQueue;
