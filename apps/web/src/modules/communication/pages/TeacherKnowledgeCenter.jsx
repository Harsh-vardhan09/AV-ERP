import React, { useState } from 'react';
import {
  useUploadMaterialMutation,
  useGetMyMaterialsQuery,
  useUpdateMaterialMutation,
  useDeleteMaterialMutation,
  useGetMyAssignmentsQuery,
} from '@modules/people/api/teacherApi';
import { useGetActiveSessionQuery } from '@shared/lib/api/adminApi';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const FileIcon = ({ type }) => {
  const map = {
    pdf: <span className="text-red-500 font-bold text-xs">PDF</span>,
    doc: <span className="text-blue-500 font-bold text-xs">DOC</span>,
    docx: <span className="text-blue-500 font-bold text-xs">DOC</span>,
    image: <span className="text-green-500 font-bold text-xs">IMG</span>,
  };
  return (
    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
      {map[type] || <span className="text-gray-400 font-bold text-xs">FILE</span>}
    </div>
  );
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const Sel = ({ label, value, onChange, children, required }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && ' *'}</label>
    <select value={value} onChange={onChange} required={required}
      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
      {children}
    </select>
  </div>
);

const Inp = ({ label, required, ...p }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && ' *'}</label>
    <input {...p} required={required} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
  </div>
);

const Txt = ({ label, ...p }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <textarea {...p} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
  </div>
);

