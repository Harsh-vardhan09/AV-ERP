/**
 * AdminDashboardSections.jsx
 * Professional, premium UI sections for Admin Dashboard.
 * Real data only — no hardcoded values. Clean icons from react-icons.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdPersonAdd, MdSchool, MdAccountBalanceWallet, MdCampaign,
  MdCheckCircle, MdCancel, MdAccessTime, MdEventBusy, MdPendingActions,
  MdPayment, MdWarningAmber, MdClass,
  MdPersonAddAlt1, MdTrendingUp,
} from 'react-icons/md';
import { FiUser, FiUsers, FiDollarSign, FiBell } from 'react-icons/fi';

/* ── helpers ─────────────────────────────────────────────── */
const fmtINR = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const ago = ts => {
  const s = (Date.now() - new Date(ts)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* ── Shared primitives ──────────────────────────────────── */
const SectionCard = ({ children, style = {} }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden', ...style,
  }}>{children}</div>
);

const SectionHeader = ({ icon: Icon, title, badge }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '13px 16px', borderBottom: '1px solid #f1f5f9',
  }}>
    <Icon size={16} color="#4f46e5" />
    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', flex: 1 }}>{title}</span>
    {badge != null && (
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 8px',
        borderRadius: 20, background: badge > 0 ? '#fef3c7' : '#f1f5f9',
        color: badge > 0 ? '#92400e' : '#64748b',
      }}>{badge}</span>
    )}
  </div>
);

const Empty = ({ label }) => (
  <p style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 16px' }}>
    No {label} data yet
  </p>
);

/* ══════════════════════════════════════════════════════════
   QUICK ACTIONS
   ══════════════════════════════════════════════════════════ */
