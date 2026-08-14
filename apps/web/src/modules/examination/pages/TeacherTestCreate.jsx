import React, { useState } from 'react';
import { useCreateTeacherTestMutation, useGetMyAssignmentsQuery, useGetMyExamsQuery, useUpdateTeacherTestMutation, useDeleteTeacherTestMutation } from '@modules/people/api/teacherApi';
import { useGetActiveSessionQuery } from '@shared/lib/api/adminApi';
import toast from 'react-hot-toast';

const TeacherTestCreate = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const sessionId = sessionData?.data?._id;
  const { data: assignmentData } = useGetMyAssignmentsQuery({ session: sessionId }, { skip: !sessionId });
  const { data: examData } = useGetMyExamsQuery({ session: sessionId }, { skip: !sessionId });
  const [createTest, { isLoading }] = useCreateTeacherTestMutation();
  const [updateTest, { isLoading: saving }] = useUpdateTeacherTestMutation();
  const [deleteTest] = useDeleteTeacherTestMutation();

  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '', maxMarks: 100, passingMarks: 33 });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const assignments = assignmentData?.data || [];
  const exams = examData?.data || [];
  const myTests = exams.filter(e => e.createdByRole === 'teacher');

  // Unique subjects this teacher teaches
  const mySubjects = [...new Map(
    assignments.map(a => [a.subjectId?._id, { name: a.subjectId?.name, code: a.subjectId?.code }])
  ).values()];

  // Unique classes
  const myClasses = [...new Map(
    assignments.map(a => [a.classId?._id, a.classId?.name])
  ).values()];

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await createTest({ ...form, session: sessionId }).unwrap();
      toast.success(res.message);
      setForm({ name: '', description: '', startDate: '', endDate: '', maxMarks: 100, passingMarks: 33 });
      setShowForm(false);
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  // The server is authoritative — it refuses a test you did not create, one whose
  // marks window has opened, and one that already has marks. This only avoids
  // offering a button that is certain to be rejected.
  const canManage = (t) => t.marksWindow?.open === false && !t.evaluationLocked;

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateTest({
        id: editing._id,
        name: editing.name,
        description: editing.description || '',
        startDate: editing.startDate || null,
        endDate: editing.endDate || null,
      }).unwrap();
      toast.success(res.message);
      setEditing(null);
    } catch (err) { toast.error(err?.data?.message || 'Failed to update test'); }
  };

  const handleDelete = async (t) => {
    try {
      const res = await deleteTest(t._id).unwrap();
      toast.success(res.message);
    } catch (err) { toast.error(err?.data?.message || 'Failed to delete test'); }
  };

  if (!sessionId) return <div className="text-center py-12 text-gray-500">Activate a session first.</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Tests</h1>
          <p className="text-sm text-gray-500">Create unit tests for your subjects</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
          {showForm ? 'Cancel' : '+ Create Test'}
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex gap-6 text-sm">
          <div><span className="font-medium text-blue-800">Your Subjects:</span> <span className="text-blue-600">{mySubjects.map(s => s.name).join(', ') || 'None'}</span></div>
          <div><span className="font-medium text-blue-800">Your Classes:</span> <span className="text-blue-600">{myClasses.map(([, name]) => name).join(', ') || 'None'}</span></div>
        </div>
        <p className="text-xs text-blue-500 mt-1">Tests will be auto-created for all your assigned classes & subjects</p>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Unit Test 1 - Math" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Marks</label>
              <input type="number" value={form.maxMarks} onChange={e => setForm({ ...form, maxMarks: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Marks</label>
              <input type="number" value={form.passingMarks} onChange={e => setForm({ ...form, passingMarks: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {isLoading ? 'Creating...' : 'Create Unit Test'}
          </button>
        </form>
      )}

      {/* My Tests List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b"><h3 className="font-semibold text-gray-700">My Created Tests</h3></div>
        <div className="divide-y">
          {myTests.map(t => (
            <div key={t._id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-800">{t.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Classes: {t.classIds?.map(c => c.name).join(', ')}</p>
                  {t.startDate && <p className="text-xs text-gray-400">{new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Unit Test</span>
                  {canManage(t) ? (
                    <>
                      <button
                        onClick={() => setEditing({
                          ...t,
                          startDate: t.startDate ? t.startDate.slice(0, 10) : '',
                          endDate: t.endDate ? t.endDate.slice(0, 10) : '',
                        })}
                        className="text-indigo-500 text-xs hover:text-indigo-700 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="text-red-500 text-xs hover:text-red-700"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <span
                      className="text-gray-400 text-xs"
                      title={t.marksWindow?.message || 'Marks entry has opened — ask an administrator to change this test.'}
                    >
                      🔒 Locked
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {myTests.length === 0 && <p className="text-center py-8 text-gray-500">No tests created yet</p>}
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-xl shadow-lg w-full max-w-md p-5">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Edit Test</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={editing.description || ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editing.startDate}
                    onChange={e => setEditing({ ...editing, startDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editing.endDate}
                    onChange={e => setEditing({ ...editing, endDate: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button type="submit" disabled={saving || !editing.name?.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TeacherTestCreate;
