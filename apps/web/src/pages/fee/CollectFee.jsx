import React, { useState, useRef } from 'react';
import { FiSearch, FiCreditCard, FiPrinter, FiX, FiCheckCircle } from 'react-icons/fi';
import { useGetClassesQuery, useGetSessionsQuery } from '../../redux/api/adminApi';
import {
  useGetClassFeeStatusQuery,
  useCollectStudentPaymentMutation,
  useGetStudentFeeSummaryQuery,
} from '../../redux/api/feeApi';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['Cash', 'Online Transfer', 'Cheque', 'DD', 'UPI'];
const NEEDS_TXN_ID  = ['Online Transfer', 'Cheque', 'DD', 'UPI'];

const statusConfig = {
  paid:    { cls: 'bg-green-50  text-green-700  border-green-200' },
  partial: { cls: 'bg-amber-50  text-amber-700  border-amber-200' },
  pending: { cls: 'bg-red-50    text-red-700    border-red-200' },
  overdue: { cls: 'bg-orange-50 text-orange-700 border-orange-200' },
};
const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { cls: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${cfg.cls}`}>
      {status}
    </span>
  );
};

// ─── Receipt Modal ────────────────────────────────────────────────────────────
const ReceiptModal = ({ receipt, onClose }) => {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Fee Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        h2 { text-align: center; margin-bottom: 4px; }
        p.sub { text-align: center; color: #555; margin: 0 0 16px; font-size: 13px; }
        hr { border: 1px solid #eee; margin: 12px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        td { padding: 6px 4px; }
        td:last-child { text-align: right; font-weight: 600; }
        .total-row td { border-top: 2px solid #333; font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #888; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-emerald-600">
            <FiCheckCircle size={20} />
            <h3 className="font-semibold text-gray-900">Payment Successful</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        {/* Printable receipt */}
        <div ref={printRef} className="p-5">
          <h2 className="text-lg font-bold text-center text-gray-900">Fee Receipt</h2>
          <p className="text-center text-xs text-gray-400 mb-4">
            Receipt #{receipt.receiptNo || receipt.paymentId?.slice(-8).toUpperCase()} · {new Date(receipt.date || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <hr className="border-gray-100 mb-4" />

          <table className="w-full text-sm mb-4">
            <tbody>
              <tr>
                <td className="text-gray-500 py-1">Student Name</td>
                <td className="text-right font-medium text-gray-900">{receipt.studentName || '—'}</td>
              </tr>
              {receipt.rollNo && (
                <tr>
                  <td className="text-gray-500 py-1">Roll No</td>
                  <td className="text-right font-medium text-gray-900">{receipt.rollNo}</td>
                </tr>
              )}
              {receipt.className && (
                <tr>
                  <td className="text-gray-500 py-1">Class</td>
                  <td className="text-right font-medium text-gray-900">{receipt.className}</td>
                </tr>
              )}
              <tr>
                <td className="text-gray-500 py-1">Payment Mode</td>
                <td className="text-right font-medium text-gray-900">{receipt.paymentMode}</td>
              </tr>
              {receipt.transactionId && (
                <tr>
                  <td className="text-gray-500 py-1">Transaction ID</td>
                  <td className="text-right font-medium text-gray-900">{receipt.transactionId}</td>
                </tr>
              )}
              {receipt.remarks && (
                <tr>
                  <td className="text-gray-500 py-1">Remarks</td>
                  <td className="text-right font-medium text-gray-900">{receipt.remarks}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-200">
                <td className="font-bold text-gray-900 pt-3 pb-1">Amount Paid</td>
                <td className="text-right font-bold text-emerald-600 text-lg pt-3 pb-1">
                  ₹{Number(receipt.amount).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-center text-xs text-gray-300 mt-4">Thank you for your payment</p>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm border border-emerald-200 text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
          >
            <FiPrinter size={14} /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Payment Form Modal ────────────────────────────────────────────────────────
const PaymentModal = ({ student, onClose }) => {
  const { data, isLoading } = useGetStudentFeeSummaryQuery(student.studentProfileId);
  const [collectPayment, { isLoading: paying }] = useCollectStudentPaymentMutation();
  const [receipt, setReceipt] = useState(null);

  const [form, setForm] = useState({
    installmentId: '',
    amountPaid:    '',
    paymentMode:   'Cash',
    transactionId: '',
    note:          '',
  });

  const info = data?.data;
  const pendingInstallments = info?.installments?.schedule?.filter(i => i.status !== 'paid') || [];

  const getInstallmentById = (id) => pendingInstallments.find(i => i._id === id);

  const selectInst = (id) => {
    const inst = getInstallmentById(id);
    setForm(f => ({ ...f, installmentId: id, amountPaid: inst ? inst.remainingAmount || inst.amount : '' }));
  };

  const quickPay = (type) => {
    const installId = form.installmentId || pendingInstallments[0]?._id;
    const inst = getInstallmentById(installId) || pendingInstallments[0];
    if (!inst) {
      toast.error('No pending installment is available');
      return;
    }

    const remaining = inst.remainingAmount ?? inst.amount;
    const amount = type === 'half'
      ? Math.ceil(Number(remaining) / 2)
      : Number(remaining);

    setForm(f => ({ ...f, installmentId: inst._id, amountPaid: amount, paymentMode: 'Cash' }));
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!form.installmentId) { toast.error('Select an installment'); return; }
    if (!form.amountPaid || Number(form.amountPaid) <= 0) { toast.error('Enter a valid amount'); return; }
    if (NEEDS_TXN_ID.includes(form.paymentMode) && !form.transactionId.trim()) {
      toast.error(`Transaction ID is required for ${form.paymentMode}`);
      return;
    }
    try {
      const res = await collectPayment({
        studentProfileId: student.studentProfileId,
        installmentId:    form.installmentId,
        amountPaid:       Number(form.amountPaid),
        paymentMode:      form.paymentMode,
        transactionId:    form.transactionId || undefined,
        note:             form.note || undefined,
      }).unwrap();

      const receiptData = {
        paymentId:     res?.data?._id || res?._id,
        receiptNo:     res?.data?.receiptNo || res?.receiptNo,
        date:          res?.data?.createdAt || new Date().toISOString(),
        studentName:   student.name,
        rollNo:        student.rollNo,
        className:     student.className || student.class,
        amount:        form.amountPaid,
        paymentMode:   form.paymentMode,
        transactionId: form.transactionId,
        remarks:       form.note,
      };
      setReceipt(receiptData);
    } catch (err) {
      toast.error(err?.data?.message || 'Payment failed');
    }
  };

  if (receipt) {
    return <ReceiptModal receipt={receipt} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Collect Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {student.name} {student.rollNo ? `· Roll: ${student.rollNo}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        <div className="p-5">
          {isLoading && (
            <div className="py-10 text-center text-gray-400 animate-pulse">Loading student fee data…</div>
          )}
          {!isLoading && !info && (
            <div className="py-8 text-center">
              <p className="text-gray-400 text-sm">No fee record assigned to this student yet.</p>
            </div>
          )}
          {!isLoading && info && (
            <>
              {/* Fee summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total',  val: `₹${(info.totalAssigned || 0).toLocaleString()}`, cls: 'bg-gray-50' },
                  { label: 'Paid',   val: `₹${(info.totalPaid    || 0).toLocaleString()}`, cls: 'bg-green-50 text-green-700' },
                  { label: 'Due',    val: `₹${(info.totalDue     || 0).toLocaleString()}`, cls: 'bg-red-50 text-red-700' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className={`p-2.5 rounded-lg ${cls} border border-gray-100 text-center`}>
                    <p className="text-xs opacity-60">{label}</p>
                    <p className="text-sm font-bold mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {pendingInstallments.length === 0 ? (
                <div className="text-center py-6">
                  <FiCheckCircle size={28} className="mx-auto text-green-400 mb-2" />
                  <p className="text-green-600 font-medium text-sm">All installments are paid</p>
                </div>
              ) : (
                <form onSubmit={handlePayment} className="space-y-3">
                  {/* Installment select */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Installment <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.installmentId}
                      onChange={e => selectInst(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">Choose installment…</option>
                      {pendingInstallments.map(inst => {
                        const isOverdue = new Date(inst.dueDate) < new Date();
                        return (
                          <option key={inst._id} value={inst._id}>
                            Inst {inst.installmentNo} — Due: {new Date(inst.dueDate).toLocaleDateString('en-IN')} — ₹{(inst.remainingAmount || inst.amount)?.toLocaleString()}{isOverdue ? ' ⚠' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Amount + Mode */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Amount (₹) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={form.amountPaid}
                        onChange={e => setForm(f => ({ ...f, amountPaid: e.target.value }))}
                        placeholder="Enter amount"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Payment Mode</label>
                      <select
                        value={form.paymentMode}
                        onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value, transactionId: '' }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => quickPay('half')}
                      className="px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition"
                    >
                      Mark Half Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => quickPay('full')}
                      className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                    >
                      Mark Full Paid
                    </button>
                  </div>

                  {/* Transaction ID (conditional) */}
                  {NEEDS_TXN_ID.includes(form.paymentMode) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Transaction ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.transactionId}
                        onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))}
                        placeholder="UTR / Cheque / DD number"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  )}

                  {/* Remarks */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
                    <input
                      type="text"
                      value={form.note}
                      onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                      placeholder="Optional remark…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={paying}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                    >
                      <FiCreditCard size={14} />
                      {paying ? 'Processing…' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CollectFee = () => {
  const { data: classesData }  = useGetClassesQuery();
  const { data: sessionsData } = useGetSessionsQuery();
  const [filters, setFilters]  = useState({ classId: '', sessionId: '' });
  const [search, setSearch]    = useState('');
  const [payStudent, setPay]   = useState(null);

  const { data, isLoading, refetch } = useGetClassFeeStatusQuery(
    { classId: filters.classId, sessionId: filters.sessionId },
    { skip: !filters.classId || !filters.sessionId }
  );

  const classes  = classesData?.data  || [];
  const sessions = sessionsData?.data || [];
  // Only show students who have a fee assigned AND have dues
  const students = (data?.data || []).filter(s => s.feeStatus && s.feeStatus.status !== 'paid');

  const filtered = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.rollNo?.includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Collect Fee</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Collect fee payments — select a class and session to begin
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end shadow-sm">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Class</label>
          <select
            value={filters.classId}
            onChange={e => setFilters(f => ({ ...f, classId: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 min-w-[130px]"
          >
            <option value="">Select class</option>
            {classes.map(c => <option key={c._id} value={c._id}>Class {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Session</label>
          <select
            value={filters.sessionId}
            onChange={e => setFilters(f => ({ ...f, sessionId: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 min-w-[130px]"
          >
            <option value="">Select session</option>
            {sessions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Search</label>
          <div className="relative">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Name or roll no…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {!filters.classId || !filters.sessionId ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <FiCreditCard size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm font-medium">Select a class and session</p>
          <p className="text-gray-300 text-xs mt-1">Students with pending dues will appear here.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {isLoading && (
            <div className="p-8 text-center text-gray-400 text-sm animate-pulse">
              Loading students…
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="py-14 text-center">
              <FiCheckCircle size={36} className="mx-auto text-emerald-200 mb-3" />
              <p className="text-gray-400 text-sm font-medium">No pending fee payments</p>
              <p className="text-gray-300 text-xs mt-1">All students in this class are up to date.</p>
            </div>
          )}
          {!isLoading && filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Roll</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Due</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s, i) => (
                  <tr key={s.studentProfileId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{s.name}</td>
                    <td className="py-3 px-4 text-gray-500">{s.rollNo || '—'}</td>
                    <td className="py-3 px-4 text-gray-700">₹{s.feeStatus.totalAssigned?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">₹{s.feeStatus.totalPaid?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-red-600 font-semibold">₹{s.feeStatus.totalDue?.toLocaleString()}</td>
                    <td className="py-3 px-4"><StatusBadge status={s.feeStatus.status} /></td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setPay(s)}
                        className="flex items-center gap-1 text-xs font-medium text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition"
                      >
                        <FiCreditCard size={12} /> Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={5} className="py-2 px-4 text-xs text-gray-400">
                    {filtered.length} student{filtered.length !== 1 ? 's' : ''} with pending dues
                  </td>
                  <td className="py-2 px-4 text-xs font-semibold text-red-600">
                    ₹{filtered.reduce((sum, s) => sum + (s.feeStatus?.totalDue || 0), 0).toLocaleString()}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {payStudent && (
        <PaymentModal
          student={payStudent}
          onClose={() => { setPay(null); refetch(); }}
        />
      )}
    </div>
  );
};

export default CollectFee;