const TeacherKnowledgeCenter = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data: slotsData } = useGetMyAssignmentsQuery(sessionId, { skip: !sessionId });
  const mySlots = slotsData?.data || [];

  // Derive unique classes from my slots
  const myClasses = [...new Map(mySlots.map(s => [s.classId._id, s.classId])).values()];

  // Filter state for viewing materials
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const filterParams = {};
  if (filterClass) filterParams.classId = filterClass;
  if (filterSubject) filterParams.subjectId = filterSubject;
  if (filterFrom) filterParams.from = filterFrom;
  if (filterTo) filterParams.to = filterTo;

  const { data: materialsData } = useGetMyMaterialsQuery(filterParams);
  const materials = materialsData?.data || [];

  const [uploadMaterial, { isLoading: uploading }] = useUploadMaterialMutation();
  const [updateMaterial, { isLoading: updating }] = useUpdateMaterialMutation();
  const [deleteMaterial, { isLoading: deleting }] = useDeleteMaterialMutation();

  // Tabs: 'list' | 'create'
  const [tab, setTab] = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Create form
  const [cForm, setCForm] = useState({
    classId: '', sectionId: '', subjectId: '', customSubjectName: '',
    title: '', description: '', file: null
  });

  // Derived: sections for selected class in create form
  const sectionsForClass = mySlots
    .filter(s => s.classId._id === cForm.classId)
    .map(s => s.sectionId)
    .filter((s, i, arr) => arr.findIndex(x => x._id === s._id) === i);

  // Subjects for selected class+section
  const subjectsForSlot = mySlots
    .filter(s => s.classId._id === cForm.classId && s.sectionId._id === cForm.sectionId)
    .map(s => s.subjectId);

  // For materials list filter: subjects in selected class
  const subjectsForFilterClass = mySlots
    .filter(s => !filterClass || s.classId._id === filterClass)
    .map(s => s.subjectId)
    .filter((s, i, arr) => arr.findIndex(x => x._id === s._id) === i);

  // ── Create ──
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!cForm.file) { toast.error('Please select a file'); return; }
    if (!cForm.classId || !cForm.sectionId) { toast.error('Select class and section'); return; }
    if (!cForm.title) { toast.error('Enter a title'); return; }

    const slot = mySlots.find(s =>
      s.classId._id === cForm.classId && s.sectionId._id === cForm.sectionId
    );
    if (!slot) { toast.error('Invalid selection'); return; }

    const fd = new FormData();
    fd.append('classId', cForm.classId);
    fd.append('sectionId', cForm.sectionId);
    fd.append('session', sessionId);
    fd.append('title', cForm.title);
    fd.append('description', cForm.description);
    if (cForm.subjectId && cForm.subjectId !== 'other') {
      fd.append('subjectId', cForm.subjectId);
    } else {
      fd.append('customSubjectName', cForm.customSubjectName);
    }
    fd.append('photo', cForm.file);

    try {
      await uploadMaterial(fd).unwrap();
      toast.success('Material uploaded successfully!');
      setCForm({ classId: '', sectionId: '', subjectId: '', customSubjectName: '', title: '', description: '', file: null });
      setTab('list');
    } catch (err) {
      toast.error(err?.data?.message || 'Upload failed');
    }
  };

  // ── Edit ──
  const [eForm, setEForm] = useState({ title: '', description: '', customSubjectName: '', file: null });
  const openEdit = (m) => {
    setEditTarget(m);
    setEForm({ title: m.title, description: m.description || '', customSubjectName: m.customSubjectName || '', file: null });
  };
  const handleUpdate = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', eForm.title);
    fd.append('description', eForm.description);
    fd.append('customSubjectName', eForm.customSubjectName);
    if (eForm.file) fd.append('photo', eForm.file);
    try {
      await updateMaterial({ materialId: editTarget._id, formData: fd }).unwrap();
      toast.success('Updated!');
      setEditTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Update failed');
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    try {
      await deleteMaterial(confirmDeleteId).unwrap();
      toast.success('Deleted');
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Delete failed');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Knowledge Center</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            My Materials
          </button>
          <button onClick={() => setTab('create')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-1.5 ${tab === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Upload Material
          </button>
        </div>
      </div>

      {/* ── Upload Form ── */}
      {tab === 'create' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Upload Study Material</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Sel label="Class" required value={cForm.classId}
                onChange={e => setCForm({ ...cForm, classId: e.target.value, sectionId: '', subjectId: '', customSubjectName: '' })}>
                <option value="">Select class</option>
                {myClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Sel>
              <Sel label="Section" required value={cForm.sectionId}
                onChange={e => setCForm({ ...cForm, sectionId: e.target.value, subjectId: '', customSubjectName: '' })}
                disabled={!cForm.classId}>
                <option value="">Select section</option>
                {sectionsForClass.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </Sel>
            </div>
            <Sel label="Subject" required value={cForm.subjectId}
              onChange={e => setCForm({ ...cForm, subjectId: e.target.value, customSubjectName: '' })}
              disabled={!cForm.sectionId}>
              <option value="">Select subject</option>
              {subjectsForSlot.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              <option value="other">Other (specify below)</option>
            </Sel>
            {cForm.subjectId === 'other' && (
              <Inp label="Custom Subject Name *" value={cForm.customSubjectName}
                onChange={e => setCForm({ ...cForm, customSubjectName: e.target.value })}
                placeholder="e.g. General Knowledge" required />
            )}
            <Inp label="Title *" value={cForm.title} onChange={e => setCForm({ ...cForm, title: e.target.value })} placeholder="Material title" required />
            <Txt label="Description" value={cForm.description} onChange={e => setCForm({ ...cForm, description: e.target.value })} placeholder="Brief description (optional)" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">File *</label>
              <input type="file" onChange={e => setCForm({ ...cForm, file: e.target.files[0] })} required
                className="w-full border border-gray-200 rounded-md px-2 py-2 text-sm text-gray-600"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx" />
              {cForm.file && <p className="text-xs text-gray-500 mt-1">Selected: {cForm.file.name}</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={uploading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button type="button" onClick={() => setTab('list')}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-md text-sm hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── My Materials ── */}
      {tab === 'list' && (
        <div>
          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Filter Materials</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Class</label>
                <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Classes</option>
                  {myClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subject</label>
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Subjects</option>
                  {subjectsForFilterClass.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            {(filterClass || filterSubject || filterFrom || filterTo) && (
              <button onClick={() => { setFilterClass(''); setFilterSubject(''); setFilterFrom(''); setFilterTo(''); }}
                className="mt-2 text-xs text-blue-600 hover:underline">Clear filters</button>
            )}
          </div>

          {/* Materials list */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded Materials</h2>
              <span className="text-xs text-gray-400">{materials.length} items</span>
            </div>
            {materials.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No materials uploaded yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {materials.map(m => (
                  <div key={m._id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                    <FileIcon type={m.fileType} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{m.title}</p>
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">{m.subjectDisplay}</span>
                        <span>{m.classId?.name} {m.sectionId?.name}</span>
                        <span>{fmtDate(m.createdAt)}</span>
                        <span className="text-green-600">{m.viewCount} views</span>
                      </div>
                      {m.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50">View</a>
                      <button onClick={() => openEdit(m)}
                        className="text-xs text-gray-600 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">Edit</button>
                      <button onClick={() => setConfirmDeleteId(m._id)}
                        className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Material">
        <form onSubmit={handleUpdate} className="space-y-3">
          <Inp label="Title *" value={eForm.title} onChange={e => setEForm({ ...eForm, title: e.target.value })} required />
          <Txt label="Description" value={eForm.description} onChange={e => setEForm({ ...eForm, description: e.target.value })} />
          {editTarget && !editTarget.subjectId && (
            <Inp label="Custom Subject Name" value={eForm.customSubjectName}
              onChange={e => setEForm({ ...eForm, customSubjectName: e.target.value })} />
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Replace file (optional)</label>
            <input type="file" onChange={e => setEForm({ ...eForm, file: e.target.files[0] })}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-600"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={updating}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditTarget(null)}
              className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Confirm Delete">
        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this material? This cannot be undone.</p>
        <div className="flex gap-2">
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 bg-red-600 text-white py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={() => setConfirmDeleteId(null)}
            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-200">Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default TeacherKnowledgeCenter;
