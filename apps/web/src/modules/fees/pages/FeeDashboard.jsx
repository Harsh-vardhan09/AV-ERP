import React, { useState } from 'react';
import { FiRefreshCw, FiTrendingUp, FiUsers, FiCheckCircle, FiAlertCircle, FiPercent } from 'react-icons/fi';
import { MdAccountBalance, MdPayment } from 'react-icons/md';
import toast from 'react-hot-toast';
import {
  useGetFeeDashboardQuery,
  useBackfillStudentFeesMutation,
} from '@modules/fees/api/feeApi';

const fmt = (n) =>
  typeof n === 'number'
    ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : '₹0';

const pct = (n) => {
  if (typeof n === 'string') return n;
  if (typeof n === 'number') return `${n.toFixed(1)}%`;
  return '0%';
};

const StatCard = ({ label, value, sub, color = 'gray', icon: Icon }) => {
  const colors = {
    green:  'bg-green-50  border-green-100  text-green-600',
    red:    'bg-red-50    border-red-100    text-red-600',
    blue:   'bg-blue-50   border-blue-100   text-blue-600',
    gray:   'bg-gray-50   border-gray-100   text-gray-600',
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
  };
  const textColors = {
    green: 'text-green-600', red: 'text-red-600',
    blue: 'text-blue-600', gray: 'text-gray-900', orange: 'text-orange-600',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <span className={`p-1.5 rounded-lg border ${colors[color]}`}>
          <Icon size={14} />
        </span>
      </div>
      <p className={`text-2xl font-bold ${textColors[color] || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

const SkeletonCard = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
    <div className="h-3 bg-gray-100 rounded w-24 mb-4" />
    <div className="h-7 bg-gray-100 rounded w-32 mb-2" />
    <div className="h-3 bg-gray-100 rounded w-20" />
  </div>
);

const FeeDashboard = () => {
  const { data, isLoading, refetch } = useGetFeeDashboardQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [backfill, { isLoading: backfilling }] = useBackfillStudentFeesMutation();
  const [refreshing, setRefreshing] = useState(false);

  // Backend returns: { success, data: { totalAssigned, totalCollected, totalOutstanding,
  //   collectionRate, totalAccounts, pendingAccounts, partialAccounts, fullyPaidAccounts,
  //   monthlyCollectionTrend: [{ month, year, totalCollection, totalTransactions }] } }
  const d = data?.data || {};
  const monthly = d.monthlyCollectionTrend || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success('Dashboard refreshed');
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAssignMissing = async () => {
    try {
      await backfill().unwrap();
      toast.success('Missing fees assigned successfully');
      await refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to assign missing fees');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Financial Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">Real-time fee collection statistics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAssignMissing}
            disabled={backfilling}
            className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
          >
            <MdAccountBalance size={14} />
            {backfilling ? 'Assigning…' : 'Assign Missing Fees'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 px-3.5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-60"
          >
            <FiRefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Row 1 — Financial stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Fee Assigned"  value={fmt(d.totalAssigned)}   sub="Across all accounts"     color="gray"  icon={MdAccountBalance} />
            <StatCard label="Total Collected"      value={fmt(d.totalCollected)}  sub="Payments received"       color="green" icon={FiCheckCircle} />
            <StatCard label="Total Outstanding"    value={fmt(d.totalOutstanding)} sub="Pending from accounts"  color="red"   icon={FiAlertCircle} />
            <StatCard label="Collection Rate"      value={pct(d.collectionRate)}  sub="% of assigned collected"  color="blue"  icon={FiPercent} />
          </>
        )}
      </div>

      {/* Row 2 — Account stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          [1, 2, 3].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Accounts"  value={d.totalAccounts ?? 0}        color="gray"  icon={FiUsers} />
            <StatCard label="Fully Paid"       value={d.fullyPaidAccounts ?? 0}    sub="No outstanding dues"   color="green" icon={FiCheckCircle} />
            <StatCard label="Overdue / Pending" value={(d.pendingAccounts ?? 0) + (d.partialAccounts ?? 0)} sub="Have outstanding balances" color="red" icon={FiAlertCircle} />
          </>
        )}
      </div>

      {/* Monthly Trend */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <FiTrendingUp size={15} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-900">Monthly Collection Trend</h3>
          <span className="text-xs text-gray-400 ml-1">(last 6 months)</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-28" />
                <div className="h-4 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : monthly.length === 0 ? (
          <div className="py-12 text-center">
            <MdPayment size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm">No monthly data available yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {monthly.map((item, idx) => {
              const maxAmount = Math.max(...monthly.map((m) => m.totalCollection || 0), 1);
              const barWidth  = Math.round(((item.totalCollection || 0) / maxAmount) * 100);
              return (
                <div key={idx} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition">
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium text-gray-700">
                      {item.year} / {String(item.month).padStart(2, '0')}
                    </p>
                    <p className="text-xs text-gray-400">{item.totalTransactions ?? 0} transactions</p>
                  </div>
                  <div className="flex-1">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 w-28 text-right">
                    {fmt(item.totalCollection)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeDashboard;
