import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import {
  useLazyGetPromotionPreviewQuery,
  usePromoteStudentsMutation,
} from '@modules/people/api/studentManagementApi';
import { useGetClassesQuery, useGetSectionsQuery, useGetSessionsQuery, adminApi } from '../../../redux/api/adminApi';

// ─── Stepper ─────────────────────────────────────────────────────────────────
const steps = ['Select Students', 'Configure Destination', 'Done'];

const Stepper = ({ current }) => (
  <div className="flex items-center mb-6">
    {steps.map((label, i) => {
      const n = i + 1;
      const done = n < current;
      const active = n === current;
      return (
        <React.Fragment key={n}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0
              ${done ? 'bg-blue-600 border-blue-600 text-white'
                : active ? 'bg-white border-blue-600 text-blue-600'
                : 'bg-white border-gray-300 text-gray-400'}`}>
              {done ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : n}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${active ? 'text-gray-900' : done ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className={`flex-1 h-px mx-3 ${done ? 'bg-blue-600' : 'bg-gray-200'}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

const Spinner = () => (
  <div className="flex justify-center py-10">
    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const selCls = "w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50";

export default function MigrationPromotion() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [step, setStep] = useState(1);

  // Step 1 — Source
  const [fromClassId, setFromClassId] = useState('');
  const [fromSectionId, setFromSectionId] = useState('');
  const [previewStudents, setPreviewStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Step 2 — Destination
  const [toClassId, setToClassId] = useState('');
  const [toSectionId, setToSectionId] = useState('');
  const [toSessionId, setToSessionId] = useState('');
  const [fromSessionId, setFromSessionId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Step 3 — Result
  const [result, setResult] = useState(null);

  const { data: classData } = useGetClassesQuery();
  const { data: fromSectionData } = useGetSectionsQuery({ classId: fromClassId }, { skip: !fromClassId });
  const { data: toSectionData } = useGetSectionsQuery({ classId: toClassId }, { skip: !toClassId });
  const { data: sessionData } = useGetSessionsQuery();

  const [fetchPreview, { isLoading: isPreviewing }] = useLazyGetPromotionPreviewQuery();
  const [promote, { isLoading: isPromoting }] = usePromoteStudentsMutation();

  const classes = classData?.data || [];
  const fromSections = fromSectionData?.data || [];
  const toSections = toSectionData?.data || [];
  const sessions = sessionData?.data || [];

  const allSelected = previewStudents.length > 0 && previewStudents.every(s => selectedIds.has(s._id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(previewStudents.map(s => s._id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handlePreview = async () => {
    if (!fromClassId) return toast.error('Please select a source class');
    try {
      const res = await fetchPreview({ fromClassId, fromSectionId }).unwrap();
      const students = res?.data?.students || [];
      setPreviewStudents(students);
      setSelectedIds(new Set(students.map(s => s._id)));
      if (students.length === 0) return toast('No active students found in this class', { icon: 'ℹ️' });
      setStep(2);
    } catch (e) { toast.error(e?.data?.message || 'Preview failed'); }
  };

  const handlePromote = async () => {
    if (!toClassId || !toSessionId) return toast.error('Target class and session are required');
    if (selectedIds.size === 0) return toast.error('No students selected');
    try {
      const res = await promote({
        studentProfileIds: [...selectedIds],
        toClassId,
        toSectionId: toSectionId || undefined,
        toSessionId,
        fromSessionId: fromSessionId || undefined,
      }).unwrap();
      setResult(res);
      setStep(3);
      setConfirmOpen(false);
      toast.success(res.message);
      // Invalidate admin dashboard cache so student count refreshes when navigating back
      dispatch(adminApi.util.invalidateTags(['Dashboard']));
    } catch (e) { toast.error(e?.data?.message || 'Promotion failed'); }
  };

  const reset = () => {
    setStep(1);
    setFromClassId(''); setFromSectionId(''); setPreviewStudents([]); setSelectedIds(new Set());
    setToClassId(''); setToSectionId(''); setToSessionId(''); setFromSessionId('');
    setResult(null);
  };

  const fromClassName = classes.find(c => c._id === fromClassId)?.name || '';
  const toClassName = classes.find(c => c._id === toClassId)?.name || '';
  const toSessionName = sessions.find(s => s._id === toSessionId)?.name || '';

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <button onClick={() => navigate('/admin/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span><span>Students</span><span>›</span>
        <span className="text-gray-900 font-medium">Migration / Promotion</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Migration / Promotion</h1>
          <p className="text-xs text-gray-500 mt-0.5">Promote students from one class to another for a new session</p>
        </div>
      </div>

      <Stepper current={step} />

      {/* ─── STEP 1 ─── */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Select Source Class</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs text-gray-500 block mb-1">From Class *</label>
              <select value={fromClassId} onChange={e => { setFromClassId(e.target.value); setFromSectionId(''); }} className={selCls}>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">From Section (optional — leave blank for all sections)</label>
              <select value={fromSectionId} onChange={e => setFromSectionId(e.target.value)} disabled={!fromClassId} className={selCls}>
                <option value="">All Sections</option>
                {fromSections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handlePreview} disabled={!fromClassId || isPreviewing}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-40">
            {isPreviewing ? 'Loading…' : 'Preview Students →'}
          </button>
        </div>
      )}

      {/* ─── STEP 2 ─── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Student selection table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <h2 className="font-semibold text-gray-900">Students from {fromClassName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedIds.size} of {previewStudents.length} selected</p>
              </div>
              <button onClick={() => setStep(1)} className="text-xs text-gray-500 underline hover:text-blue-600">← Back</button>
            </div>
            {isPreviewing ? <Spinner /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-blue-600" />
                      </th>
                      {['Name', 'Roll No', 'Admission No', 'Class', 'Section'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewStudents.map(s => (
                      <tr key={s._id} onClick={() => toggleOne(s._id)}
                        className={`cursor-pointer hover:bg-gray-50 transition-colors ${selectedIds.has(s._id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedIds.has(s._id)} onChange={() => toggleOne(s._id)}
                            onClick={e => e.stopPropagation()} className="accent-blue-600" />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{s.fullName}</td>
                        <td className="px-4 py-3 text-gray-600">{s.rollNo || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{s.admissionNo || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{s.className}</td>
                        <td className="px-4 py-3 text-gray-600">{s.sectionName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Destination configuration */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Select Destination</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">To Class *</label>
                <select value={toClassId} onChange={e => { setToClassId(e.target.value); setToSectionId(''); }} className={selCls}>
                  <option value="">Select class…</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">To Section (optional)</label>
                <select value={toSectionId} onChange={e => setToSectionId(e.target.value)} disabled={!toClassId} className={selCls}>
                  <option value="">No section</option>
                  {toSections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">To Session *</label>
                <select value={toSessionId} onChange={e => setToSessionId(e.target.value)} className={selCls}>
                  <option value="">Select session…</option>
                  {sessions.map(s => <option key={s._id} value={s._id}>{s.name}{s.isActive ? ' (Active)' : ''}</option>)}
                </select>
              </div>
            </div>

            {/* Summary */}
            {toClassId && toSessionId && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 text-sm text-blue-700">
                Moving <strong>{selectedIds.size}</strong> student(s) from <strong>{fromClassName}</strong> → <strong>{toClassName}</strong> · Session: <strong>{toSessionName}</strong>
              </div>
            )}

            <button onClick={() => setConfirmOpen(true)}
              disabled={!toClassId || !toSessionId || selectedIds.size === 0}
              className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-40">
              Promote {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''} →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3 ─── */}
      {step === 3 && result && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Promotion Complete</h2>
          <p className="text-gray-500 text-sm mb-6">{result.message}</p>

          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{result.data?.promotedCount}</div>
              <div className="text-xs text-gray-500 mt-1">Students promoted</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 text-center">
              <div className="text-lg font-bold text-gray-900">{result.data?.targetClass}</div>
              <div className="text-xs text-gray-500 mt-1">Target class</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-5 py-3 text-center">
              <div className="text-lg font-bold text-gray-900">{result.data?.targetSession}</div>
              <div className="text-xs text-gray-500 mt-1">Session</div>
            </div>
          </div>

          <button onClick={reset}
            className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-md text-sm hover:bg-gray-50">
            Promote Another Batch
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Confirm Promotion</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-700 mb-5">
              You are about to promote <strong>{selectedIds.size}</strong> student(s) from{' '}
              <strong>{fromClassName}</strong> to <strong>{toClassName}</strong> in session{' '}
              <strong>{toSessionName}</strong>. Their class and section will be updated immediately.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded-md text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handlePromote} disabled={isPromoting}
                className="flex-1 bg-blue-600 text-white py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                {isPromoting ? 'Promoting…' : 'Confirm & Promote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
