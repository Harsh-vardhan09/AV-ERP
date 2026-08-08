import React, { useState } from 'react';
import { FiSearch, FiX, FiRefreshCcw } from 'react-icons/fi';
import { MdMoneyOff } from 'react-icons/md';
import toast from 'react-hot-toast';
import {
  useGetRefundsByPaymentQuery,
  useCreateRefundMutation,
} from '@modules/fees/api/feeApi';

// POST /refunds  requires: { paymentId, accountFeeId, amount, reason, requestedBy }
// GET  /refunds/payment/:paymentId  — refunds for a payment

const fmt = (n) =>
  typeof n === 'number' ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const StatusBadge = ({ status }) => {
  const cfg = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    approved:  'bg-blue-50 text-blue-700 border-blue-200',
    processed: 'bg-green-50 text-green-700 border-green-200',
    rejected:  'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${cfg[status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
      {status}
    </span>
  );
};

// ─── Refund Form (shown after finding a payment) ──────────────────────────────
const RefundForm = ({ paymentId, payment, onSuccess }) => {
  const [createRefund, { isLoading }] = useCreateRefundMutation();
  const [form, setForm] = useState({
    accountFeeId: payment?.accountFeeId || '',
    amount: '',
    reason: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (!form.accountFeeId) { toast.error('accountFeeId is required (check payment details)'); return; }

    try {
      await createRefund({
        paymentId,
        accountFeeId: form.accountFeeId,
        amount: Number(form.amount),
        reason: form.reason || undefined,
        // requestedBy: current user — backend requires this field
        requestedBy: 'admin',   // fallback; ideally pass from auth context
      }).unwrap();
      toast.success('Refund request submitted');
      onSuccess();
    } catch (err) {
      toast.error(err?.data?.message || 'Refund request failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Amount (₹) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            required
            min="1"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="Refund amount"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Account Fee ID</label>
          <input
            type="text"
            value={form.accountFeeId}
            onChange={(e) => setForm((f) => ({ ...f, accountFeeId: e.target.value }))}
            placeholder="accountFeeId"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 font-mono text-xs"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
        <input
          type="text"
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          placeholder="Optional reason for refund"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 transition"
        >
          <MdMoneyOff size={14} />
          {isLoading ? 'Submitting…' : 'Submit Refund Request'}
        </button>
      </div>
    </form>
  );
};

// ─── Refund history for the searched payment ──────────────────────────────────
const RefundHistory = ({ paymentId }) => {
  // GET /refunds/payment/:paymentId
  const { data, isLoading, refetch } = useGetRefundsByPaymentQuery(paymentId, { skip: !paymentId });
  const refunds = data?.data || [];

  if (isLoading) {
    return <div className="py-4 text-center text-gray-400 text-sm animate-pulse">Loading refunds…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Refund History ({refunds.length})
        </p>
        <button onClick={refetch} className="text-gray-400 hover:text-gray-600 transition">
          <FiRefreshCcw size={12} />
        </button>
      </div>

      {refunds.length === 0 ? (
        <p className="text-sm text-gray-300 text-center py-4">No refunds for this payment.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {refunds.map((r) => (
            <div key={r._id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-sm">
              <div>
                <p className="font-medium text-gray-800">{fmt(r.amount)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.reason || 'No reason given'} · {fmtDate(r.createdAt)}</p>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const FeeRefunds = () => {
  const [inputId, setInputId]     = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [showForm, setShowForm]   = useState(false);

  // Only search when user presses button
  const handleSearch = () => {
    if (!inputId.trim()) { toast.error('Enter a Payment ID'); return; }
    setPaymentId(inputId.trim());
    setShowForm(false);
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Fee Refunds</h2>
        <p className="text-xs text-gray-400 mt-0.5">Search a payment to request or view refunds</p>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Payment ID <span className="text-gray-300">(ObjectId)</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Paste payment ID…"
              className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-400 font-mono"
            />
          </div>
          {inputId && (
            <button onClick={() => { setInputId(''); setPaymentId(''); setShowForm(false); }}
              className="text-gray-400 hover:text-gray-600 transition">
              <FiX size={16} />
            </button>
          )}
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
          >
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      {!paymentId ? (
        <div className="bg-white border border-gray-200 rounded-xl py-14 text-center shadow-sm">
          <MdMoneyOff size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Enter a Payment ID to begin</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Payment ID chip */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-500 font-medium">Payment ID</p>
              <p className="text-sm font-mono text-blue-800 mt-0.5">{paymentId}</p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-50 transition"
            >
              <MdMoneyOff size={13} />
              {showForm ? 'Cancel' : 'Request Refund'}
            </button>
          </div>

          {/* Refund form */}
          {showForm && (
            <div className="bg-white border border-orange-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">New Refund Request</p>
              <RefundForm
                paymentId={paymentId}
                payment={null}
                onSuccess={() => { setShowForm(false); }}
              />
            </div>
          )}

          {/* Refund history */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <RefundHistory paymentId={paymentId} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeRefunds;
