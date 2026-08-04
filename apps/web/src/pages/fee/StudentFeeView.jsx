import React, { useState } from 'react';
import { FiSearch, FiX, FiUsers, FiRefreshCw } from 'react-icons/fi';
import { useGetClassesQuery, useGetSessionsQuery } from '../../redux/api/adminApi';
import {
  useGetClassFeeStatusQuery,
  useGetStudentFeeSummaryQuery,
  useGetFeeStructuresQuery,
  useAssignStudentFeeMutation,
} from '../../redux/api/feeApi';
import toast from 'react-hot-toast';

// ─── Status badge config ──────────────────────────────────────────────────────
const statusConfig = {
  paid:     { cls: 'bg-green-50  text-green-700  border-green-200',  label: 'Paid' },
  partial:  { cls: 'bg-amber-50  text-amber-700  border-amber-200',  label: 'Partial' },
  pending:  { cls: 'bg-red-50    text-red-700    border-red-200',    label: 'Unpaid' },
  unpaid:   { cls: 'bg-red-50    text-red-700    border-red-200',    label: 'Unpaid' },
  overdue:  { cls: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Overdue' },
};
const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { cls: 'bg-gray-50 text-gray-500 border-gray-200', label: status };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1, 2, 3, 4, 5, 6, 7].map(i => (
      <td key={i} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-4/5" /></td>
    ))}
  </tr>
);

