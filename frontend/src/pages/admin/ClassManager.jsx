import React, { useState } from 'react';
import {
  useGetClassesQuery, useCreateClassMutation, useDeleteClassMutation, useUpdateClassMutation,
  useGetSectionsQuery, useCreateBulkSectionsMutation, useDeleteSectionMutation,
  useUpdateSectionMutation, useGetActiveSessionQuery, useGetAdminStudentsQuery
} from '../../redux/api/adminApi';
import ConfirmModal from '../../components/admin/ConfirmModal';
import toast from 'react-hot-toast';

// ── CSV/Excel download helper ──────────────────────────────────────────────────
const downloadCSV = (students, className, sectionName) => {
  const headers = [
    'Roll No', 'Admission No', 'Name', 'Gender', 'Date of Birth',
    'Father Name', 'Father Phone', 'Phone', 'Address', 'City', 'State', 'Pincode', 'Status'
  ];
  const rows = students.map(s => [
    s.rollNo || '',
    s.admissionNumber || '',
    `${s.firstName} ${s.middleName || ''} ${s.lastName}`.replace(/\s+/g, ' ').trim(),
    s.gender || '',
    s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '',
    s.parentDetails?.father?.name || '',
    s.parentDetails?.father?.phone || '',
    s.phone || '',
    s.address || '',
    s.city || '',
    s.state || '',
    s.pincode || '',
    s.status || '',
  ]);
  const bom = '\uFEFF';
  const csvContent = bom + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${className}_Section_${sectionName}_Students.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ── Edit Class Modal ──────────────────────────────────────────────────────────
const EditClassModal = ({ cls, onClose, onSave, loading }) => {
  const [name, setName] = useState(cls?.name || '');
  const [order, setOrder] = useState(cls?.numericOrder ?? '');
  if (!cls) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-[scaleIn_0.2s_ease-out]">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Class</h3>
        <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. 1st, 2nd, 10th"
          autoFocus
        />
        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
        <input
          type="number"
          value={order}
          onChange={e => setOrder(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. 1"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
          <button
            onClick={() => onSave({ name: name.trim(), numericOrder: parseInt(order) })}
            disabled={!name.trim() || !order || loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >{loading ? 'Saving…' : 'Save Changes'}</button>
        </div>
        <style>{`@keyframes scaleIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      </div>
    </div>
  );
};

// ── Edit Section Modal ─────────────────────────────────────────────────────────
const EditSectionModal = ({ section, onClose, onSave, loading }) => {
  const [name, setName] = useState(section?.name || '');
  if (!section) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-[scaleIn_0.2s_ease-out]">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Edit Section</h3>
        <p className="text-sm text-gray-500 mb-4">
          Renaming section <span className="font-medium text-indigo-600">{section.name}</span> of class <span className="font-medium">{section.classId?.name}</span>
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. A"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >Cancel</button>
          <button
            onClick={() => onSave(name.trim())}
            disabled={!name.trim() || loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >{loading ? 'Saving…' : 'Save Changes'}</button>
        </div>
        <style>{`@keyframes scaleIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
      </div>
    </div>
  );
};

// ── Student List Panel ─────────────────────────────────────────────────────────
const StudentListPanel = ({ section, students, isLoading, onClose }) => {
  const [search, setSearch] = useState('');
  const filtered = (students || []).filter(s => {
    const q = search.toLowerCase();
    return !q ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.rollNo || '').toLowerCase().includes(q) ||
      (s.admissionNumber || '').toLowerCase().includes(q);
  });

  return (
    <div className="mt-6 bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Panel header */}
      <div className="bg-indigo-50 border-b px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-indigo-800 text-base">
            Students — {section.classId?.name} / Section {section.name}
          </h3>
          <p className="text-xs text-indigo-500 mt-0.5">
            {isLoading ? 'Loading…' : `${filtered.length} student${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Download CSV (opens in Excel) */}
          <button
            onClick={() => downloadCSV(filtered, section.classId?.name, section.name)}
            disabled={isLoading || !filtered.length}
            title="Download as CSV / Open in Excel"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Download Excel / CSV
          </button>
          {/* Download all class students */}
          <button
            onClick={() => downloadCSV(students || [], section.classId?.name, section.name)}
            disabled={isLoading || !(students || []).length}
            title="Download all students of this class-section"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b bg-gray-50">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, roll no, admission no…"
          className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left py-3 px-4 font-medium">#</th>
              <th className="text-left py-3 px-4 font-medium">Roll No</th>
              <th className="text-left py-3 px-4 font-medium">Admission No</th>
              <th className="text-left py-3 px-4 font-medium">Name</th>
              <th className="text-left py-3 px-4 font-medium">Gender</th>
              <th className="text-left py-3 px-4 font-medium">Father Name</th>
              <th className="text-left py-3 px-4 font-medium">Phone</th>
              <th className="text-left py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="8" className="text-center py-10 text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    Loading students…
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-10 text-gray-400">
                  {search ? 'No students match your search.' : 'No students in this section.'}
                </td>
              </tr>
            )}
            {!isLoading && filtered.map((s, idx) => (
              <tr key={s._id} className="border-t hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                <td className="py-3 px-4 font-medium">{s.rollNo || '—'}</td>
                <td className="py-3 px-4">{s.admissionNumber || '—'}</td>
                <td className="py-3 px-4 font-medium text-gray-900">
                  {`${s.firstName} ${s.middleName || ''} ${s.lastName}`.replace(/\s+/g, ' ').trim()}
                </td>
                <td className="py-3 px-4 capitalize">{s.gender || '—'}</td>
                <td className="py-3 px-4">{s.parentDetails?.father?.name || '—'}</td>
                <td className="py-3 px-4">{s.phone || s.parentDetails?.father?.phone || '—'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                    s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main ClassManager ──────────────────────────────────────────────────────────
const ClassManager = () => {
  const { data: sessionData } = useGetActiveSessionQuery();
  const activeSession = sessionData?.data;
  const sessionId = activeSession?._id;

  const { data: classData, isLoading: classLoading } = useGetClassesQuery(sessionId, { skip: !sessionId });
  const { data: sectionData } = useGetSectionsQuery({ session: sessionId }, { skip: !sessionId });
  const [createClass] = useCreateClassMutation();
  const [deleteClass] = useDeleteClassMutation();
  const [createBulkSections] = useCreateBulkSectionsMutation();
  const [deleteSection] = useDeleteSectionMutation();
  const [updateSection, { isLoading: updatingSection }] = useUpdateSectionMutation();

  const [classForm, setClassForm] = useState({ name: '', numericOrder: '' });
  const [sectionForm, setSectionForm] = useState({ names: '', classId: '' });
  const [selectedClass, setSelectedClass] = useState('');

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  // Edit class modal state
  const [editingClass, setEditingClass] = useState(null);
  const [updateClass, { isLoading: updatingClass }] = useUpdateClassMutation();

  // Edit section modal state
  const [editingSection, setEditingSection] = useState(null);

  // Selected section for student list
  const [selectedSection, setSelectedSection] = useState(null);

  const classes = classData?.data || [];
  const sections = (sectionData?.data || []).filter(s => !selectedClass || s.classId?._id === selectedClass);

  // Fetch students for selected section
  const { data: studentData, isLoading: studentsLoading } = useGetAdminStudentsQuery(
    { sectionId: selectedSection?._id },
    { skip: !selectedSection?._id }
  );
  const students = studentData?.data || [];

  // ── Existing handlers (untouched) ──────────────────────────────────────────
  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await createClass({ ...classForm, numericOrder: parseInt(classForm.numericOrder), session: sessionId }).unwrap();
      toast.success('Class created');
      setClassForm({ name: '', numericOrder: '' });
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  const handleCreateSections = async (e) => {
    e.preventDefault();
    try {
      const res = await createBulkSections({ names: sectionForm.names, classId: sectionForm.classId, session: sessionId }).unwrap();
      toast.success(res.message);
      setSectionForm({ names: '', classId: '' });
    } catch (err) { toast.error(err?.data?.message || 'Error'); }
  };

  const handleDeleteClass = (cls) => {
    setConfirmModal({
      open: true,
      title: 'Delete Class',
      message: `Are you sure you want to delete class "${cls.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteClass(cls._id).unwrap();
          toast.success('Class deleted');
          if (selectedClass === cls._id) setSelectedClass('');
        } catch (err) { toast.error(err?.data?.message || 'Error'); }
        setConfirmModal({ open: false });
      }
    });
  };

  const handleDeleteSection = (section) => {
    setConfirmModal({
      open: true,
      title: 'Delete Section',
      message: `Are you sure you want to delete section "${section.name}" from ${section.classId?.name}?`,
      onConfirm: async () => {
        try {
          await deleteSection(section._id).unwrap();
          toast.success('Section deleted');
          if (selectedSection?._id === section._id) setSelectedSection(null);
        } catch (err) { toast.error(err?.data?.message || 'Error'); }
        setConfirmModal({ open: false });
      }
    });
  };

  // ── New handlers ───────────────────────────────────────────────────────────
  const handleSectionClick = (section) => {
    setSelectedSection(prev => prev?._id === section._id ? null : section);
  };

  const handleEditClass = (e, cls) => {
    e.stopPropagation();
    setEditingClass(cls);
  };

  const handleSaveEditClass = async ({ name, numericOrder }) => {
    if (!name) return;
    try {
      await updateClass({ id: editingClass._id, name, numericOrder }).unwrap();
      toast.success('Class updated');
      setEditingClass(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update class');
    }
  };

  const handleEditSection = (e, section) => {
    e.stopPropagation();
    setEditingSection(section);
  };

  const handleSaveEditSection = async (newName) => {
    if (!newName) return;
    try {
      await updateSection({ id: editingSection._id, name: newName }).unwrap();
      toast.success('Section updated');
      // If the edited section is currently selected, update the reference
      if (selectedSection?._id === editingSection._id) {
        setSelectedSection(prev => ({ ...prev, name: newName }));
      }
      setEditingSection(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update section');
    }
  };

  if (!sessionId) return (
    <div className="text-center py-12 text-gray-500">
      Please create and activate an academic session first.
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Classes & Sections</h1>
      <p className="text-sm text-gray-500 mb-6">
        Active Session: <span className="font-semibold text-indigo-600">{activeSession?.name}</span>
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Classes ─────────────────────────────────────────────────────── */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">Add Class</h2>
            <form onSubmit={handleCreateClass} className="flex gap-2">
              <input type="text" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. 1st, 2nd, 10th" required className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <input type="number" value={classForm.numericOrder} onChange={e => setClassForm({ ...classForm, numericOrder: e.target.value })} placeholder="Order" required className="w-20 border rounded-lg px-3 py-2 text-sm" />
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Add</button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Order</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c._id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedClass(c._id)}>
                    <td className={`py-3 px-4 font-medium ${selectedClass === c._id ? 'text-indigo-600' : ''}`}>{c.name}</td>
                    <td className="py-3 px-4">{c.numericOrder}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => handleEditClass(e, c)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors">Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteClass(c); }} className="text-red-600 hover:text-red-800 text-sm transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {classes.length === 0 && <tr><td colSpan="3" className="text-center py-6 text-gray-500">No classes yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Sections ────────────────────────────────────────────────────── */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
            <h2 className="font-semibold text-gray-800 mb-3">Add Sections</h2>
            <form onSubmit={handleCreateSections} className="flex gap-2">
              <select value={sectionForm.classId} onChange={e => setSectionForm({ ...sectionForm, classId: e.target.value })} required className="flex-1 border rounded-lg px-3 py-2 text-sm">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <input type="text" value={sectionForm.names} onChange={e => setSectionForm({ ...sectionForm, names: e.target.value })} placeholder="e.g. A, B, C" required className="w-32 border rounded-lg px-3 py-2 text-sm" />
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Add</button>
            </form>
            <p className="text-xs text-gray-400 mt-2">Tip: Use commas to add multiple sections at once (e.g. A, B, C)</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Section</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Class</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sections.map(s => (
                  <tr
                    key={s._id}
                    className={`border-t hover:bg-indigo-50 cursor-pointer transition-colors ${selectedSection?._id === s._id ? 'bg-indigo-50' : ''}`}
                    onClick={() => handleSectionClick(s)}
                  >
                    <td className={`py-3 px-4 font-medium ${selectedSection?._id === s._id ? 'text-indigo-600' : ''}`}>
                      <div className="flex items-center gap-1.5">
                        {s.name}
                        {selectedSection?._id === s._id && (
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-normal">viewing</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">{s.classId?.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => handleEditSection(e, s)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
                        >Edit</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSection(s); }}
                          className="text-red-600 hover:text-red-800 text-sm transition-colors"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sections.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-6 text-gray-500">
                      {selectedClass ? 'No sections for this class' : 'Click a class to see sections'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Student List Panel (shows when section is selected) ─────────── */}
      {selectedSection && (
        <StudentListPanel
          section={selectedSection}
          students={students}
          isLoading={studentsLoading}
          onClose={() => setSelectedSection(null)}
        />
      )}

      {/* ── Edit Class Modal ─────────────────────────────────────────────── */}
      {editingClass && (
        <EditClassModal
          cls={editingClass}
          onClose={() => setEditingClass(null)}
          onSave={handleSaveEditClass}
          loading={updatingClass}
        />
      )}

      {/* ── Edit Section Modal ───────────────────────────────────────────── */}
      {editingSection && (
        <EditSectionModal
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={handleSaveEditSection}
          loading={updatingSection}
        />
      )}

      {/* ── Confirm Delete Modal (existing) ─────────────────────────────── */}
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

export default ClassManager;
