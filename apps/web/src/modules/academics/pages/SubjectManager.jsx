import React, { useState, useMemo } from 'react';
import {
  useGetSubjectsQuery, useCreateSubjectMutation, useDeleteSubjectMutation, useUpdateSubjectMutation,
  useGetClassSubjectsQuery, useMapSubjectToClassMutation, useRemoveClassSubjectMappingMutation,
  useGetClassesQuery, useGetActiveSessionQuery, useGetTeacherAssignmentsQuery
} from '../../../redux/api/adminApi';
import ConfirmModal from '@shared/ui/ConfirmModal';
import toast from 'react-hot-toast';

// ── Edit Subject Modal ─────────────────────────────────────────────────────────
const EditSubjectModal = ({ subject, onClose, onSave, loading }) => {
  const [name, setName] = useState(subject?.name || '');
  const [code, setCode] = useState(subject?.code || '');
  const [type, setType] = useState(subject?.type || 'core');
  if (!subject) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6" style={{animation:'scaleIn .2s ease-out'}}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Subject</h3>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Mathematics"
          autoFocus
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. MATH"
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="core">Core</option>
          <option value="elective">Elective</option>
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
          <button
            onClick={() => onSave({ name: name.trim(), code: code.trim(), type })}
            disabled={!name.trim() || !code.trim() || loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >{loading ? 'Saving…' : 'Save Changes'}</button>
        </div>
        <style>{`@keyframes scaleIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      </div>
    </div>
  );
};

const SubjectManager = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;
  const { data: subjectData, isLoading } = useGetSubjectsQuery();
  const { data: classData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const { data: mappingData } = useGetClassSubjectsQuery({ session: sessionId }, { skip: !sessionId });
  const [createSubject] = useCreateSubjectMutation();
  const [deleteSubject] = useDeleteSubjectMutation();
  const [updateSubject, { isLoading: updatingSubject }] = useUpdateSubjectMutation();
  const [mapSubject] = useMapSubjectToClassMutation();
  const [removeMapping] = useRemoveClassSubjectMappingMutation();

  const [form, setForm] = useState({ name: '', code: '', type: 'core' });
  const [mapForm, setMapForm] = useState({ classId: '', subjectId: '' });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const subjects = subjectData?.data || [];
  const classes = classData?.data || [];
  const mappings = mappingData?.data || [];

  // Fetch all teacher assignments for session; filter client-side by selected subject
  const { data: allAssignmentsData, isLoading: assignmentsLoading } = useGetTeacherAssignmentsQuery(
    { session: sessionId },
    { skip: !selectedSubject || !sessionId }
  );
  const subjectAssignments = (allAssignmentsData?.data || []).filter(
    a => a.subjectId?._id === selectedSubject?._id
  );
  // Mapped classes for selected subject
  const selectedSubjectMappings = selectedSubject
    ? mappings.filter(m => m.subjectId?._id === selectedSubject._id)
    : [];

  // Per-subject: how many classes it's mapped to
  const subjectClassCount = useMemo(() => {
    const counts = {};
    mappings.forEach(m => {
      const sid = m.subjectId?._id;
      if (sid) {
        if (!counts[sid]) counts[sid] = { count: 0, classNames: [] };
        counts[sid].count++;
        if (m.classId?.name) counts[sid].classNames.push(m.classId.name);
      }
    });
    return counts;
  }, [mappings]);

  // Per-class: how many subjects it has
  const classSubjectCount = useMemo(() => {
    const counts = {};
    mappings.forEach(m => {
      const cid = m.classId?._id;
      if (cid) {
        if (!counts[cid]) counts[cid] = { count: 0, subjectNames: [] };
        counts[cid].count++;
        if (m.subjectId?.name) counts[cid].subjectNames.push(m.subjectId.name);
      }
    });
    return counts;
  }, [mappings]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createSubject(form).unwrap();
      toast.success('Subject created');
      setForm({ name: '', code: '', type: 'core' });
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  const handleMap = async (e) => {
    e.preventDefault();
    try {
      await mapSubject({ ...mapForm, session: sessionId }).unwrap();
      toast.success('Subject mapped to class');
      setMapForm({ classId: '', subjectId: '' });
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  const handleDeleteSubject = (s) => {
    setConfirmModal({
      open: true,
      title: 'Delete Subject',
      message: `Are you sure you want to delete "${s.name}" (${s.code})? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteSubject(s._id).unwrap();
          toast.success('Subject deleted');
        } catch (err) { toast.error(err?.data?.message || 'Error'); }
        setConfirmModal({ open: false });
      }
    });
  };

  const handleRemoveMapping = (m) => {
    setConfirmModal({
      open: true,
      title: 'Remove Mapping',
      message: `Remove "${m.subjectId?.name}" from class "${m.classId?.name}"?`,
      onConfirm: async () => {
        try {
          await removeMapping(m._id).unwrap();
          toast.success('Mapping removed');
        } catch (err) { toast.error(err?.data?.message || 'Error'); }
        setConfirmModal({ open: false });
      }
    });
  };

  const handleEditSubject = (s) => {
    setEditingSubject(s);
  };

  const handleSaveEditSubject = async ({ name, code, type }) => {
    if (!name || !code) return;
    try {
      await updateSubject({ id: editingSubject._id, name, code, type }).unwrap();
      toast.success('Subject updated');
      setEditingSubject(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update subject');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Subject Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Add Subject */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Add Subject</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Subject Name" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Code (e.g. MATH)" required className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
                <option value="core">Core</option>
                <option value="elective">Elective</option>
              </select>
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Add Subject</button>
          </form>
        </div>

        {/* Map Subject to Class */}
        {sessionId && (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Map Subject to Class</h2>
            <form onSubmit={handleMap} className="space-y-3">
              <select value={mapForm.classId} onChange={e => setMapForm({ ...mapForm, classId: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <select value={mapForm.subjectId} onChange={e => setMapForm({ ...mapForm, subjectId: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
              </select>
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">Map Subject</button>
            </form>
          </div>
        )}
      </div>

      {/* Class-wise Subject Summary */}
      {sessionId && classes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">📊 Class-wise Subject Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {classes.map(c => {
              const info = classSubjectCount[c._id];
              return (
                <div key={c._id} className="bg-gray-50 rounded-xl p-4 border hover:shadow-md transition-shadow group relative">
                  <div className="text-2xl font-bold text-indigo-600">{info?.count || 0}</div>
                  <div className="text-sm font-medium text-gray-700 mt-1">{c.name}</div>
                  <div className="text-xs text-gray-400">subject{(info?.count || 0) !== 1 ? 's' : ''}</div>
                  {info?.subjectNames?.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-3 z-10 hidden group-hover:block">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Subjects:</p>
                      {info.subjectNames.map((name, i) => (
                        <p key={i} className="text-xs text-gray-500">• {name}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subjects Table + Mappings Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All Subjects — with mapped class count */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b"><h3 className="font-semibold text-gray-700">All Subjects</h3></div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead><tr className="border-b"><th className="text-left py-2 px-4 text-gray-500">Name</th><th className="text-left py-2 px-4 text-gray-500">Code</th><th className="text-left py-2 px-4 text-gray-500">Type</th><th className="text-left py-2 px-4 text-gray-500">Classes</th><th className="py-2 px-4"></th></tr></thead>
            <tbody>
              {subjects.map(s => {
                const info = subjectClassCount[s._id];
                return (
                  <tr key={s._id} className={`border-t hover:bg-indigo-50 group relative cursor-pointer transition-colors ${selectedSubject?._id === s._id ? 'bg-indigo-50' : ''}`} onClick={() => setSelectedSubject(prev => prev?._id === s._id ? null : s)}>
                    <td className={`py-2 px-4 font-medium ${selectedSubject?._id === s._id ? 'text-indigo-600' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        {s.name}
                        {selectedSubject?._id === s._id && (
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-normal">viewing</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">{s.code}</span></td>
                    <td className="py-2 px-4 capitalize">{s.type}</td>
                    <td className="py-2 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        (info?.count || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {info?.count || 0} class{(info?.count || 0) !== 1 ? 'es' : ''}
                      </span>
                      {info?.classNames?.length > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 bg-white border rounded-lg shadow-lg p-3 z-10 hidden group-hover:block whitespace-nowrap">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Mapped to:</p>
                          {info.classNames.map((name, i) => (
                            <p key={i} className="text-xs text-gray-500">• {name}</p>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditSubject(s)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors">Edit</button>
                        <button onClick={() => handleDeleteSubject(s)} className="text-red-600 hover:text-red-800 text-sm transition-colors">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>

        {/* Mappings Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b"><h3 className="font-semibold text-gray-700">Class-Subject Mappings</h3></div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[360px]">
            <thead><tr className="border-b"><th className="text-left py-2 px-4 text-gray-500">Class</th><th className="text-left py-2 px-4 text-gray-500">Subject</th><th className="py-2 px-4"></th></tr></thead>
            <tbody>
              {mappings.map(m => (
                <tr key={m._id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">{m.classId?.name}</td>
                  <td className="py-2 px-4">{m.subjectId?.name} ({m.subjectId?.code})</td>
                  <td className="py-2 px-4"><button onClick={() => handleRemoveMapping(m)} className="text-red-600 text-sm">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* ── Subject Detail Panel ──────────────────────────────────────────── */}
      {selectedSubject && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Panel header */}
          <div className="border-b px-5 py-4 flex items-center justify-between bg-gray-50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800 text-sm">{selectedSubject.name}</h3>
                <span className="text-xs text-gray-500 font-mono border border-gray-200 px-1.5 py-0.5 rounded bg-white">{selectedSubject.code}</span>
                <span className="text-xs text-gray-400 capitalize">{selectedSubject.type}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Mapped classes &amp; assigned teachers</p>
            </div>
            <button
              onClick={() => setSelectedSubject(null)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
            {/* Left: Mapped Classes */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Mapped Classes <span className="font-normal normal-case text-gray-400">({selectedSubjectMappings.length})</span>
              </p>
              {selectedSubjectMappings.length === 0 ? (
                <p className="text-sm text-gray-400 italic">This subject is not mapped to any class yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedSubjectMappings.map(m => (
                    <span key={m._id} className="text-sm text-gray-700 border border-gray-200 bg-gray-50 px-3 py-1 rounded-md">
                      {m.classId?.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Teacher Assignments */}
            <div className="p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Teachers Assigned <span className="font-normal normal-case text-gray-400">({subjectAssignments.length})</span>
              </p>
              {assignmentsLoading ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : subjectAssignments.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No teachers assigned to this subject yet.</p>
              ) : (
                <div className="space-y-2">
                  {subjectAssignments.map(a => (
                    <div key={a._id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {a.teacherId?.firstName} {a.teacherId?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{a.teacherId?.email}</p>
                      </div>
                      <span className="text-xs text-gray-500 border border-gray-200 bg-white px-2 py-0.5 rounded">
                        {a.classId?.name}{a.sectionId?.name ? ` / Sec ${a.sectionId.name}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingSubject && (
        <EditSubjectModal
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onSave={handleSaveEditSubject}
          loading={updatingSubject}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false })}
      />
    </div>
  );
};

export default SubjectManager;
