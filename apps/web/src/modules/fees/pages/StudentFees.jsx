import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { FiCreditCard, FiClock, FiList, FiPrinter, FiX, FiCheckCircle, FiAlertCircle, FiClock as FiOverdue } from 'react-icons/fi';
import { MdPayment } from 'react-icons/md';
import {
  useGetStudentFeeSummaryQuery,
  useGetStudentPaymentsQuery,
  useGetInstallmentsQuery,
  useCreateRazorpayOrderMutation,
  useVerifyRazorpayPaymentMutation,
  useFlexiblePayMutation,
  useGetFlexibleHistoryQuery,
  useGetThreeInstallmentsQuery,
  usePayThreeInstallmentMutation,
} from '../api/feeApi';


// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  typeof n === 'number' ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ─── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = {
    paid:     'bg-green-100 text-green-700 border-green-200',
    complete: 'bg-green-100 text-green-700 border-green-200',
    partial:  'bg-yellow-100 text-yellow-700 border-yellow-200',
    pending:  'bg-gray-100 text-gray-600 border-gray-200',
    overdue:  'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${cfg[status] || cfg.pending}`}>
      {status}
    </span>
  );
};

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
const SkeletonRow = ({ cols = 5 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-3 px-4">
        <div className="h-4 bg-gray-100 rounded w-4/5" />
      </td>
    ))}
  </tr>
);

