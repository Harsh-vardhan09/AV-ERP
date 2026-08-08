import React, { useState } from 'react';
import { useGetSessionsQuery, useCreateSessionMutation, useUpdateSessionMutation, useDeleteSessionMutation, useCopyClassesToSessionMutation, useSyncStudentSessionsMutation, useCopySubjectMapsToSessionMutation, useCopyTeacherAssignmentsToSessionMutation } from '@shared/lib/api/adminApi';
import ConfirmModal from '@shared/ui/ConfirmModal';
import toast from 'react-hot-toast';

const SessionManager = () => {
  const { data, isLoading } = useGetSessionsQuery();
  const [createSession] = useCreateSessionMutation();
  const [updateSession] = useUpdateSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();
  const [copyClasses, { isLoading: isCopying }] = useCopyClassesToSessionMutation();
  const [syncStudents, { isLoading: isSyncing }] = useSyncStudentSessionsMutation();
  const [copySubjectMaps, { isLoading: isCopyingSubjects }] = useCopySubjectMapsToSessionMutation();
  const [copyTeacherAssignments, { isLoading: isCopyingTeachers }] = useCopyTeacherAssignmentsToSessionMutation();
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isActive: false });
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [copyingSessionId, setCopyingSessionId] = useState(null);
  const [syncingSessionId, setSyncingSessionId] = useState(null);
  const [copyingSubjectsId, setCopyingSubjectsId] = useState(null);
  const [copyingTeachersId, setCopyingTeachersId] = useState(null);

  const sessions = data?.data || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateSession({ id: editId, ...form }).unwrap();
        toast.success('Session updated');
      } else {
        await createSession(form).unwrap();
        toast.success('Session created');
      }
      resetForm();
    } catch (err) {
      toast.error(err?.data?.message || 'Error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', startDate: '', endDate: '', isActive: false });
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (s) => {
    setForm({ name: s.name, startDate: s.startDate?.slice(0, 10), endDate: s.endDate?.slice(0, 10), isActive: s.isActive });
    setEditId(s._id);
    setShowForm(true);
  };

  const handleDelete = (s) => {
    setConfirmModal({
      open: true,
      title: 'Delete Session',
      message: `Are you sure you want to delete session "${s.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteSession(s._id).unwrap();
          toast.success('Session deleted');
        } catch (err) {
          toast.error(err?.data?.message || 'Error');
        }
        setConfirmModal({ open: false });
      }
    });
  };

  const handleCopyClasses = (s) => {
    setConfirmModal({
      open: true,
      title: 'Copy Classes to This Session',
      message: `This will copy all classes and sections from the previous session into "${s.name}". Already-existing classes will be skipped. Continue?`,
      confirmLabel: 'Yes, Copy Classes',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmModal({ open: false });
        setCopyingSessionId(s._id);
        try {
          const res = await copyClasses({ id: s._id }).unwrap();
          toast.success(res.message || 'Classes copied successfully');
        } catch (err) {
          toast.error(err?.data?.message || 'Failed to copy classes');
        } finally {
          setCopyingSessionId(null);
        }
      }
    });
  };

  const handleSyncStudents = (s) => {
    setConfirmModal({
      open: true,
      title: 'Fix Student Sessions',
      message: `This will scan for students whose class belongs to "${s.name}" but whose session is still pointing to an old session (e.g. promoted before the fix). They will be updated to session "${s.name}" automatically. Continue?`,
      confirmLabel: 'Yes, Fix Students',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmModal({ open: false });
        setSyncingSessionId(s._id);
        try {
          const res = await syncStudents(s._id).unwrap();
          toast.success(res.message || 'Students synced successfully');
        } catch (err) {
          toast.error(err?.data?.message || 'Failed to sync students');
        } finally {
          setSyncingSessionId(null);
        }
      }
    });
  };

  const handleCopySubjectMaps = (s) => {
    setConfirmModal({
      open: true,
      title: 'Copy Subject Mappings',
      message: `This will copy all subject-to-class mappings from the previous session into "${s.name}". Make sure you have already run "Copy Classes" first. Existing mappings will be skipped. Continue?`,
      confirmLabel: 'Yes, Copy Subjects',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmModal({ open: false });
        setCopyingSubjectsId(s._id);
        try {
          const res = await copySubjectMaps({ id: s._id }).unwrap();
          toast.success(res.message || 'Subject mappings copied successfully');
        } catch (err) {
          toast.error(err?.data?.message || 'Failed to copy subject mappings');
        } finally {
          setCopyingSubjectsId(null);
        }
      }
    });
  };

  const handleCopyTeacherAssignments = (s) => {
    setConfirmModal({
      open: true,
      title: 'Copy Teacher Assignments',
      message: `This will copy all teacher-subject assignments and class teacher assignments from the previous session into "${s.name}". Make sure classes are copied first. Existing assignments will be skipped. Continue?`,
      confirmLabel: 'Yes, Copy Teachers',
      variant: 'primary',
      onConfirm: async () => {
        setConfirmModal({ open: false });
        setCopyingTeachersId(s._id);
        try {
          const res = await copyTeacherAssignments({ id: s._id }).unwrap();
          const { teacherSubjectAssignments: tsa, classTeacherAssignments: cta } = res.data;
          toast.success(`Subject assignments: ${tsa.copied} copied. Class teachers: ${cta.copied} copied.`);
        } catch (err) {
          toast.error(err?.data?.message || 'Failed to copy teacher assignments');
        } finally {
          setCopyingTeachersId(null);
        }
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Academic Sessions</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          {showForm ? 'Cancel' : '+ New Session'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2025-26" required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="text-sm font-medium text-gray-700">Set as Active</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
              {editId ? 'Update Session' : 'Create Session'}
            </button>
          </div>
        </form>
      )}

      {/* Info banner */}
      {sessions.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-3 text-sm text-blue-700">
          When you start a new session, use the buttons below to carry over your existing setup — no need to recreate anything manually.
        </div>
      )}

      {/* New Session Setup Guide */}
      {sessions.length > 1 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 text-sm text-green-800">
          <p className="font-semibold mb-1">New Session Setup Order:</p>
          <ol className="list-decimal ml-5 space-y-0.5 leading-relaxed">
            <li>Create new session → check <strong>Set as Active</strong></li>
            <li>Click <strong>Copy Classes</strong> to copy class &amp; section structure</li>
            <li>Click <strong>Copy Subjects</strong> to copy subject-to-class mappings</li>
            <li>Click <strong>Copy Teachers</strong> to copy teacher assignments</li>
            <li>Go to <strong>Students → Migration / Promotion</strong> to promote students</li>
            <li>Click <strong>Fix Students</strong> if any student shows wrong session</li>
          </ol>
        </div>
      )}

      {isLoading ? <div className="text-center py-8">Loading...</div> : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Start</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">End</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s._id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{s.name}</td>
                  <td className="py-3 px-4">{new Date(s.startDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4">{new Date(s.endDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => handleEdit(s)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Edit</button>
                      <button onClick={() => handleDelete(s)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                      {sessions.length > 1 && (
                        <>
                          <button
                            onClick={() => handleCopyClasses(s)}
                            disabled={isCopying && copyingSessionId === s._id}
                            className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            title="Copy all classes & sections from the most recent previous session into this session"
                          >
                            {isCopying && copyingSessionId === s._id ? (
                              <><span className="w-3 h-3 border border-emerald-600 border-t-transparent rounded-full animate-spin inline-block mr-1" />Copying…</>
                            ) : <>Copy Classes</>}
                          </button>
                          <button
                            onClick={() => handleSyncStudents(s)}
                            disabled={isSyncing && syncingSessionId === s._id}
                            className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
                            title="Fix students who were promoted but still show the old session"
                          >
                            {isSyncing && syncingSessionId === s._id ? (
                              <><span className="w-3 h-3 border border-orange-600 border-t-transparent rounded-full animate-spin inline-block mr-1" />Fixing…</>
                            ) : <>Fix Students</>}
                          </button>
                          <button
                            onClick={() => handleCopySubjectMaps(s)}
                            disabled={isCopyingSubjects && copyingSubjectsId === s._id}
                            className="flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
                            title="Copy subject-to-class mappings from previous session (run Copy Classes first)"
                          >
                            {isCopyingSubjects && copyingSubjectsId === s._id ? (
                              <><span className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin inline-block mr-1" />Copying…</>
                            ) : <>Copy Subjects</>}
                          </button>
                          <button
                            onClick={() => handleCopyTeacherAssignments(s)}
                            disabled={isCopyingTeachers && copyingTeachersId === s._id}
                            className="flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                            title="Copy teacher-subject and class teacher assignments from previous session"
                          >
                            {isCopyingTeachers && copyingTeachersId === s._id ? (
                              <><span className="w-3 h-3 border border-purple-600 border-t-transparent rounded-full animate-spin inline-block mr-1" />Copying…</>
                            ) : <>Copy Teachers</>}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan="5" className="text-center py-8 text-gray-500">No sessions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false })}
      />
    </div>
  );
};

export default SessionManager;
