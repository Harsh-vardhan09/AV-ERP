import React, { useState } from 'react';
import {
  useGetTeacherAssignmentsQuery, useAssignTeacherToSubjectMutation,
  useRemoveTeacherAssignmentMutation, useUpdateTeacherAssignmentMutation,
  useGetClassTeachersQuery, useAssignClassTeacherMutation,
  useRemoveClassTeacherMutation, useUpdateClassTeacherMutation,
  useGetClassesQuery, useGetSectionsQuery, useGetSubjectsQuery, useGetActiveSessionQuery
} from '@shared/lib/api/adminApi';
import { useGetAllTeachersQuery } from '@modules/admissions/api/admissionApi';
import ConfirmModal from '@shared/ui/ConfirmModal';
import toast from 'react-hot-toast';

/* ── small reusable inline-edit overlay ── */
const EditModal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>
      {children}
    </div>
  </div>
);

const TeacherAssignmentPage = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;
  const { data: classData } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const { data: subjectData } = useGetSubjectsQuery();
  const { data: teacherData } = useGetAllTeachersQuery({});
  const { data: assignmentData } = useGetTeacherAssignmentsQuery({ session: sessionId }, { skip: !sessionId });
  const { data: ctData } = useGetClassTeachersQuery({ session: sessionId }, { skip: !sessionId });

  const [assignTeacher] = useAssignTeacherToSubjectMutation();
  const [removeAssignment] = useRemoveTeacherAssignmentMutation();
  const [updateAssignment] = useUpdateTeacherAssignmentMutation();
  const [assignCT] = useAssignClassTeacherMutation();
  const [removeCT] = useRemoveClassTeacherMutation();
  const [updateCT] = useUpdateClassTeacherMutation();

  const [form, setForm] = useState({ teacherId: '', subjectId: '', classId: '', sectionId: '' });
  const [ctForm, setCtForm] = useState({ teacherId: '', classId: '', sectionId: '' });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  // Edit state for subject assignment
  const [editingAssignment, setEditingAssignment] = useState(null); // { _id, teacherId, subjectId }
  const [editAssignForm, setEditAssignForm] = useState({ teacherId: '', subjectId: '' });

  // Edit state for class teacher
  const [editingCT, setEditingCT] = useState(null); // { _id, teacherId }
  const [editCTForm, setEditCTForm] = useState({ teacherId: '' });

  const { data: sectionData } = useGetSectionsQuery(
    { classId: form.classId, session: sessionId },
    { skip: !sessionId || !form.classId }
  );
  const { data: ctSectionData } = useGetSectionsQuery(
    { classId: ctForm.classId, session: sessionId },
    { skip: !sessionId || !ctForm.classId }
  );

  const classes = classData?.data || [];
  const subjects = subjectData?.data || [];
  const teachers = teacherData?.data || [];
  const assignments = assignmentData?.data || [];
  const classTeachers = ctData?.data || [];
  const sections = sectionData?.data || [];
  const ctSections = ctSectionData?.data || [];

  // ── Assign subject ──
  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await assignTeacher({ ...form, session: sessionId }).unwrap();
      toast.success('Teacher assigned');
      setForm({ teacherId: '', subjectId: '', classId: '', sectionId: '' });
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  // ── Assign class teacher ──
  const handleAssignCT = async (e) => {
    e.preventDefault();
    try {
      await assignCT({ ...ctForm, session: sessionId }).unwrap();
      toast.success('Class teacher assigned');
      setCtForm({ teacherId: '', classId: '', sectionId: '' });
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  // ── Edit subject assignment ──
  const openEditAssignment = (a) => {
    setEditingAssignment(a);
    setEditAssignForm({
      teacherId: a.teacherId?._id || '',
      subjectId: a.subjectId?._id || '',
    });
  };
  const handleUpdateAssignment = async (e) => {
    e.preventDefault();
    try {
      await updateAssignment({ id: editingAssignment._id, ...editAssignForm }).unwrap();
      toast.success('Assignment updated');
      setEditingAssignment(null);
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  // ── Edit class teacher ──
  const openEditCT = (ct) => {
    setEditingCT(ct);
    setEditCTForm({ teacherId: ct.teacherId?._id || '' });
  };
  const handleUpdateCT = async (e) => {
    e.preventDefault();
    try {
      await updateCT({ id: editingCT._id, ...editCTForm }).unwrap();
      toast.success('Class teacher updated');
      setEditingCT(null);
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  // ── Delete ──
  const handleRemoveAssignment = (a) => {
    setConfirmModal({
      open: true,
      title: 'Remove Teacher Assignment',
      message: `Remove ${a.teacherId?.firstName} ${a.teacherId?.lastName} from ${a.subjectId?.name} (${a.classId?.name} - ${a.sectionId?.name})?`,
      onConfirm: async () => {
        try {
          await removeAssignment(a._id).unwrap();
          toast.success('Assignment removed');
        } catch (err) { toast.error(err?.data?.message || 'Error'); }
        setConfirmModal({ open: false });
      }
    });
  };

  const handleRemoveCT = (ct) => {
    setConfirmModal({
      open: true,
      title: 'Remove Class Teacher',
      message: `Remove ${ct.teacherId?.firstName} ${ct.teacherId?.lastName} as class teacher of ${ct.classId?.name} - ${ct.sectionId?.name}?`,
      onConfirm: async () => {
        try {
          await removeCT(ct._id).unwrap();
          toast.success('Class teacher removed');
        } catch (err) { toast.error(err?.data?.message || 'Error'); }
        setConfirmModal({ open: false });
      }
    });
  };

  if (!sessionId) return <div className="text-center py-12 text-gray-500">Activate a session first.</div>;

  const sel = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Teacher Assignments</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Assign subject */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Assign Teacher to Subject</h2>
          <form onSubmit={handleAssign} className="space-y-3">
            <select value={form.teacherId} onChange={e => setForm({ ...form, teacherId: e.target.value })} required className={sel}>
              <option value="">Select Teacher</option>
              {teachers.map(t => <option key={t._id} value={t.userId?._id}>{t.firstName} {t.lastName}</option>)}
            </select>
            <select value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value, sectionId: '' })} required className={sel}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={form.sectionId} onChange={e => setForm({ ...form, sectionId: e.target.value })} required className={sel}>
              <option value="">Select Section</option>
              {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })} required className={sel}>
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
            </select>
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 w-full">Assign</button>
          </form>
        </div>

        {/* Assign class teacher */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Assign Class Teacher</h2>
          <form onSubmit={handleAssignCT} className="space-y-3">
            <select value={ctForm.teacherId} onChange={e => setCtForm({ ...ctForm, teacherId: e.target.value })} required className={sel}>
              <option value="">Select Teacher</option>
              {teachers.map(t => <option key={t._id} value={t.userId?._id}>{t.firstName} {t.lastName}</option>)}
            </select>
            <select value={ctForm.classId} onChange={e => setCtForm({ ...ctForm, classId: e.target.value, sectionId: '' })} required className={sel}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select value={ctForm.sectionId} onChange={e => setCtForm({ ...ctForm, sectionId: e.target.value })} required className={sel}>
              <option value="">Select Section</option>
              {ctSections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 w-full">Assign</button>
          </form>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Assignments table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">Subject Assignments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Teacher</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Subject</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Class</th>
                  <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Section</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {assignments.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-6 text-gray-400 text-xs">No assignments yet</td></tr>
                )}
                {assignments.map(a => (
                  <tr key={a._id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-800">{a.teacherId?.firstName} {a.teacherId?.lastName}</td>
                    <td className="py-2 px-3 text-gray-600">{a.subjectId?.name}</td>
                    <td className="py-2 px-3 text-gray-600">{a.classId?.name}</td>
                    <td className="py-2 px-3 text-gray-600">{a.sectionId?.name}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditAssignment(a)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-50">
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveAssignment(a)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 px-2 py-0.5 rounded hover:bg-red-50">
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Class Teachers table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b">
            <h3 className="font-semibold text-gray-700">Class Teachers</h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Teacher</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Class</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium">Section</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {classTeachers.length === 0 && (
                <tr><td colSpan="4" className="text-center py-6 text-gray-400 text-xs">No class teachers assigned</td></tr>
              )}
              {classTeachers.map(ct => (
                <tr key={ct._id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-800">{ct.teacherId?.firstName} {ct.teacherId?.lastName}</td>
                  <td className="py-2 px-3 text-gray-600">{ct.classId?.name}</td>
                  <td className="py-2 px-3 text-gray-600">{ct.sectionId?.name}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditCT(ct)}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-50">
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveCT(ct)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium border border-red-200 px-2 py-0.5 rounded hover:bg-red-50">
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* ── Edit Subject Assignment Modal ── */}
      {editingAssignment && (
        <EditModal
          title={`Edit Assignment — ${editingAssignment.classId?.name} ${editingAssignment.sectionId?.name}`}
          onClose={() => setEditingAssignment(null)}>
          <form onSubmit={handleUpdateAssignment} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teacher</label>
              <select value={editAssignForm.teacherId}
                onChange={e => setEditAssignForm(f => ({ ...f, teacherId: e.target.value }))}
                required className={sel}>
                <option value="">Select Teacher</option>
                {teachers.map(t => (
                  <option key={t._id} value={t.userId?._id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Subject</label>
              <select value={editAssignForm.subjectId}
                onChange={e => setEditAssignForm(f => ({ ...f, subjectId: e.target.value }))}
                required className={sel}>
                <option value="">Select Subject</option>
                {subjects.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditingAssignment(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Save Changes
              </button>
            </div>
          </form>
        </EditModal>
      )}

      {/* ── Edit Class Teacher Modal ── */}
      {editingCT && (
        <EditModal
          title={`Edit Class Teacher — ${editingCT.classId?.name} ${editingCT.sectionId?.name}`}
          onClose={() => setEditingCT(null)}>
          <form onSubmit={handleUpdateCT} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">New Class Teacher</label>
              <select value={editCTForm.teacherId}
                onChange={e => setEditCTForm({ teacherId: e.target.value })}
                required className={sel}>
                <option value="">Select Teacher</option>
                {teachers.map(t => (
                  <option key={t._id} value={t.userId?._id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditingCT(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                Save Changes
              </button>
            </div>
          </form>
        </EditModal>
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

export default TeacherAssignmentPage;
