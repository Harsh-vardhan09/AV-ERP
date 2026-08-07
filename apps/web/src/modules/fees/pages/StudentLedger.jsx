import React, { useState, useEffect } from 'react';
import { FiSearch, FiFileText, FiChevronDown, FiChevronUp, FiDownload } from 'react-icons/fi';
import { saveAs } from 'file-saver';
import {
  useGetStudentFeeSummaryQuery,
  useGetLedgerQuery,
  useGetClassFeeStatusQuery,
  useCollectStudentPaymentMutation,
} from '../api/feeApi';
import { useGetClassesQuery, useGetSessionsQuery } from '../../../redux/api/adminApi';
import { useGetAllStudentsEnhancedQuery } from '../../../redux/api/studentManagementApi';

// NOTE: getLedger requires studentFeeId (the StudentFee _id), NOT the student profile ID.
// Two-step: getStudentFeeSummary → extract studentFeeId → getLedger.

const fmt = (n) =>
  typeof n === 'number' ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const csvSafe = (value) => {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

const getStudentName = (student) =>
  student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name || 'Student';

const getSessionName = (student, sessionMap) =>
  student.sessionName || sessionMap[student.session] || sessionMap[student.sessionId] || '';

const normalizeLedgerDescription = (description, sessionMap) => {
  if (!description) return '—';
  let text = description;
  Object.entries(sessionMap).forEach(([id, name]) => {
    if (text.includes(id)) {
      text = text.split(id).join(name);
    }
  });
  return text;
};

const buildLedgerCsv = (entries, student) => {
  const rows = [
    ['Student Name', getStudentName(student)],
    ['Roll No', student.rollNo || '—'],
    ['Admission No', student.admissionNumber || '—'],
    [''],
    ['Date', 'Type', 'Description', 'Amount', 'Balance'],
  ];

  entries.forEach((entry) => {
    rows.push([
      entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN') : '—',
      entry.type || '—',
      entry.description || '—',
      entry.amount != null ? entry.amount : '—',
      entry.balance != null ? entry.balance : '—',
    ]);
  });

  return '\uFEFF' + rows.map((row) => row.map(csvSafe).join(',')).join('\r\n');
};

const downloadLedger = (entries, student, format) => {
  const csv = buildLedgerCsv(entries, student);
  const safeName = (student.name || 'student').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_');
  const ext = format === 'excel' ? 'xls' : 'csv';
  const mime = format === 'excel'
    ? 'application/vnd.ms-excel;charset=utf-8;'
    : 'text/csv;charset=utf-8;';
  saveAs(new Blob([csv], { type: mime }), `fee-ledger-${safeName}.${ext}`);
};

const buildSummaryCsv = (students) => {
  const rows = [
    ['Student Name', 'Roll No', 'Admission No', 'Assigned', 'Paid', 'Due', 'Status'],
    ...students.map((s) => [
      getStudentName(s),
      s.rollNo || '—',
      s.admissionNumber || '—',
      s.feeStatus?.totalAssigned ?? 0,
      s.feeStatus?.totalPaid ?? 0,
      s.feeStatus?.totalDue ?? 0,
      s.feeStatus?.status || '—',
    ]),
  ];
  return '\uFEFF' + rows.map((row) => row.map(csvSafe).join(',')).join('\r\n');
};

const downloadSummary = (students, format) => {
  const csv = buildSummaryCsv(students);
  const ext = format === 'excel' ? 'xls' : 'csv';
  const mime = format === 'excel'
    ? 'application/vnd.ms-excel;charset=utf-8;'
    : 'text/csv;charset=utf-8;';
  saveAs(new Blob([csv], { type: mime }), `fee-ledger-summary.${ext}`);
};

// ─── Per-student ledger (loaded on expand) ────────────────────────────────────
const StudentFeeTotals = ({ studentProfileId, feeStatus }) => {
  const { data: summaryData, isLoading: summaryLoading } = useGetStudentFeeSummaryQuery(
    studentProfileId,
    { skip: Boolean(feeStatus) }
  );

  const totals = feeStatus || summaryData?.data;
  const loading = !feeStatus && summaryLoading;

  if (loading) {
    return (
      <>
        <span className="text-xs text-gray-400">Loading…</span>
      </>
    );
  }

  if (!totals) {
    return (
      <>
        <span className="text-xs text-gray-400">No fee summary</span>
      </>
    );
  }

  return (
    <>
      <span>Assigned: <b className="text-gray-800">{fmt(totals.totalAssigned)}</b></span>
      <span>Paid: <b className="text-green-600">{fmt(totals.totalPaid)}</b></span>
      <span>Due: <b className="text-red-600">{fmt(totals.totalDue)}</b></span>
    </>
  );
};

const StudentLedgerDetail = ({ studentProfileId, student, sessionMap }) => {
  const { data: summaryData, isLoading: summaryLoading } = useGetStudentFeeSummaryQuery(studentProfileId);

  // The StudentFee record _id is needed for the ledger API
  const studentFeeId = summaryData?.data?.studentFeeId || summaryData?.data?._id;

  const { data: ledgerData, isLoading: ledgerLoading } = useGetLedgerQuery(
    { studentFeeId },
    { skip: !studentFeeId }
  );

  const loading    = summaryLoading || ledgerLoading;
  const entries    = ledgerData?.data   || [];
  const totals     = ledgerData?.totals || {};
  const feeSummary = summaryData?.data  || null;

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse p-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded" />)}
      </div>
    );
  }

  if (!feeSummary) {
    return <div className="py-6 text-center text-gray-400 text-sm">No fee record found.</div>;
  }

  return (
    <div className="space-y-4 pt-1">
      {/* Totals strip */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { l: 'Assigned',  v: fmt(feeSummary.totalAssigned),   c: 'text-gray-900' },
          { l: 'Paid',      v: fmt(feeSummary.totalPaid),       c: 'text-green-600' },
          { l: 'Due',       v: fmt(feeSummary.totalDue),        c: 'text-red-600' },
          { l: 'Debited',   v: fmt(totals.totalDebited),        c: 'text-gray-700' },
          { l: 'Credited',  v: fmt(totals.totalCredited),       c: 'text-gray-700' },
        ].map(({ l, v, c }) => (
          <div key={l} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{l}</p>
            <p className={`text-sm font-bold ${c}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Ledger table */}
      {entries.length === 0 ? (
        <div className="py-6 text-center text-gray-300 text-sm">No ledger entries yet.</div>
      ) : (
        <>
          <div className="flex flex-wrap justify-end gap-2 mb-3">
            <button
              type="button"
              onClick={() => downloadLedger(entries, student, 'csv')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiDownload size={14} /> CSV
            </button>
            <button
              type="button"
              onClick={() => downloadLedger(entries, student, 'excel')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiDownload size={14} /> Excel
            </button>
          </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase">Date</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase">Type</th>
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase">Description</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                <th className="text-right py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry._id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-500 text-xs">{fmtDate(entry.createdAt)}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      entry.type === 'debit'
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                      {entry.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-gray-600 text-xs">{normalizeLedgerDescription(entry.description, sessionMap)}</td>
                  <td className={`py-2.5 px-4 text-right font-medium ${entry.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                    {entry.type === 'debit' ? '+' : '−'}{fmt(entry.amount)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-gray-700 font-semibold">{fmt(entry.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
};

const ManualPaymentModal = ({ student, sessionMap, onClose, onPaid }) => {
  const [collectPayment, { isLoading: paying }] = useCollectStudentPaymentMutation();
  const { data: summaryData, isLoading: summaryLoading } = useGetStudentFeeSummaryQuery(student.studentProfileId);
  const info = summaryData?.data;
  const pendingInstallments = info?.installments?.schedule?.filter(i => i.status !== 'paid') || [];
  const [form, setForm] = useState({
    installmentId: pendingInstallments[0]?._id || '',
    amountPaid: pendingInstallments[0] ? pendingInstallments[0].remainingAmount ?? pendingInstallments[0].amount : '',
    paymentMode: 'Cash',
    transactionId: '',
    note: '',
  });

  useEffect(() => {
    if (pendingInstallments.length && !form.installmentId) {
      const inst = pendingInstallments[0];
      setForm(f => ({
        ...f,
        installmentId: inst._id,
        amountPaid: inst.remainingAmount ?? inst.amount,
      }));
    }
  }, [pendingInstallments, form.installmentId]);

  const getInstallmentById = (id) => pendingInstallments.find(i => i._id === id);

  const selectInst = (id) => {
    const inst = getInstallmentById(id);
    setForm(f => ({ ...f, installmentId: id, amountPaid: inst ? inst.remainingAmount ?? inst.amount : '' }));
  };

  const quickPay = (type) => {
    const inst = getInstallmentById(form.installmentId) || pendingInstallments[0];
    if (!inst) return;
    const remaining = Number((inst.remainingAmount ?? inst.amount) || 0);
    const amount = type === 'half' ? Math.ceil(remaining / 2) : remaining;
    setForm(f => ({ ...f, installmentId: inst._id, amountPaid: amount, paymentMode: 'Cash' }));
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!form.installmentId) return;
    if (!form.amountPaid || Number(form.amountPaid) <= 0) return;
    const payload = {
      studentProfileId: student.studentProfileId,
      installmentId: form.installmentId,
      amountPaid: Number(form.amountPaid),
      paymentMode: form.paymentMode,
      transactionId: form.transactionId || undefined,
      note: form.note || undefined,
    };

    try {
      await collectPayment(payload).unwrap();
      onPaid();
      onClose();
    } catch (err) {
      console.error('Manual payment failed', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Manual Fee Payment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Mark payment for {getStudentName(student)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">Close</button>
        </div>

        <div className="p-5">
          {summaryLoading && (
            <div className="py-10 text-center text-gray-400 animate-pulse">Loading payment details…</div>
          )}
          {!summaryLoading && !info && (
            <div className="py-8 text-center text-gray-500">No fee summary found for this student.</div>
          )}
          {!summaryLoading && info && (
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Installment</label>
                  <select
                    value={form.installmentId}
                    onChange={e => selectInst(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {pendingInstallments.map(inst => (
                      <option key={inst._id} value={inst._id}>
                        {`Inst ${inst.installmentNo} — ₹${(inst.remainingAmount ?? inst.amount)?.toLocaleString()}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.amountPaid}
                    onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => quickPay('half')}
                  className="px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                >
                  Mark Half Paid
                </button>
                <button
                  type="button"
                  onClick={() => quickPay('full')}
                  className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                >
                  Mark Full Paid
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Payment Mode</label>
                  <select
                    value={form.paymentMode}
                    onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online Transfer">Online Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="DD">DD</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={form.transactionId}
                    onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {paying ? 'Saving…' : 'Save Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const StudentLedger = () => {
  const [filters, setFilters] = useState({ classId: '', sessionId: '' });
  const [search, setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);
  const [paymentStudent, setPaymentStudent] = useState(null);

  const { data: classesData }  = useGetClassesQuery();
  const { data: sessionsData } = useGetSessionsQuery();

  const searchQuery = search.trim();
  const useClassMode = Boolean(filters.classId && filters.sessionId);

  const { data: classData, isLoading: classLoading } = useGetClassFeeStatusQuery(
    { classId: filters.classId, sessionId: filters.sessionId },
    { skip: !useClassMode }
  );

  const { data: studentSearchData, isLoading: studentSearchLoading } = useGetAllStudentsEnhancedQuery(
    { search: searchQuery },
    { skip: !searchQuery || useClassMode }
  );

  const classes  = classesData?.data  || [];
  const sessions = sessionsData?.data || [];
  const sessionMap = Object.fromEntries(sessions.map((item) => [item._id, item.name]));
  const all      = (classData?.data || []).filter((s) => !!s.feeStatus);
  const studentSearchResults = studentSearchData?.data?.students || [];

  const filtered = all.filter((s) => {
    const q = search.trim().toLowerCase();
    const admission = (s.admissionNumber || s.admissionNo || '').toString().toLowerCase();
    return !q
      || s.name?.toLowerCase().includes(q)
      || s.rollNo?.toLowerCase().includes(q)
      || admission.includes(q)
      || s.scholarNo?.toLowerCase().includes(q);
  });

  const displayStudents = useClassMode
    ? filtered
    : studentSearchResults.map((s) => ({ ...s, studentProfileId: s.studentProfileId || s._id }));

  const ready = useClassMode || Boolean(searchQuery);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Student Ledger</h2>
          <p className="text-xs text-gray-400 mt-0.5">Full transaction history per student</p>
        </div>
        {ready && displayStudents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadSummary(displayStudents, 'csv')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiDownload size={14} /> Export summary CSV
            </button>
            <button
              type="button"
              onClick={() => downloadSummary(displayStudents, 'excel')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiDownload size={14} /> Export summary Excel
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end shadow-sm">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Class</label>
          <select
            value={filters.classId}
            onChange={(e) => setFilters((f) => ({ ...f, classId: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 min-w-[130px]"
          >
            <option value="">Select class</option>
            {classes.map((c) => <option key={c._id} value={c._id}>Class {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Session</label>
          <select
            value={filters.sessionId}
            onChange={(e) => setFilters((f) => ({ ...f, sessionId: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 min-w-[130px]"
          >
            <option value="">Select session</option>
            {sessions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Search</label>
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Name, roll no, admission no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {!ready && !searchQuery ? (
        <div className="bg-white border border-gray-200 rounded-xl py-14 text-center shadow-sm">
          <FiFileText size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Select a class and session to view ledgers, or enter admission no.</p>
        </div>
      ) : classLoading || studentSearchLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl py-10 text-center text-gray-400 text-sm animate-pulse">
          Loading students…
        </div>
      ) : displayStudents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-14 text-center shadow-sm">
          <FiFileText size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">
            {searchQuery
              ? 'No students found for this admission number'
              : 'No students with fee records found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayStudents.map((s) => {
            const open = expanded === s.studentProfileId;
            return (
              <div key={s.studentProfileId} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="w-full flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-0 hover:bg-gray-50 transition">
                  <button
                    type="button"
                    className="w-full text-left flex items-center gap-6"
                    onClick={() => setExpanded(open ? null : s.studentProfileId)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{getStudentName(s)}</p>
                      <p className="text-xs text-gray-400">
                        Roll: {s.rollNo || '—'}
                        {s.admissionNumber ? ` · Admission: ${s.admissionNumber}` : ''}
                      </p>
                      {(s.className || getSessionName(s, sessionMap)) && (
                        <p className="text-xs text-gray-400">
                          {s.className ? `Class: ${s.className}` : ''}
                          {s.className && getSessionName(s, sessionMap) ? ' · ' : ''}
                          {getSessionName(s, sessionMap) ? `Session: ${getSessionName(s, sessionMap)}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                      <StudentFeeTotals studentProfileId={s.studentProfileId} feeStatus={s.feeStatus} />
                    </div>
                    <span className="text-gray-400 shrink-0">
                      {open ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentStudent(s)}
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    Manual payment
                  </button>
                </div>

                {open && (
                  <div className="border-t border-gray-100 px-4 pb-4">
                    <StudentLedgerDetail studentProfileId={s.studentProfileId} student={s} sessionMap={sessionMap} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {paymentStudent && (
        <ManualPaymentModal
          student={paymentStudent}
          sessionMap={sessionMap}
          onClose={() => setPaymentStudent(null)}
          onPaid={() => setPaymentStudent(null)}
        />
      )}
    </div>
  );
};

export default StudentLedger;
