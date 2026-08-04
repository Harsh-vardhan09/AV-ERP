import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useGetAllStudentsEnhancedQuery,
  useBulkEditStudentsMutation,
} from '../../../redux/api/studentManagementApi';
import { useGetClassesQuery, useGetSectionsQuery } from '../../../redux/api/adminApi';

const BULK_FIELDS = [
  { value: 'classId', label: 'Class' },
  { value: 'sectionId', label: 'Section' },
  { value: 'gender', label: 'Gender' },
  { value: 'parentName', label: 'Parent Name' },
  { value: 'parentPhone', label: 'Parent Phone' },
  { value: 'parentEmail', label: 'Parent Email' },
];

const Spinner = () => (
  <div className="flex justify-center py-14">
    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function StudentsBulkEdit() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSectionId, setFilterSectionId] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkField, setBulkField] = useState('classId');
  const [bulkValue, setBulkValue] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const debounceRef = useRef(null);
  const handleSearchChange = (v) => {
    setSearchInput(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1); }, 500);
  };

  const { data, isLoading } = useGetAllStudentsEnhancedQuery({ page, limit: 20, search, classId: filterClassId, sectionId: filterSectionId });
  const { data: classData } = useGetClassesQuery();
  const { data: sectionData } = useGetSectionsQuery({ classId: filterClassId }, { skip: !filterClassId });
  const [bulkEdit, { isLoading: isSaving }] = useBulkEditStudentsMutation();

  const students = data?.data?.students || [];
  const pagination = data?.data?.pagination || {};
  const classes = classData?.data || [];
  const sections = sectionData?.data || [];

  const allSelected = students.length > 0 && students.every(s => selected.has(s._id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) students.forEach(s => next.delete(s._id));
    else students.forEach(s => next.add(s._id));
    setSelected(next);
  };
  const toggleOne = (id) => {
    const next = new Set(selected); next.has(id) ? next.delete(id) : next.add(id); setSelected(next);
  };

  const renderValueInput = () => {
    const cls = "border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";
    if (bulkField === 'classId') return (
      <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={`${cls} flex-1`}>
        <option value="">Select class…</option>
        {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
      </select>
    );
    if (bulkField === 'sectionId') return (
      <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={`${cls} flex-1`}>
        <option value="">Select section…</option>
        {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>
    );
    if (bulkField === 'gender') return (
      <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={`${cls} flex-1`}>
        <option value="">Select gender…</option>
        {['male', 'female', 'other'].map(g => <option key={g} value={g}>{g}</option>)}
      </select>
    );
    return <input value={bulkValue} onChange={e => setBulkValue(e.target.value)} placeholder="Enter new value…" className={`${cls} flex-1`} />;
  };

  const handleApply = async () => {
    if (!bulkValue) return toast.error('Please enter a value to apply');
    try {
      const res = await bulkEdit({ studentProfileIds: [...selected], updates: { [bulkField]: bulkValue } }).unwrap();
      toast.success(res.message || 'Updated successfully');
      setSelected(new Set()); setConfirmOpen(false); setBulkValue('');
    } catch (e) { toast.error(e?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
        <button onClick={() => navigate('/admin/dashboard')} className="hover:text-blue-600">Dashboard</button>
        <span>›</span><span>Students</span><span>›</span>
        <span className="text-gray-900 font-medium">Bulk Edit</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Students Bulk Edit</h1>
          <p className="text-xs text-gray-500 mt-0.5">Select students and apply a change to all at once</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-700">
        Select students using checkboxes, then choose a field and value below to apply the change to all selected students.
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-white border border-blue-300 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
          <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{selected.size} selected</span>
          <select value={bulkField} onChange={e => { setBulkField(e.target.value); setBulkValue(''); }}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            {BULK_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          {renderValueInput()}
          <button onClick={() => setConfirmOpen(true)} disabled={!bulkValue}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-40">
            Apply to {selected.size}
          </button>
          <button onClick={() => setSelected(new Set())} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50">
            Clear
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <select value={filterClassId} onChange={e => { setFilterClassId(e.target.value); setFilterSectionId(''); setPage(1); }}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select value={filterSectionId} onChange={e => { setFilterSectionId(e.target.value); setPage(1); }} disabled={!filterClassId}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50">
            <option value="">All Sections</option>
            {sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <input value={searchInput} onChange={e => handleSearchChange(e.target.value)} placeholder="Search students…"
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          {search && <button onClick={() => { setSearch(''); setSearchInput(''); }} className="text-xs text-gray-500 underline px-1">Clear</button>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? <Spinner /> : students.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">No students found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-blue-600" />
                  </th>
                  {['Name', 'Roll No', 'Class', 'Section', 'Gender', 'Parent Phone'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(s => (
                  <tr key={s._id} onClick={() => toggleOne(s._id)} className={`cursor-pointer hover:bg-gray-50 transition-colors ${selected.has(s._id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggleOne(s._id)} onClick={e => e.stopPropagation()} className="accent-blue-600" />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{s.fullName || `${s.firstName} ${s.lastName}`}</td>
                    <td className="px-4 py-3 text-gray-600">{s.rollNo || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.className || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.sectionName || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{s.gender || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.parentPhone || s.parentDetails?.father?.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Confirm Bulk Edit</h3>
            <p className="text-sm text-gray-600 mb-5">
              Update <strong>{BULK_FIELDS.find(f => f.value === bulkField)?.label}</strong> for <strong>{selected.size}</strong> student(s)?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded-md text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleApply} disabled={isSaving} className="flex-1 bg-blue-600 text-white py-1.5 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
                {isSaving ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
