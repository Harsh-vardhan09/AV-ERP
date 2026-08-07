import React, { useState } from 'react';
import { FiBarChart2, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import {
  useGetDailyCollectionQuery,
  useGetBillingPeriodSummaryQuery,
  useGetDefaultersReportQuery,
  useGetPaidAccountsReportQuery,
  useGetBillingPeriodsQuery,
} from '../api/feeApi';

const fmt = (n) =>
  typeof n === 'number' ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';

const SmallStat = ({ label, value, color = 'gray' }) => {
  const cls = { gray: 'text-gray-900', green: 'text-green-600', red: 'text-red-600', blue: 'text-blue-600', orange: 'text-orange-600' };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-xl font-bold ${cls[color] || 'text-gray-900'}`}>{value}</p>
    </div>
  );
};

const TAB_DAILY    = 'daily';
const TAB_SUMMARY  = 'summary';
const TAB_PENDING  = 'pending';
const TAB_PAID     = 'paid';
const TABS = [
  { id: TAB_DAILY,   label: 'Daily Collection' },
  { id: TAB_SUMMARY, label: 'Session Summary' },
  { id: TAB_PENDING, label: 'Pending Fees' },
  { id: TAB_PAID,    label: 'Paid Students' },
];

// ─── Tab: Daily Collection ────────────────────────────────────────────────────
const DailyTab = () => {
  const [date, setDate] = useState('');
  const [queryDate, setQueryDate] = useState('');      // only set on Load click

  const { data, isLoading, isFetching } = useGetDailyCollectionQuery(
    { date: queryDate },
    { skip: !queryDate }
  );

  // Backend response: { success, payments: [...], summary: { totalCollection, totalFine,
  //   totalTransactions, avgTransaction, byMethod: { cash, online, cheque, bank_transfer } } }
  const s = data?.summary || {};
  const payments = data?.payments || [];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={() => {
            if (!date) { toast.error('Select a date'); return; }
            setQueryDate(date);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          Load
        </button>
      </div>

      {queryDate && (
        <>
          {isLoading || isFetching ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SmallStat label="Total Collection"   value={fmt(s.totalCollection)}   color="green" />
                <SmallStat label="Transactions"       value={s.totalTransactions ?? 0} color="blue" />
                <SmallStat label="Avg Transaction"    value={fmt(s.avgTransaction)}    color="gray" />
                <SmallStat label="Fine Collected"     value={fmt(s.totalFine)}         color="orange" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SmallStat label="Cash"           value={fmt(s.byMethod?.cash)}         color="gray" />
                <SmallStat label="Online"         value={fmt(s.byMethod?.online)}       color="blue" />
                <SmallStat label="Cheque"         value={fmt(s.byMethod?.cheque)}       color="gray" />
                <SmallStat label="Bank Transfer"  value={fmt(s.byMethod?.bank_transfer)} color="gray" />
              </div>

              {payments.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Receipt</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Method</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Amount</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-4 text-xs font-mono text-gray-600">{p.receiptNumber || '—'}</td>
                          <td className="py-2.5 px-4 text-gray-600 capitalize">{p.method || '—'}</td>
                          <td className="py-2.5 px-4 font-medium text-green-600">{fmt(p.amount)}</td>
                          <td className="py-2.5 px-4 text-gray-400 text-xs">{new Date(p.createdAt).toLocaleTimeString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {payments.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">No payments on this date.</div>
              )}
            </>
          )}
        </>
      )}

      {!queryDate && (
        <div className="py-14 text-center text-gray-300 text-sm">
          <FiCalendar size={28} className="mx-auto mb-2 text-gray-200" />
          Select a date and click Load
        </div>
      )}
    </div>
  );
};

// ─── Tab: Session Summary (uses billing-period-summary) ────────────────────────
const SummaryTab = () => {
  const { data: periodsData } = useGetBillingPeriodsQuery();
  const [selected, setSelected] = useState('');
  const [queriedPeriod, setQueriedPeriod] = useState('');

  const { data, isLoading } = useGetBillingPeriodSummaryQuery(queriedPeriod, {
    skip: !queriedPeriod,
  });

  const periods = periodsData?.data || [];
  // Backend: { success, summary: { totalAccounts, totalAssigned, totalCollected, totalOutstanding,
  //   totalFineCollected, totalTransactions, avgFee, collectionRate, accountStatus: {paid,partial,pending} } }
  const s = data?.summary || {};

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Billing Period</label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 min-w-[200px]"
          >
            <option value="">Select a period…</option>
            {periods.map((p) => (
              <option key={p._id} value={p._id}>{p.name || p._id}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            if (!selected) { toast.error('Select a billing period'); return; }
            setQueriedPeriod(selected);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          Load
        </button>
      </div>

      {queriedPeriod && (
        isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-pulse">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
          </div>
        ) : !data ? (
          <div className="py-10 text-center text-gray-400 text-sm">No data for this period.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SmallStat label="Total Accounts"   value={s.totalAccounts ?? 0}         color="gray" />
              <SmallStat label="Total Assigned"   value={fmt(s.totalAssigned)}          color="gray" />
              <SmallStat label="Total Collected"  value={fmt(s.totalCollected)}         color="green" />
              <SmallStat label="Outstanding"      value={fmt(s.totalOutstanding)}       color="red" />
              <SmallStat label="Fine Collected"   value={fmt(s.totalFineCollected)}     color="orange" />
              <SmallStat label="Transactions"     value={s.totalTransactions ?? 0}      color="blue" />
              <SmallStat label="Avg Fee"          value={fmt(s.avgFee)}                 color="gray" />
              <SmallStat label="Collection Rate"  value={s.collectionRate ?? '0%'}      color="blue" />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Account Status Breakdown</p>
              <div className="flex gap-4">
                <div className="flex-1 text-center p-3 rounded-xl bg-green-50 border border-green-100">
                  <p className="text-2xl font-bold text-green-600">{s.accountStatus?.paid ?? 0}</p>
                  <p className="text-xs text-green-600 mt-1">Fully Paid</p>
                </div>
                <div className="flex-1 text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-2xl font-bold text-amber-600">{s.accountStatus?.partial ?? 0}</p>
                  <p className="text-xs text-amber-600 mt-1">Partial</p>
                </div>
                <div className="flex-1 text-center p-3 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-2xl font-bold text-red-600">{s.accountStatus?.pending ?? 0}</p>
                  <p className="text-xs text-red-600 mt-1">Pending</p>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {!queriedPeriod && (
        <div className="py-14 text-center text-gray-300 text-sm">
          <FiBarChart2 size={28} className="mx-auto mb-2 text-gray-200" />
          Select a billing period and click Load
        </div>
      )}
    </div>
  );
};

// ─── Tab: Pending Fees ────────────────────────────────────────────────────────
const PendingTab = () => {
  const { data, isLoading } = useGetDefaultersReportQuery({});
  // Same response as defaulters page
  const rows = data?.data || [];
  return (
    <div>
      {isLoading ? (
        <div className="py-10 text-center text-gray-400 animate-pulse text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-gray-300 text-sm">No pending accounts.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">#</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Account</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Assigned</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Paid</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Due</th>
                <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={r._id || i} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-400 text-xs">{i + 1}</td>
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-600">{String(r.accountHolderId).slice(-8).toUpperCase()}</td>
                  <td className="py-2.5 px-4 text-gray-700">{fmt(r.totalAssigned)}</td>
                  <td className="py-2.5 px-4 text-green-600">{fmt(r.totalPaid)}</td>
                  <td className="py-2.5 px-4 text-red-600 font-semibold">{fmt(r.totalDue)}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Tab: Paid Students ────────────────────────────────────────────────────────
const PaidTab = () => {
  const { data, isLoading } = useGetPaidAccountsReportQuery({});
  // Backend: { success, data: [...], stats: { totalAccounts, totalCollected, totalAssigned, avgFeePaid }, pagination }
  const rows  = data?.data  || [];
  const stats = data?.stats || {};
  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="py-10 text-center text-gray-400 animate-pulse text-sm">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SmallStat label="Fully Paid Accounts" value={stats.totalAccounts ?? 0}   color="green" />
            <SmallStat label="Total Collected"      value={fmt(stats.totalCollected)}  color="green" />
            <SmallStat label="Total Assigned"       value={fmt(stats.totalAssigned)}   color="gray" />
            <SmallStat label="Avg Fee Paid"         value={fmt(stats.avgFeePaid)}      color="blue" />
          </div>

          {rows.length === 0 ? (
            <div className="py-10 text-center text-gray-300 text-sm">No fully paid accounts.</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">#</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Account</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Assigned</th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-400 uppercase">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={r._id || i} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-gray-600">{String(r.accountHolderId).slice(-8).toUpperCase()}</td>
                      <td className="py-2.5 px-4 text-gray-700">{fmt(r.totalAssigned)}</td>
                      <td className="py-2.5 px-4 text-green-600 font-semibold">{fmt(r.totalPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const FeeReports = () => {
  const [tab, setTab] = useState(TAB_DAILY);

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Fee Reports</h2>
        <p className="text-xs text-gray-400 mt-0.5">Analytics and collection summaries</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-5 bg-gray-50 border border-gray-200 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === TAB_DAILY   && <DailyTab />}
      {tab === TAB_SUMMARY && <SummaryTab />}
      {tab === TAB_PENDING && <PendingTab />}
      {tab === TAB_PAID    && <PaidTab />}
    </div>
  );
};

export default FeeReports;