// ─── Assign Fee Modal ─────────────────────────────────────────────────────────
const AssignFeeModal = ({ student, sessionId, classId, onClose }) => {
  const { data: structuresData } = useGetFeeStructuresQuery({ sessionId, classId });
  const [assignStudentFee, { isLoading: assigning }] = useAssignStudentFeeMutation();
  const [selectedStructureId, setSelectedStructureId] = useState('');

  const structures = structuresData?.data || [];

  const handleAssign = async () => {
    if (!selectedStructureId) { toast.error('Select a fee structure'); return; }
    try {
      await assignStudentFee({
        studentId: student.studentProfileId,
        feeStructureId: selectedStructureId,
        sessionId,
      }).unwrap();
      toast.success(`Fee structure assigned to ${student.name}`);
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || 'Assignment failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Assign Fee Structure</h3>
            <p className="text-xs text-gray-400 mt-0.5">{student.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          {structures.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No fee structures available for this class and session.
            </p>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Select Fee Structure <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedStructureId}
                onChange={e => setSelectedStructureId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Choose a structure…</option>
                {structures.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name || `Class ${s.classId?.name}`} — ₹{s.totalAmount?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning || !selectedStructureId}
              className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Student Detail Modal ─────────────────────────────────────────────────────
const StudentFeeModal = ({ studentProfileId, student, onClose }) => {
  const { data, isLoading } = useGetStudentFeeSummaryQuery(studentProfileId);
  const info = data?.data;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">{info?.studentName || student?.name || 'Student Fee Details'}</h2>
            {student?.rollNo && <p className="text-xs text-gray-400 mt-0.5">Roll No: {student.rollNo}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {isLoading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
            </div>
          )}
          {!isLoading && !info && (
            <div className="py-10 text-center text-gray-400">
              <FiUsers size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No fee record found for this student.</p>
            </div>
          )}
          {!isLoading && info && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Fee',  val: `₹${(info.totalAssigned || 0).toLocaleString()}`,  cls: 'bg-gray-50' },
                  { label: 'Paid',       val: `₹${(info.totalPaid    || 0).toLocaleString()}`,  cls: 'bg-green-50 text-green-700' },
                  { label: 'Due',        val: `₹${(info.totalDue     || 0).toLocaleString()}`,  cls: 'bg-red-50 text-red-700' },
                  { label: 'Fine',       val: `₹${(info.totalFine    || 0).toLocaleString()}`,  cls: 'bg-amber-50 text-amber-700' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className={`p-3 rounded-xl ${cls} border border-gray-100`}>
                    <p className="text-xs opacity-70">{label}</p>
                    <p className="text-base font-bold mt-1">{val}</p>
                  </div>
                ))}
              </div>

              {/* Status + collection rate */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={info.status} />
                {info.collectionRate && (
                  <span className="text-xs text-gray-500">
                    Collection rate: <b>{info.collectionRate}</b>
                  </span>
                )}
              </div>

              {/* Fee breakdown */}
              {info.feeStructure?.feeComponents?.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Fee Breakdown
                  </p>
                  <div className="divide-y divide-gray-100">
                    {info.feeStructure.feeComponents.map((c, i) => (
                      <div key={i} className="flex justify-between py-2 text-sm">
                        <span className="text-gray-700">{c.name || c.feeHeadId?.name || '—'}</span>
                        <span className="font-medium text-gray-900">₹{c.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Installment schedule */}
              {info.installments?.schedule?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Installment Schedule
                  </p>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
                    {info.installments.schedule.map((inst, i) => {
                      const isOverdue = inst.status !== 'paid' && new Date(inst.dueDate) < new Date();
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                            isOverdue ? 'bg-red-50' : ''
                          }`}
                        >
                          <div>
                            <span className="font-medium text-gray-900">
                              Installment {inst.installmentNo}
                            </span>
                            <span className={`ml-2 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                              Due: {new Date(inst.dueDate).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', year: 'numeric',
                              })}
                              {isOverdue && ' ⚠ Overdue'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-700">₹{inst.amount?.toLocaleString()}</span>
                            <StatusBadge status={inst.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const STATUSES = ['all', 'paid', 'partial', 'pending', 'overdue'];
const PAGE_SIZE = 10;

const StudentFeeView = () => {
  const { data: classesData } = useGetClassesQuery();
  const { data: sessionsData } = useGetSessionsQuery();

  const [filters, setFilters]     = useState({ classId: '', sessionId: '' });
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [viewStudent, setView]    = useState(null);
  const [assignStudent, setAssign] = useState(null);
  const [page, setPage]           = useState(1);

  const { data, isLoading, isFetching, refetch } = useGetClassFeeStatusQuery(
    { classId: filters.classId, sessionId: filters.sessionId },
    { skip: !filters.classId || !filters.sessionId }
  );

  const classes  = classesData?.data  || [];
  const sessions = sessionsData?.data || [];
  const students = data?.data         || [];

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.rollNo?.includes(q) || s.admissionNumber?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || s.feeStatus?.status === statusFilter || (!s.feeStatus && statusFilter === 'pending');
    return matchSearch && matchStatus;
  });

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1); };

  return (
    <div className="max-w-6xl mx-auto space-y-4 px-2 sm:px-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Student Fee Status</h1>
          <p className="text-xs text-slate-500 mt-0.5">View and manage individual student fee records</p>
        </div>
        {filters.classId && filters.sessionId && (
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <FiRefreshCw className="w-3.5 h-3.5" /> <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Filters Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Class</label>
          <select
            value={filters.classId}
            onChange={e => setFilter('classId', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          >
            <option value="">Select class</option>
            {classes.map(c => <option key={c._id} value={c._id}>Class {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Session</label>
          <select
            value={filters.sessionId}
            onChange={e => setFilter('sessionId', e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          >
            <option value="">Select session</option>
            {sessions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none bg-white focus:border-slate-400"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="relative">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Name / Roll / Admin No…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
        <button className="px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition" title="Export (placeholder)">
          ↓ Export
        </button>
      </div>

      {/* Content */}
      {!filters.classId || !filters.sessionId ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
          <FiUsers size={40} className="mx-auto text-gray-200 mb-2" />
          <p className="text-gray-400 text-sm">Select a class and session to view students.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {(isLoading || isFetching) && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['#', 'Student', 'Roll', 'Total Fee', 'Paid', 'Due', 'Status', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          )}
          {!isLoading && !isFetching && filtered.length === 0 && (
            <div className="py-14 text-center">
              <FiUsers size={32} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">No students match the current filters.</p>
            </div>
          )}
          {!isLoading && !isFetching && paginated.length > 0 && (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Roll</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Fee</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Due</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((s, i) => (
                    <tr key={s.studentProfileId} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{s.name}</td>
                      <td className="py-3 px-4 text-gray-500">{s.rollNo || '—'}</td>
                      {s.feeStatus ? (
                        <>
                          <td className="py-3 px-4 text-gray-700">₹{s.feeStatus.totalAssigned?.toLocaleString()}</td>
                          <td className="py-3 px-4 text-green-600 font-medium">₹{s.feeStatus.totalPaid?.toLocaleString()}</td>
                          <td className="py-3 px-4 text-red-600 font-medium">₹{s.feeStatus.totalDue?.toLocaleString()}</td>
                          <td className="py-3 px-4"><StatusBadge status={s.feeStatus.status} /></td>
                        </>
                      ) : (
                        <td colSpan={4} className="py-3 px-4">
                          <span className="text-gray-300 text-xs italic">Fee not assigned</span>
                        </td>
                      )}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {!s.feeStatus && (
                            <button
                              onClick={() => setAssign(s)}
                              className="text-xs font-medium text-blue-600 border border-blue-200 px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                            >
                              Assign
                            </button>
                          )}
                          <button
                            onClick={() => setView(s)}
                            className="text-xs font-medium text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 text-xs rounded ${
                          p === page
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Student fee detail modal */}
      {viewStudent && (
        <StudentFeeModal
          studentProfileId={viewStudent.studentProfileId}
          student={viewStudent}
          onClose={() => setView(null)}
        />
      )}

      {/* Assign fee modal */}
      {assignStudent && (
        <AssignFeeModal
          student={assignStudent}
          sessionId={filters.sessionId}
          classId={filters.classId}
          onClose={() => setAssign(null)}
        />
      )}
    </div>
  );
};

export default StudentFeeView;
