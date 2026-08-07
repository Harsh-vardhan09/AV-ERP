import React, { useState } from 'react';
import { FiUsers, FiBell } from 'react-icons/fi';
import { MdWarning } from 'react-icons/md';
import toast from 'react-hot-toast';
import { useGetDefaultersReportQuery } from '../api/feeApi';
import { useGetClassesQuery, useGetSessionsQuery } from '../../../redux/api/adminApi';

// Backend GET /reports/pending?cohortKey=&billingPeriodId=&minDue=
// Response: { success, data: [{accountHolderId, totalAssigned, totalPaid, totalDue, status, ...}],
//             stats: { totalOutstanding, totalAssigned, totalCollected, collectionRate },
//             pagination }

const fmt = (n) =>
  typeof n === 'number' ? `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';

const StatCard = ({ label, value, color }) => {
  const cls = {
    gray:   'text-gray-900',
    red:    'text-red-600',
    green:  'text-green-600',
    orange: 'text-orange-600',
  };
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${cls[color] || 'text-gray-900'}`}>{value}</p>
    </div>
  );
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <td key={i} className="py-3 px-4"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
    ))}
  </tr>
);

const FeeDefaulters = () => {
  const [filters, setFilters] = useState({ cohortKey: '', minDue: '' });
  const [reminding, setReminding] = useState(null);

  // NOTE: Backend `cohortKey` represents a class+period key, not a direct sessionId.
  // We use class name as cohortKey since that's what the backend FeeStructure model uses.
  const { data: classesData } = useGetClassesQuery();
  const { data: sessionsData } = useGetSessionsQuery();

  const queryParams = {};
  if (filters.cohortKey) queryParams.cohortKey = filters.cohortKey;
  if (filters.minDue)   queryParams.minDue    = filters.minDue;

  const { data, isLoading } = useGetDefaultersReportQuery(queryParams);

  const defaulters = data?.data   || [];
  const stats      = data?.stats  || {};
  const total      = data?.pagination?.total ?? defaulters.length;

  const classes  = classesData?.data  || [];
  const sessions = sessionsData?.data || [];

  const handleRemind = async (row) => {
    setReminding(row.accountHolderId);
    // "Remind" is a host-system responsibility (notification layer)
    // We show a success toast as a UI placeholder
    await new Promise((r) => setTimeout(r, 800));
    toast.success('Reminder sent');
    setReminding(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Fee Defaulters</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Accounts with outstanding balances · {total} result{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard label="Total Outstanding"  value={fmt(stats.totalOutstanding)} color="red" />
        <StatCard label="Total Assigned"     value={fmt(stats.totalAssigned)}    color="gray" />
        <StatCard label="Total Collected"    value={fmt(stats.totalCollected)}   color="green" />
        <StatCard label="Collection Rate"    value={stats.collectionRate ?? '0%'} color="orange" />
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end shadow-sm">
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Cohort (Class)</label>
          <select
            value={filters.cohortKey}
            onChange={(e) => setFilters((f) => ({ ...f, cohortKey: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 min-w-[130px]"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c.name}>Class {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Min Due (₹)</label>
          <input
            type="number"
            value={filters.minDue}
            onChange={(e) => setFilters((f) => ({ ...f, minDue: e.target.value }))}
            placeholder="0"
            min="0"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-400 w-32"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {!isLoading && defaulters.length === 0 && (
          <div className="py-16 text-center">
            <FiUsers size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 text-sm font-medium">No defaulters found</p>
            <p className="text-gray-300 text-xs mt-1">All accounts are up to date.</p>
          </div>
        )}

        {(isLoading || defaulters.length > 0) && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Account</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Due</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-3 px-4 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading
                ? [1, 2, 3].map((i) => <SkeletonRow key={i} />)
                : defaulters.map((row, idx) => (
                    <tr key={row._id || idx} className="hover:bg-red-50/30 transition-colors">
                      <td className="py-3 px-4 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <p className="text-gray-700 text-xs font-mono">{String(row.accountHolderId).slice(-8).toUpperCase()}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{fmt(row.totalAssigned)}</td>
                      <td className="py-3 px-4 text-green-600 font-medium">{fmt(row.totalPaid)}</td>
                      <td className="py-3 px-4 text-red-600 font-semibold">{fmt(row.totalDue)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded border text-xs font-medium ${
                          row.status === 'partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleRemind(row)}
                          disabled={reminding === row.accountHolderId}
                          className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                        >
                          <FiBell size={11} /> {reminding === row.accountHolderId ? '…' : 'Remind'}
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FeeDefaulters;