// ─── Receipt Modal ────────────────────────────────────────────────────────────
const ReceiptModal = ({ payment, onClose }) => {
  const printRef = useRef();

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Fee Receipt</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;max-width:480px;margin:auto}
        h2{text-align:center;margin-bottom:4px}
        p.sub{text-align:center;color:#555;font-size:13px;margin:0 0 16px}
        hr{border:1px solid #eee;margin:12px 0}
        table{width:100%;border-collapse:collapse;font-size:14px}
        td{padding:6px 4px}
        td.lbl{color:#777}
        td.val{text-align:right;font-weight:600}
        .total td{border-top:2px solid #333;font-weight:bold;font-size:16px;padding-top:10px}
        .footer{text-align:center;margin-top:24px;font-size:12px;color:#aaa}
      </style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-green-600">
            <FiCheckCircle size={18} />
            <h3 className="font-semibold text-gray-900">Payment Receipt</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
        </div>

        <div ref={printRef} className="p-5">
          <h2 className="text-lg font-bold text-center text-gray-900">School ERP</h2>
          <p className="sub text-center text-xs text-gray-400 mb-4">
            Receipt #{payment.receiptNumber || payment._id?.slice(-8).toUpperCase()} &middot; {fmtDate(payment.createdAt)}
          </p>
          <hr className="border-gray-100 mb-4" />
          <table className="w-full text-sm">
            <tbody>
              {[
                ['Payment Mode', payment.method || payment.paymentMode || '—'],
                payment.gatewayPaymentId && ['Transaction ID', payment.gatewayPaymentId],
                payment.note && ['Note', payment.note],
              ].filter(Boolean).map(([label, value]) => (
                <tr key={label}>
                  <td className="lbl text-gray-500 py-1">{label}</td>
                  <td className="val text-right font-medium text-gray-800">{value}</td>
                </tr>
              ))}
              <tr className="total">
                <td className="text-gray-900 font-bold pt-3">Amount Paid</td>
                <td className="text-right text-green-600 text-lg font-bold pt-3">{fmt(payment.amount)}</td>
              </tr>
            </tbody>
          </table>
          <p className="footer text-center text-xs text-gray-300 mt-6">Thank you for your payment</p>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            <FiPrinter size={14} /> Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── TAB 1: My Fees ───────────────────────────────────────────────────────────

// ── FLEXIBLE sub-view ─────────────────────────────────────────────────────────
const FlexibleFeesView = ({ studentFeeId, info, user, onPaySuccess }) => {
  const [flexPay] = useFlexiblePayMutation();
  const { data: histData, isLoading: histLoading } = useGetFlexibleHistoryQuery(studentFeeId, { skip: !studentFeeId });

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount]       = useState('');
  const [paying, setPaying]       = useState(false);

  const totalFee  = info.totalAssigned || 0;
  const totalPaid = info.totalPaid || 0;
  const remaining = Math.max(0, totalFee - totalPaid);
  const pct       = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : 0;

  // SVG ring
  const r = 38, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const handlePay = async () => {
    const amt = Number(amount);
    if (!amt || amt < 1) { toast.error('Enter a valid amount (min ₹1)'); return; }
    if (amt > remaining) { toast.error(`Cannot exceed remaining ₹${remaining}`); return; }
    setPaying(true);
    try {
      const res = await flexPay({ studentFeeId, amount: amt, paymentMode: 'CASH' }).unwrap();
      toast.success(`Paid! Receipt: ${res.receiptNo}`);
      setShowModal(false);
      setAmount('');
      onPaySuccess();
    } catch (err) {
      toast.error(err?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const transactions = histData?.data?.transactions || [];

  return (
    <div className="space-y-4">
      {/* Hero card with radial progress */}
      <div className="bg-gradient-to-br from-cyan-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-5">
          {/* Radial ring */}
          <svg width={96} height={96} viewBox="0 0 96 96" className="shrink-0">
            <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={8} />
            <circle
              cx={48} cy={48} r={r} fill="none"
              stroke="white" strokeWidth={8}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
            />
            <text x={48} y={48} textAnchor="middle" dominantBaseline="central"
              fill="white" fontSize={15} fontWeight="bold">{pct}%</text>
          </svg>
          <div className="flex-1">
            <p className="text-cyan-100 text-sm">Flexible Fees</p>
            <p className="text-2xl font-bold">{fmt(totalFee)}</p>
            <div className="flex gap-4 mt-2">
              <div>
                <p className="text-cyan-200 text-xs">Paid</p>
                <p className="font-semibold">{fmt(totalPaid)}</p>
              </div>
              <div>
                <p className="text-cyan-200 text-xs">Remaining</p>
                <p className="font-semibold text-yellow-200">{fmt(remaining)}</p>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
            remaining <= 0
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-yellow-100 text-yellow-700 border-yellow-200'
          }`}>
            {remaining <= 0 ? 'Complete' : 'In Progress'}
          </div>
        </div>
      </div>

      {/* Pay button or Done */}
      {remaining > 0 ? (
        <button
          onClick={() => { setAmount(String(remaining)); setShowModal(true); }}
          className="w-full flex items-center justify-center gap-2 py-3 bg-cyan-600 text-white font-semibold rounded-xl hover:bg-cyan-700 transition shadow-sm"
        >
          <MdPayment size={18} /> Pay Now — {fmt(remaining)} Remaining
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <FiCheckCircle size={16} className="text-green-600 shrink-0" />
          <p className="text-green-700 text-sm font-medium">All fees cleared. Nothing outstanding.</p>
        </div>
      )}

      {/* Recent payments */}
      {!histLoading && transactions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 border-b border-gray-100">
            Recent Payments
          </p>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {transactions.slice(0, 5).map(t => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-600 font-mono text-xs">{t.receiptNo || '—'}</td>
                  <td className="py-2.5 px-4 text-gray-400 text-xs">{fmtDate(t.createdAt)}</td>
                  <td className="py-2.5 px-4 font-semibold text-green-600">{fmt(t.amountPaid)}</td>
                  <td className="py-2.5 px-4 text-gray-500 text-xs capitalize">{t.paymentMode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pay Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Flexible Payment</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-cyan-50 rounded-xl p-3 text-sm text-cyan-700">
                <p>Remaining: <span className="font-bold">{fmt(remaining)}</span></p>
                <p className="text-xs mt-0.5 text-cyan-500">Pay any amount between ₹1 and {fmt(remaining)}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
                <input
                  type="number" min="1" max={remaining}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Cancel</button>
                <button onClick={handlePay} disabled={paying}
                  className="flex-1 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 font-medium">
                  {paying ? 'Processing…' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── THREE_INSTALLMENT sub-view ─────────────────────────────────────────────────
const ThreeInstallmentView = ({ studentFeeId, onPaySuccess }) => {
  const { data, isLoading, refetch } = useGetThreeInstallmentsQuery(studentFeeId, { skip: !studentFeeId });
  const [payInst] = usePayThreeInstallmentMutation();
  const [paying, setPaying] = useState(null); // installmentId being paid

  const installments = data || [];

  const handlePay = async (inst) => {
    setPaying(inst._id);
    try {
      const res = await payInst({ installmentId: inst._id, studentFeeId, paymentMode: 'CASH' }).unwrap();
      toast.success(`Installment ${inst.installmentNo} paid! Receipt: ${res.receiptNo}`);
      refetch();
      onPaySuccess();
    } catch (err) {
      toast.error(err?.data?.message || 'Payment failed');
    } finally {
      setPaying(null);
    }
  };

  const statusCfg = {
    PAID:    { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700 border-green-200', label: '✓ Paid' },
    UNPAID:  { bg: 'bg-white',    text: 'text-gray-700',  border: 'border-gray-200',  badge: 'bg-gray-100 text-gray-600 border-gray-200',   label: 'Pending' },
    OVERDUE: { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-200',   badge: 'bg-red-100 text-red-700 border-red-200',       label: '⚠ Overdue' },
  };

  if (isLoading) return <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}</div>;

  return (
    <div className="space-y-3">
      {installments.map((inst, idx) => {
        const cfg   = statusCfg[inst.status] || statusCfg.UNPAID;
        // Locked if a previous installment is not yet paid
        const prev  = installments[idx - 1];
        const locked = inst.status !== 'PAID' && prev && prev.status !== 'PAID';

        return (
          <div key={inst._id || idx}
            className={`border ${cfg.border} ${cfg.bg} rounded-xl p-4 flex items-center gap-4 transition-all ${locked ? 'opacity-50' : ''}`}
          >
            {/* Installment number bubble */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
              inst.status === 'PAID' ? 'bg-green-500 text-white' :
              inst.status === 'OVERDUE' ? 'bg-red-500 text-white' :
              'bg-gray-200 text-gray-600'
            }`}>
              {inst.installmentNo}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900">Installment {inst.installmentNo}</span>
                <span className={`px-2 py-0.5 rounded border text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                {locked && <span className="text-xs text-gray-400">🔒 Pay Inst. {inst.installmentNo - 1} first</span>}
              </div>
              <p className="text-sm text-gray-600 mt-0.5">{fmt(inst.amount)} · Due {fmtDate(inst.dueDate)}</p>
              {inst.status === 'PAID' && inst.paidOn && (
                <p className="text-xs text-green-600 mt-0.5">Paid on {fmtDate(inst.paidOn)} · {inst.receiptNo}</p>
              )}
            </div>

            {/* Pay button */}
            {inst.status !== 'PAID' && !locked && (
              <button
                onClick={() => handlePay(inst)}
                disabled={!!paying}
                className="shrink-0 px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-medium transition"
              >
                {paying === inst._id ? 'Paying…' : `Pay ${fmt(inst.amount)}`}
              </button>
            )}
          </div>
        );
      })}

      {installments.length === 0 && (
        <div className="py-12 text-center text-gray-400 text-sm">No installments found.</div>
      )}
    </div>
  );
};

// ── MyFeesTab (main entry) ────────────────────────────────────────────────────
const MyFeesTab = ({ studentProfileId, user, onPaySuccess }) => {
  const { data, isLoading } = useGetStudentFeeSummaryQuery(studentProfileId);
  const [createOrder] = useCreateRazorpayOrderMutation();
  const [verifyPayment] = useVerifyRazorpayPaymentMutation();

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [paying, setPaying] = useState(false);

  const info = data?.data;
  const totalDue = info?.totalDue || 0;

  // FIX: Backend summary service returns `_id` (StudentFee._id), NOT `studentFeeId`.
  // The `info?.studentFeeId` branch will always be undefined; `info?._id` is the correct fallback.
  // Both are kept for safety in case the backend field name is ever renamed.
  const studentFeeId = info?.studentFeeId || info?._id;

  // FIX: feeCycle — present in full response (with installments); may be missing in
  // the no-installments early-return path (FLEXIBLE/THREE_INSTALLMENT students).
  // Fallback to feeStructure.feeCycle which is always populated in the full path.
  const feeCycle = info?.feeStructure?.feeCycle ?? info?.feeCycle;

  // DEBUG: Log full summary so you can verify field names in browser console
  console.log('[StudentFees] data.data (info):', info);
  console.log('[StudentFees] resolved studentFeeId:', studentFeeId, '| feeCycle:', feeCycle, '| totalDue:', totalDue);

  const openModal = () => {
    setAmount(String(totalDue));
    setShowModal(true);
  };

  const handlePay = async () => {
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (Number(amount) > totalDue) { toast.error(`Amount cannot exceed ₹${totalDue}`); return; }

    // FIX: Guard against missing studentFeeId — if undefined, createOrder will fail
    // with a 400 from our backend (not Razorpay). Catch it early with a clear toast.
    if (!studentFeeId) {
      toast.error('Fee record ID is missing. Please refresh the page and try again.');
      console.error('[StudentFees] studentFeeId is undefined — cannot create order. info:', info);
      return;
    }

    const loaded = await loadRazorpay();
    if (!loaded) { toast.error('Failed to load payment gateway. Check your connection.'); return; }

    setPaying(true);
    try {
      // DEBUG: Log what we're sending to createOrder
      console.log('[StudentFees] → createOrder payload:', { studentFeeId: String(studentFeeId), amount: Number(amount) });

      const orderRes = await createOrder({ studentFeeId: String(studentFeeId), amount: Number(amount) }).unwrap();

      // DEBUG: Log what Razorpay order creation returned
      console.log('[StudentFees] ← orderRes:', orderRes);

      // Verify all required fields are present from backend
      if (!orderRes.key || !orderRes.orderId || !orderRes.amountInPaise) {
        toast.error('Order creation returned incomplete data. Check backend logs.');
        console.error('[StudentFees] Incomplete orderRes — expected key, orderId, amountInPaise:', orderRes);
        setPaying(false);
        return;
      }

      const options = {
        key:       orderRes.key,           // RAZORPAY_KEY_ID from backend — must match order
        amount:    orderRes.amountInPaise, // already in paise — passed as-is
        currency:  orderRes.currency,      // "INR"
        order_id:  orderRes.orderId,       // Razorpay order.id (prefixed: order_XXXX)
        name: 'School ERP',
        description: 'Fee Payment',
        handler: async (response) => {
          try {
            console.log('[StudentFees] Razorpay handler response:', response);
            const verifyRes = await verifyPayment({
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              studentFeeId:       String(studentFeeId),
              amount:             Number(amount),
            }).unwrap();
            toast.success(`Payment successful! Receipt: ${verifyRes.payment?.receiptNumber || 'generated'}`);
            setShowModal(false);
            onPaySuccess();
          } catch (err) {
            toast.error(err?.data?.message || 'Payment verification failed');
          } finally {
            setPaying(false);
          }
        },
        prefill: {
          name:  `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          email: user?.email || '',
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to create payment order');
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
        <FiAlertCircle size={36} className="mx-auto text-gray-200 mb-3" />
        <p className="text-gray-500 font-medium">No fee structure assigned yet</p>
        <p className="text-gray-400 text-sm mt-1">Contact your admin to assign a fee structure.</p>
      </div>
    );
  }

  // ── Branch on feeCycle ──────────────────────────────────────────────────────
  if (feeCycle === 'FLEXIBLE') {
    return <FlexibleFeesView studentFeeId={studentFeeId} info={info} user={user} onPaySuccess={onPaySuccess} />;
  }

  if (feeCycle === 'THREE_INSTALLMENT') {
    return (
      <div className="space-y-4">
        {/* Summary card */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-violet-100 text-sm">3-Installment Plan</p>
              <p className="text-2xl font-bold mt-0.5">{fmt(info.totalAssigned)}</p>
              <p className="text-violet-200 text-xs mt-0.5">Total Fee</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
              info.status === 'paid'
                ? 'bg-green-100 text-green-700 border-green-200'
                : info.status === 'partial'
                ? 'bg-yellow-100 text-yellow-700 border-yellow-100'
                : 'bg-red-100 text-red-700 border-red-200'
            }`}>
              {info.status}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-violet-200 text-xs mb-0.5">Paid</p>
              <p className="text-white font-bold text-lg">{fmt(info.totalPaid)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-violet-200 text-xs mb-0.5">Outstanding</p>
              <p className="text-white font-bold text-lg">{fmt(info.totalDue)}</p>
            </div>
          </div>
        </div>
        <ThreeInstallmentView studentFeeId={studentFeeId} onPaySuccess={onPaySuccess} />
      </div>
    );
  }

  // ── Default: existing Razorpay flow (CUSTOM/MONTHLY/etc.) ──────────────────
  return (
    <div className="space-y-4">
      {/* Summary Hero Card */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm">Fee Account</p>
            <p className="text-2xl font-bold mt-0.5">{fmt(info.totalAssigned)}</p>
            <p className="text-blue-200 text-xs mt-0.5">Total Assigned</p>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
            info.status === 'paid'
              ? 'bg-green-100 text-green-700 border-green-200'
              : info.status === 'partial'
              ? 'bg-yellow-100 text-yellow-700 border-yellow-100'
              : 'bg-red-100 text-red-700 border-red-200'
          }`}>
            {info.status}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-blue-200 text-xs mb-0.5">Paid</p>
            <p className="text-white font-bold text-lg">{fmt(info.totalPaid)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-blue-200 text-xs mb-0.5">Outstanding</p>
            <p className="text-white font-bold text-lg">{fmt(info.totalDue)}</p>
          </div>
        </div>
      </div>

      {/* Pay Now button */}
      {totalDue > 0 && (
        <button
          onClick={openModal}
          className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition shadow-sm"
        >
          <MdPayment size={18} /> Pay Now — {fmt(totalDue)} Due
        </button>
      )}

      {totalDue <= 0 && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <FiCheckCircle size={16} className="text-green-600 shrink-0" />
          <p className="text-green-700 text-sm font-medium">All fees are cleared. No outstanding dues.</p>
        </div>
      )}

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Pay Fee via Razorpay</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                <p>Outstanding: <span className="font-bold text-red-600">{fmt(totalDue)}</span></p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Amount to Pay (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={amount}
                  min="1"
                  max={totalDue}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1">Max: {fmt(totalDue)}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
                >
                  {paying ? 'Opening Razorpay…' : 'Proceed to Pay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentHistoryTab = ({ studentProfileId }) => {
  const { data, isLoading } = useGetStudentPaymentsQuery(studentProfileId);
  const [receipt, setReceipt] = useState(null);

  const payments = data?.data || [];

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Receipt No.', 'Date', 'Amount', 'Mode', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3].map(i => <SkeletonRow key={i} cols={6} />)}
            </tbody>
          </table>
        )}

        {!isLoading && payments.length === 0 && (
          <div className="py-16 text-center">
            <FiClock size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No payments found</p>
            <p className="text-gray-300 text-xs mt-1">Your payment history will appear here.</p>
          </div>
        )}

        {!isLoading && payments.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Receipt No.', 'Date', 'Amount', 'Mode', 'Status', ''].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-xs text-gray-600">
                    {p.receiptNumber || p._id?.slice(-8).toUpperCase()}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{fmtDate(p.createdAt)}</td>
                  <td className="py-3 px-4 font-semibold text-green-600">{fmt(p.amount)}</td>
                  <td className="py-3 px-4 text-gray-600 capitalize">{p.method || p.paymentMode || '—'}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={p.status || 'complete'} />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => setReceipt(p)}
                      className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition"
                    >
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {receipt && <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
};

// ─── TAB 3: Installments ─────────────────────────────────────────────────────
const InstallmentsTab = ({ studentProfileId }) => {
  // Get fee summary first to extract studentFeeId
  const { data: summaryData, isLoading: summaryLoading } = useGetStudentFeeSummaryQuery(studentProfileId);
  const studentFeeId = summaryData?.data?.studentFeeId || summaryData?.data?._id;

  const { data, isLoading } = useGetInstallmentsQuery(studentFeeId, { skip: !studentFeeId });

  const loading = summaryLoading || isLoading;

  // Backend returns { data: [...installments] }
  const installments = data?.data || [];

  const today = new Date();
  const isOverdue = (inst) =>
    inst.status !== 'paid' && inst.status !== 'complete' && new Date(inst.dueDate) < today;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {loading && (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['#', 'Due Date', 'Amount', 'Fine', 'Paid', 'Remaining', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[1, 2, 3].map(i => <SkeletonRow key={i} cols={7} />)}
          </tbody>
        </table>
      )}

      {!loading && installments.length === 0 && (
        <div className="py-16 text-center">
          <FiList size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No installments found</p>
          {!summaryData?.data && (
            <p className="text-gray-300 text-xs mt-1">No fee structure assigned yet.</p>
          )}
        </div>
      )}

      {!loading && installments.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['#', 'Due Date', 'Amount', 'Fine', 'Paid', 'Remaining', 'Status'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {installments.map((inst, idx) => {
              const overdue = isOverdue(inst);
              const status = overdue ? 'overdue' : inst.status;
              return (
                <tr key={inst._id || idx} className={`transition-colors ${overdue ? 'bg-red-50/60' : 'hover:bg-gray-50'}`}>
                  <td className="py-3 px-4 text-gray-400 text-xs font-medium">{inst.installmentNo || idx + 1}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {fmtDate(inst.dueDate)}
                    {overdue && <span className="ml-1 text-red-500 font-medium">⚠</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{fmt(inst.amount)}</td>
                  <td className="py-3 px-4 text-orange-600">{inst.fine > 0 ? fmt(inst.fine) : <span className="text-gray-300">—</span>}</td>
                  <td className="py-3 px-4 text-green-600 font-medium">{fmt(inst.paidAmount || inst.amountPaid)}</td>
                  <td className="py-3 px-4 text-red-600 font-semibold">{fmt(inst.remainingAmount)}</td>
                  <td className="py-3 px-4"><StatusBadge status={status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'fees',         label: 'My Fees',         icon: FiCreditCard },
  { id: 'history',      label: 'Payment History',  icon: FiClock },
  { id: 'installments', label: 'Installments',     icon: FiList },
];

const StudentFees = () => {
  const user = useSelector((s) => s.user?.user?.user);
  const studentProfileId = user?._id;

  const [activeTab, setActiveTab] = useState('fees');

  const handlePaySuccess = () => {
    setActiveTab('history');
  };

  if (!studentProfileId) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl py-16 text-center shadow-sm">
        <FiAlertCircle size={32} className="mx-auto text-gray-300 mb-3" />
        <p className="text-gray-400 text-sm">Unable to load student data. Please refresh.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-base font-semibold text-gray-900">My Fees</h1>
        <p className="text-xs text-gray-400 mt-0.5">View your fee status, pay online, and download receipts</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5 bg-gray-50 border border-gray-200 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'fees' && (
        <MyFeesTab
          studentProfileId={studentProfileId}
          user={user}
          onPaySuccess={handlePaySuccess}
        />
      )}
      {activeTab === 'history' && (
        <PaymentHistoryTab studentProfileId={studentProfileId} />
      )}
      {activeTab === 'installments' && (
        <InstallmentsTab studentProfileId={studentProfileId} />
      )}
    </div>
  );
};

export default StudentFees;