export const QuickActions = () => {
  const nav = useNavigate();
  const actions = [
    { label: 'Add Student',  Icon: MdPersonAdd,             path: '/admission/register-student' },
    { label: 'Add Teacher',  Icon: MdPersonAddAlt1,         path: '/admission/register-teacher' },
    { label: 'Collect Fees', Icon: MdAccountBalanceWallet,  path: '/admin/fee/students' },
    { label: 'Send Notice',  Icon: MdCampaign,              path: '/addnotice' },
  ];
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        Quick Actions
      </p>
      <div className="dash-quick-actions">
        {actions.map(({ label, Icon, path }) => (
          <button key={label} onClick={() => nav(path)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 8,
            border: '1.5px solid #e2e8f0', background: '#fff',
            fontSize: 13, fontWeight: 600, color: '#1e293b',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.background = '#f5f3ff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#1e293b'; e.currentTarget.style.background = '#fff'; }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STAFF SNAPSHOT — biometric data from FacultyAttendance
   ══════════════════════════════════════════════════════════ */
const STAFF_ROWS = [
  { key: 'presentToday',  label: 'Present Today',  Icon: MdCheckCircle,   color: '#16a34a' },
  { key: 'absentToday',   label: 'Absent Today',   Icon: MdCancel,        color: '#dc2626' },
  { key: 'lateToday',     label: 'Late Today',     Icon: MdAccessTime,    color: '#d97706' },
  { key: 'onLeaveToday',  label: 'On Leave Today', Icon: MdEventBusy,     color: '#7c3aed' },
  { key: 'pendingLeaves', label: 'Pending Leaves', Icon: MdPendingActions, color: '#0369a1' },
];

export const StaffSnapshot = ({ data = {}, isLoading }) => (
  <SectionCard>
    <SectionHeader icon={FiUsers} title="Staff Snapshot — Today" badge={data.totalRecorded ?? 0} />
    <div style={{ padding: '8px 0' }}>
      {isLoading ? <p style={{ color: '#94a3b8', fontSize: 13, padding: '12px 16px' }}>Loading…</p>
        : data.totalRecorded === 0 ? <Empty label="biometric" />
        : STAFF_ROWS.map(({ key, label, Icon, color }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '9px 16px', borderBottom: '1px solid #f8fafc',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={15} color={color} />
              <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color }}>{data[key] ?? 0}</span>
          </div>
        ))
      }
    </div>
  </SectionCard>
);

/* ══════════════════════════════════════════════════════════
   FEES SNAPSHOT
   ══════════════════════════════════════════════════════════ */
export const FeesSnapshot = ({ data = {}, isLoading }) => {
  const { recentPayments = [], defaultersCount = 0, classWisePending = [] } = data;
  const nav = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Recent Payments */}
      <SectionCard>
        <SectionHeader icon={MdPayment} title="Recent Payments" />
        <div>
          {isLoading ? <p style={{ color: '#94a3b8', fontSize: 13, padding: '12px 16px' }}>Loading…</p>
            : recentPayments.length === 0 ? <Empty label="payment" />
            : recentPayments.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: i < recentPayments.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b' }}>
                    {p.studentId?.firstName} {p.studentId?.lastName}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                    {p.studentId?.classId?.name || '—'} · {p.paymentMode} · {ago(p.createdAt)}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>{fmtINR(p.amount)}</span>
              </div>
            ))
          }
        </div>
      </SectionCard>

      {/* Defaulters + Class-wise */}
      <div className="dash-fees-sub-grid">
        {/* Defaulters */}
        <SectionCard>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <MdWarningAmber size={22} color="#dc2626" style={{ marginBottom: 6 }} />
            <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>{defaultersCount}</p>
            <p style={{ margin: '6px 0 10px', fontSize: 12, color: '#64748b' }}>fee defaulters</p>
            <button onClick={() => nav('/admin/fee/students')} style={{
              padding: '5px 14px', borderRadius: 6, border: '1px solid #fecaca',
              background: '#fff5f5', color: '#dc2626', fontSize: 12,
              fontWeight: 600, cursor: 'pointer',
            }}>View All</button>
          </div>
        </SectionCard>

        {/* Class-wise pending */}
        <SectionCard>
          <SectionHeader icon={MdClass} title="Class-wise Pending" />
          <div>
            {isLoading ? <p style={{ color: '#94a3b8', fontSize: 12, padding: '8px 14px' }}>Loading…</p>
              : classWisePending.length === 0 ? <Empty label="pending fees" />
              : classWisePending.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '7px 14px',
                  borderBottom: i < classWisePending.length - 1 ? '1px solid #f8fafc' : 'none',
                }}>
                  <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{c.className}</span>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#d97706' }}>{fmtINR(c.totalDue)}</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>{c.count} students</p>
                  </div>
                </div>
              ))
            }
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   RECENT ACTIVITY TIMELINE
   ══════════════════════════════════════════════════════════ */
const ACTIVITY_ICONS = {
  student_added:  { Icon: FiUser,       color: '#4f46e5' },
  teacher_added:  { Icon: FiUsers,      color: '#0369a1' },
  fee_paid:       { Icon: FiDollarSign, color: '#16a34a' },
  marks_updated:  { Icon: MdTrendingUp, color: '#d97706' },
};

export const RecentActivity = ({ data = [], isLoading }) => (
  <SectionCard style={{ height: '100%' }}>
    <SectionHeader icon={FiBell} title="Recent Activity" />
    <div>
      {isLoading ? <p style={{ color: '#94a3b8', fontSize: 13, padding: '16px' }}>Loading…</p>
        : data.length === 0 ? <Empty label="activity" />
        : data.map((item, i) => {
          const meta = ACTIVITY_ICONS[item.type] || { Icon: FiBell, color: '#64748b' };
          return (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '11px 16px',
              borderBottom: i < data.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: '#f8fafc', border: `1.5px solid #e2e8f0`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <meta.Icon size={14} color={meta.color} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{item.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{ago(item.createdAt)}</p>
              </div>
            </div>
          );
        })
      }
    </div>
  </SectionCard>
);
