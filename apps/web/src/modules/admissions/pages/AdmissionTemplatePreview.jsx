import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetAdmissionTemplateQuery,
  useGenerateAdmissionPDFMutation,
} from '../api/admissionTemplateApi';
import {
  useGetAllStudentsQuery,
} from '../api/admissionApi';
import {
  useGetClassesQuery,
  useGetSectionsQuery,
} from '../api/admissionApi';

const API_BASE = import.meta.env.VITE_PORT;

const STATUS_BADGE = {
  published:   'bg-emerald-100 text-emerald-700',
  recommended: 'bg-blue-100 text-blue-700',
  draft:       'bg-yellow-100 text-yellow-700',
  deprecated:  'bg-orange-100 text-orange-700',
  archived:    'bg-gray-100 text-gray-500',
};

export default function AdmissionTemplatePreview() {
  const { id }   = useParams();
  const navigate = useNavigate();

  /* ── Filter state ──────────────────────────────────────────────────────── */
  const [selectedClassId, setSelectedClassId]     = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [studentSearch, setStudentSearch]         = useState('');
  const [selectedStudent, setSelectedStudent]     = useState(null);
  const [showDropdown, setShowDropdown]           = useState(false);
  const dropdownRef                               = useRef(null);

  /* ── Preview HTML state ────────────────────────────────────────────────── */
  const [previewHtml, setPreviewHtml]       = useState('');
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError]     = useState(null);

  /* ── RTK Query — template ──────────────────────────────────────────────── */
  const { data, isLoading: tplLoading } = useGetAdmissionTemplateQuery(id);
  const template = data?.data;

  /* ── RTK Query — classes / sections ───────────────────────────────────── */
  const { data: classesData } = useGetClassesQuery();
  const classes = useMemo(
    () => (Array.isArray(classesData?.data) ? classesData.data : []),
    [classesData]
  );

  const { data: sectionsData } = useGetSectionsQuery(selectedClassId || undefined, {
    skip: !selectedClassId,
  });
  const sections = useMemo(
    () => (Array.isArray(sectionsData?.data) ? sectionsData.data : []),
    [sectionsData]
  );

  /* ── RTK Query — students (filtered) ──────────────────────────────────── */
  // Fire the query when: any filter is active (class/section selected, or 2+ char name)
  const studentQueryParams = useMemo(() => {
    const p = {};
    if (selectedClassId)   p.classId   = selectedClassId;
    if (selectedSectionId) p.sectionId = selectedSectionId;
    if (studentSearch.trim().length >= 2) p.search = studentSearch.trim();
    return p;
  }, [selectedClassId, selectedSectionId, studentSearch]);

  const hasFilter = selectedClassId || selectedSectionId || studentSearch.trim().length >= 2;

  const { data: studentsData, isFetching: searchingStudents } = useGetAllStudentsQuery(
    studentQueryParams,
    { skip: !hasFilter }
  );
  const students = useMemo(
    () => (Array.isArray(studentsData?.data) ? studentsData.data : []),
    [studentsData]
  );

  const [generatePDF, { isLoading: isGenerating }] = useGenerateAdmissionPDFMutation();

  /* ── Fetch preview HTML via native fetch (avoids RTK responseHandler issues) */
  const fetchPreview = useCallback(async (templateId, studentId) => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      let url = `${API_BASE}/api/v1/admission-templates/${templateId}/preview`;
      if (studentId) url += `?studentId=${studentId}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || `Server error ${res.status}`);
      }
      const html = await res.text();
      setPreviewHtml(html);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  /* Re-fetch whenever template id or selected student changes */
  useEffect(() => {
    if (!id) return;
    fetchPreview(id, selectedStudent?._id);
  }, [id, selectedStudent?._id, fetchPreview]);

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectStudent = useCallback((st) => {
    setSelectedStudent(st);
    setStudentSearch(`${st.firstName || ''} ${st.lastName || ''}`.trim());
    setShowDropdown(false);
  }, []);

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setStudentSearch('');
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    setSelectedSectionId('');  // reset section when class changes
    setSelectedStudent(null);
    setStudentSearch('');
  };

  const handleSectionChange = (sectionId) => {
    setSelectedSectionId(sectionId);
    setSelectedStudent(null);
    setStudentSearch('');
    // Auto-open dropdown to show students in this class+section
    if (sectionId) setShowDropdown(true);
  };

  const handleGeneratePDF = async () => {
    if (!selectedStudent) return toast.error('Please select a student first');
    try {
      const res = await generatePDF({ studentId: selectedStudent._id, templateId: id }).unwrap();
      toast.success(`PDF ready for ${selectedStudent.firstName}!`);
      window.open(`${API_BASE}${res.data.downloadUrl}`, '_blank');
    } catch (err) {
      toast.error(err?.data?.message || 'PDF generation failed');
    }
  };

  /* ── Loading template metadata ──────────────────────────────────────────── */
  if (tplLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading template…</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-3">📄</div>
        <p className="text-lg font-semibold text-gray-700">Template not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-blue-600 hover:underline text-sm"
        >
          ← Back
        </button>
      </div>
    );
  }

  /* ── Main render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors"
            title="Go back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{template.name}</h1>
            {template.description && (
              <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            📄 {template.config?.pageSize || 'A4'} · {template.config?.orientation || 'portrait'}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_BADGE[template.templateStatus] || 'bg-gray-100 text-gray-600'}`}>
            {template.templateStatus}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            {template.extractedFields?.length || 0} fields
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
            Used {template.usageCount || 0}×
          </span>
          {template.isDefault && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">
              ⭐ Default
            </span>
          )}
        </div>
      </div>

      {/* ── Student Selector Card ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col gap-4">

        {/* Filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* ── Class filter ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Class
            </label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
              >
                <option value="">All Classes</option>
                {classes
                  .slice()
                  .sort((a, b) => (a.numericOrder || 0) - (b.numericOrder || 0))
                  .map((cls) => (
                    <option key={cls._id} value={cls._id}>{cls.name}</option>
                  ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* ── Section filter ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Section
              {!selectedClassId && <span className="ml-1 font-normal text-gray-400">(select class first)</span>}
            </label>
            <div className="relative">
              <select
                value={selectedSectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={!selectedClassId}
                className="w-full appearance-none pl-3 pr-8 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>{sec.name}</option>
                ))}
              </select>
              <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* ── Name search ── */}
          <div ref={dropdownRef}>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Search by Name
              <span className="ml-1 font-normal text-gray-400">(2+ chars)</span>
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) setSelectedStudent(null);
                }}
                onFocus={() => hasFilter && setShowDropdown(true)}
                placeholder="Type student name…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchingStudents && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Student dropdown */}
              {showDropdown && hasFilter && (
                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  {students.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-400">
                      {searchingStudents ? 'Loading students…' : 'No students found'}
                    </p>
                  ) : (
                    <ul className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                      {students.map((st) => (
                        <li
                          key={st._id}
                          onMouseDown={() => handleSelectStudent(st)}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(st.firstName?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {st.firstName} {st.lastName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {[
                                st.admissionNumber && `Adm: ${st.admissionNumber}`,
                                st.classId?.name && `Class ${st.classId.name}`,
                                st.sectionId?.name && `Sec ${st.sectionId.name}`,
                              ].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Selected student chip */}
          {selectedStudent && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-white text-xs font-bold">
                {selectedStudent.firstName?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-800 leading-tight">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </p>
                <p className="text-xs text-emerald-600">
                  {[
                    selectedStudent.admissionNumber,
                    selectedStudent.classId?.name && `Class ${selectedStudent.classId.name}`,
                    selectedStudent.sectionId?.name && `Sec ${selectedStudent.sectionId.name}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                onClick={handleClearStudent}
                className="ml-1 p-0.5 text-emerald-400 hover:text-emerald-700 transition-colors"
                title="Clear selection"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Clear all filters */}
          {(selectedClassId || selectedSectionId || studentSearch) && !selectedStudent && (
            <button
              onClick={() => { setSelectedClassId(''); setSelectedSectionId(''); setStudentSearch(''); setSelectedStudent(null); setShowDropdown(false); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}

          <div className="ml-auto">
            {/* Download PDF button */}
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating || !selectedStudent}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status hint */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${selectedStudent ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <p className="text-xs text-gray-400 italic">
            {selectedStudent
              ? `Showing real data for ${selectedStudent.firstName} ${selectedStudent.lastName}`
              : hasFilter
                ? `${students.length} student${students.length !== 1 ? 's' : ''} found — click one to preview`
                : 'Select a class or type a name to find students'}
          </p>
        </div>
      </div>

      {/* ── Preview Panel ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-700">Live Preview</span>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {previewLoading ? (
              <>
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <div className={`w-2 h-2 rounded-full ${selectedStudent ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {selectedStudent ? 'Real student data' : 'Sample data'}
              </>
            )}
          </div>
        </div>

        {/* Error state */}
        {previewError && !previewLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-semibold text-red-600">Preview failed</p>
            <p className="text-xs text-gray-400 text-center max-w-xs">{previewError}</p>
            <button
              onClick={() => fetchPreview(id, selectedStudent?._id)}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {previewLoading && (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto" />
            <div className="h-px bg-gray-200 my-4" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-2 gap-4">
                <div className="h-4 bg-gray-200 rounded" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* iframe — srcDoc prevents cross-origin/cookie issues */}
        {!previewLoading && !previewError && previewHtml && (
          <iframe
            srcDoc={previewHtml}
            title="Admission Form Preview"
            className="w-full border-0 block"
            style={{ height: '1040px' }}
            sandbox="allow-same-origin"
          />
        )}

        {/* Empty HTML returned */}
        {!previewLoading && !previewError && !previewHtml && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
            <div className="text-5xl">📄</div>
            <p className="text-sm font-medium">No preview content</p>
            <p className="text-xs">The template may have no HTML content.</p>
          </div>
        )}
      </div>

      {/* ── Extracted fields reference ────────────────────────────────────────── */}
      {Array.isArray(template.extractedFields) && template.extractedFields.length > 0 && (
        <details className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <summary className="px-4 py-3 cursor-pointer select-none list-none flex items-center gap-2 text-sm font-semibold text-gray-700">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
            </svg>
            Supported Placeholders ({template.extractedFields.length})
            <span className="ml-auto text-xs font-normal text-gray-400">click to expand</span>
          </summary>
          <div className="px-4 pb-4 pt-1 flex flex-wrap gap-1.5">
            {template.extractedFields.map((f) => {
              const key = typeof f === 'string' ? f : f.key || f.name || String(f);
              return (
                <span key={key} className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs rounded-md font-mono">
                  {`{{${key}}}`}
                </span>
              );
            })}
          </div>
        </details>
      )}

      {/* ── Info note ─────────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-xs text-blue-700">
          <strong>ℹ️ Note:</strong> This template is managed by the System Administrator. Contact your Super Admin to change the template design. PDF is generated using Puppeteer with live student data.
        </p>
      </div>
    </div>
  );
}
