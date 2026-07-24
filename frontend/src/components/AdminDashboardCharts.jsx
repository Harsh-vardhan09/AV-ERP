/**
 * AdminDashboardCharts.jsx
 * Production-grade chart components for the Admin Dashboard.
 * ALL data is passed in as props from real API responses — zero hardcoded values.
 * Multi-tenancy: data is already school-scoped at the backend (req.schoolId).
 */
import React from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

/* ── Custom Tooltip ─────────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.10)', fontSize: 13,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong>{prefix}{Number(p.value ?? 0).toLocaleString()}{suffix}</strong>
        </p>
      ))}
    </div>
  );
};

/* ── Empty State ─────────────────────────────────────────────────────────────── */
const EmptyChart = ({ label }) => (
  <div style={{
    height: 200, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    color: '#9ca3af', gap: 8,
  }}>
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
    <p style={{ fontSize: 13, fontWeight: 500 }}>No {label} data yet</p>
    <p style={{ fontSize: 11 }}>Data will appear as records are added</p>
  </div>
);

/* ── Shared card wrapper ─────────────────────────────────────────────────────── */
const ChartCard = ({ title, subtitle, children, accentColor, isLoading }) => (
  <div style={{
    background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden',
  }}>
    <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 6, height: 28, borderRadius: 4, background: accentColor, flexShrink: 0 }} />
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111827' }}>{title}</p>
        {subtitle && <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {isLoading && (
        <div style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%',
          border: '2px solid #e5e7eb', borderTopColor: accentColor, animation: 'erp-spin 0.7s linear infinite' }} />
      )}
    </div>
    <div style={{ padding: '16px 8px 12px' }}>{children}</div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════════
   1. ADMISSION TREND  — month-wise (real data from backend aggregation)
   ══════════════════════════════════════════════════════════════════════════════ */
export const AdmissionTrendChart = ({ data = [], isLoading = false }) => {
  const hasData = data.some(d => d.Admissions > 0);

  return (
    <ChartCard
      title="Admission Trend"
      subtitle="Month-wise new student enrolments (last 6 months)"
      accentColor="#6366f1"
      isLoading={isLoading}
    >
      {!isLoading && !hasData ? <EmptyChart label="admission" /> : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="admGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip suffix=" students" />} />
            <Area
              type="monotone" dataKey="Admissions"
              stroke="#6366f1" strokeWidth={2.5}
              fill="url(#admGrad)"
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#6366f1' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   2. ATTENDANCE TREND — last 7 days Present% vs Absent%  (real data)
   ══════════════════════════════════════════════════════════════════════════════ */
export const AttendanceTrendChart = ({ data = [], isLoading = false }) => {
  const hasData = data.some(d => d.hasData);

  return (
    <ChartCard
      title="Attendance Trend"
      subtitle="Daily attendance rate — last 7 days (%)"
      accentColor="#10b981"
      isLoading={isLoading}
    >
      {!isLoading && !hasData ? <EmptyChart label="attendance" /> : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip suffix="%" />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line type="monotone" dataKey="Present" stroke="#10b981" strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
            <Line type="monotone" dataKey="Absent" stroke="#f87171" strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3, fill: '#f87171', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   3. FEES COLLECTION — monthly collected amount  (real data from FeeReceipt)
   ══════════════════════════════════════════════════════════════════════════════ */
export const FeesCollectionChart = ({ data = [], isLoading = false }) => {
  const hasData = data.some(d => d.Collected > 0);

  return (
    <ChartCard
      title="Fees Collection"
      subtitle="Monthly fee receipts collected (₹) — last 6 months"
      accentColor="#f59e0b"
      isLoading={isLoading}
    >
      {!isLoading && !hasData ? <EmptyChart label="fees" /> : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 20, left: -10, bottom: 0 }} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip content={<CustomTooltip prefix="₹" />} />
            <Bar dataKey="Collected" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};
