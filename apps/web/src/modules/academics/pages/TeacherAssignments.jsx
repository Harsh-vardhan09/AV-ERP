import React, { useState } from 'react';
import {
  useCreateTeacherAssignmentMutation,
  useGetMyCreatedAssignmentsQuery,
  useGetAssignmentSubmissionsQuery,
  useGetNotSubmittedStudentsQuery,
  useUpdateTeacherAssignmentMutation,
  useDeleteTeacherAssignmentMutation,
  useGetMyAssignmentsQuery,
} from '@modules/people/api/teacherApi';
import { useGetActiveSessionQuery } from '@shared/lib/api/adminApi';
import toast from 'react-hot-toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    {children}
  </div>
);
const TInput = ({ label, ...p }) => (
  <Field label={label}>
    <input {...p} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
  </Field>
);
const TArea = ({ label, ...p }) => (
  <Field label={label}>
    <textarea {...p} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
  </Field>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

const TeacherAssignments = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;

  const { data: subjectAssignments } = useGetMyAssignmentsQuery(sessionId, { skip: !sessionId });
  const { data: myAssignmentsData, refetch } = useGetMyCreatedAssignmentsQuery({ session: sessionId }, { skip: !sessionId });

  const [createAssignment, { isLoading: creating }] = useCreateTeacherAssignmentMutation();
  const [updateAssignment, { isLoading: updating }] = useUpdateTeacherAssignmentMutation();
  const [deleteAssignment, { isLoading: deleting }] = useDeleteTeacherAssignmentMutation();

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [submissionTab, setSubmissionTab] = useState('submitted'); // 'submitted' | 'pending'

  const [createForm, setCreateForm] = useState({ assignmentId: '', title: '', description: '', dueDate: '', file: null });
  const [editForm, setEditForm] = useState({ title: '', description: '', dueDate: '', file: null });

  const myTeachingSlots = subjectAssignments?.data || [];
  const createdAssignments = myAssignmentsData?.data || [];

  const { data: submissionsData } = useGetAssignmentSubmissionsQuery(viewTarget?._id, { skip: !viewTarget?._id });
  const { data: pendingData } = useGetNotSubmittedStudentsQuery(viewTarget?._id, { skip: !viewTarget?._id });

  const submissions = submissionsData?.data || [];
  const pendingStudents = pendingData?.data || [];
  const totalStudents = pendingData?.total ?? (submissions.length + pendingStudents.length);

  // ── Create ──
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.assignmentId || !createForm.title || !createForm.dueDate) {
      toast.error('Fill all required fields'); return;
    }
    const slot = myTeachingSlots.find(a => a._id === createForm.assignmentId);
    if (!slot) { toast.error('Invalid selection'); return; }
    const fd = new FormData();
    fd.append('classId', slot.classId._id);
    fd.append('sectionId', slot.sectionId._id);
    fd.append('subjectId', slot.subjectId._id);
    fd.append('session', sessionId);
    fd.append('title', createForm.title);
    fd.append('description', createForm.description);
    fd.append('dueDate', createForm.dueDate);
    if (createForm.file) fd.append('photo', createForm.file);
    try {
      await createAssignment(fd).unwrap();
      toast.success('Assignment created!');
      setShowCreate(false);
      setCreateForm({ assignmentId: '', title: '', description: '', dueDate: '', file: null });
    } catch (err) { toast.error(err?.data?.message || 'Failed'); }
  };

  // ── Edit ──
  const openEdit = (a) => {
    setEditTarget(a);
    setEditForm({ title: a.title, description: a.description || '', dueDate: a.dueDate?.slice(0, 10) || '', file: null });
  };
  const handleUpdate = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('title', editForm.title);
    fd.append('description', editForm.description);
    fd.append('dueDate', editForm.dueDate);
    if (editForm.file) fd.append('photo', editForm.file);
    try {
      const updated = await updateAssignment({ assignmentId: editTarget._id, formData: fd }).unwrap();
      toast.success('Updated!');
      setEditTarget(null);
      if (viewTarget?._id === editTarget._id) setViewTarget(updated?.data || viewTarget);
    } catch (err) { toast.error(err?.data?.message || 'Update failed'); }
  };

  // ── Delete ──
  const handleDelete = async () => {
    try {
      await deleteAssignment(confirmDeleteId).unwrap();
      toast.success('Deleted');
      setConfirmDeleteId(null);
      if (viewTarget?._id === confirmDeleteId) setViewTarget(null);
    } catch (err) { toast.error(err?.data?.message || 'Delete failed'); }
  };

  const downloadFile = (url, name) => { const l = document.createElement('a'); l.href = url; l.download = name; l.click(); };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Assignments</h1>
        <button onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create Assignment
        </button>
      </div>

      {/* ── Detail View ── */}
      {viewTarget ? (
        <div>
          <button onClick={() => setViewTarget(null)}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to list
          </button>

          {/* Assignment info card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">{viewTarget.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{viewTarget.subjectId?.name} — {viewTarget.classId?.name} {viewTarget.sectionId?.name}</p>
                {viewTarget.description && <p className="text-sm text-gray-600 mt-2">{viewTarget.description}</p>}
                <p className="text-xs text-gray-400 mt-2">Due: {fmtDate(viewTarget.dueDate)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(viewTarget)} className="text-xs border border-blue-200 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-50">Edit</button>
                <button onClick={() => setConfirmDeleteId(viewTarget._id)} className="text-xs border border-red-200 text-red-600 px-3 py-1.5 rounded hover:bg-red-50">Delete</button>
              </div>
            </div>
            {viewTarget.photo && (
              <div className="mt-3">
                <a href={viewTarget.photo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">View attached file</a>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Students', value: totalStudents, color: 'text-gray-700' },
              { label: 'Submitted', value: submissions.length, color: 'text-green-600' },
              { label: 'Not Submitted', value: pendingStudents.length, color: 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-center">
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs + table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-100">
              {[
                { key: 'submitted', label: `Submitted (${submissions.length})` },
                { key: 'pending', label: `Not Submitted (${pendingStudents.length})` },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setSubmissionTab(key)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${submissionTab === key ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {submissionTab === 'submitted' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted On</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.length === 0
                      ? <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400 text-sm">No submissions yet</td></tr>
                      : submissions.map(s => (
                        <tr key={s._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{s.studentid?.firstName} {s.studentid?.lastName}</td>
                          <td className="px-4 py-3 text-gray-600">{s.studentid?.rollNo || s.studentid?.admissionNumber || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{fmtDate(s.submittedAt || s.createdAt)}</td>
                          <td className="px-4 py-3">
                            {s.photo
                              ? <button onClick={() => downloadFile(s.photo, `submission_${s.studentid?.rollNo || s._id}.pdf`)}
                                  className="text-xs text-blue-600 underline hover:text-blue-800">Download</button>
                              : <span className="text-xs text-gray-400">No file</span>}
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingStudents.length === 0
                      ? <tr><td colSpan="3" className="px-4 py-8 text-center text-green-600 text-sm">🎉 All students have submitted!</td></tr>
                      : pendingStudents.map(s => (
                        <tr key={s._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{s.firstName} {s.lastName}</td>
                          <td className="px-4 py-3 text-gray-600">{s.rollNo || s.admissionNumber || '—'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded font-medium">Pending</span>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Assignment List ── */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">My Assignments</h2>
          </div>
          {createdAssignments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm">No assignments yet. Click <strong>Create Assignment</strong> to add one.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {createdAssignments.map(a => (
                <div key={a._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer group"
                  onClick={() => { setViewTarget(a); setSubmissionTab('submitted'); }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.subjectId?.name} — {a.classId?.name} {a.sectionId?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Due: {fmtDate(a.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0" onClick={e => e.stopPropagation()}>
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {a.submissionCount || 0} submitted
                    </span>
                    <button onClick={() => openEdit(a)} className="text-xs border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50">Edit</button>
                    <button onClick={() => setConfirmDeleteId(a._id)} className="text-xs border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Assignment">
        <form onSubmit={handleCreate} className="space-y-3">
          <Field label="Class / Subject *">
            <select value={createForm.assignmentId} onChange={e => setCreateForm({ ...createForm, assignmentId: e.target.value })} required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select your assigned class/subject</option>
              {myTeachingSlots.map(s => (
                <option key={s._id} value={s._id}>{s.subjectId?.name} — {s.classId?.name} {s.sectionId?.name}</option>
              ))}
            </select>
          </Field>
          <TInput label="Title *" type="text" value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} required placeholder="Assignment title" />
          <TArea label="Description" value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Optional" />
          <TInput label="Due Date *" type="date" value={createForm.dueDate} onChange={e => setCreateForm({ ...createForm, dueDate: e.target.value })} required />
          <Field label="Attachment (optional)">
            <input type="file" onChange={e => setCreateForm({ ...createForm, file: e.target.files[0] })}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-600"
              accept=".pdf,.doc,.docx,.jpg,.png" />
          </Field>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={creating} className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Assignment">
        <form onSubmit={handleUpdate} className="space-y-3">
          <TInput label="Title" type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
          <TArea label="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
          <TInput label="Due Date" type="date" value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} required />
          <Field label="Replace file (optional)">
            <input type="file" onChange={e => setEditForm({ ...editForm, file: e.target.files[0] })}
              className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm text-gray-600"
              accept=".pdf,.doc,.docx,.jpg,.png" />
          </Field>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={updating} className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => setEditTarget(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Confirm Delete">
        <p className="text-sm text-gray-600 mb-4">Are you sure? This will delete the assignment and <strong>all student submissions</strong> permanently.</p>
        <div className="flex gap-2">
          <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
          <button onClick={() => setConfirmDeleteId(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-200">Cancel</button>
        </div>
      </Modal>
    </div>
  );
};

export default TeacherAssignments;