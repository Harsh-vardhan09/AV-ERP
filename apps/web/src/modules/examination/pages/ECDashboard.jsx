/**
 * Exam Controller — Dashboard
 * ──────────────────────────────────────────────────────────────────────────
 * Summary overview of exam activity for the examination department.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  useGetECActiveSessionQuery,
  useGetECExamsQuery,
  useGetECAuditLogQuery,
} from '../api/examControllerApi';
import { MdUploadFile, MdBarChart, MdEvent, MdGrading } from 'react-icons/md';

const getNestedValue = (obj, path, def = null) => {
  try { return path.split('.').reduce((acc, p) => acc?.[p], obj) ?? def; } catch { return def; }
};

const StatCard = ({ icon, label, value, color, to }) => (
  <Link to={to} style={{ textDecoration: 'none' }}>
    <div style={{
      background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)',
      padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.18s',
      cursor: 'pointer',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.15)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: `${color}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color, fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  </Link>
);

const ECDashboard = () => {
  const { data: sessionData } = useGetECActiveSessionQuery();
  const sessionId = getNestedValue(sessionData, 'data._id');

  const { data: examsData, isLoading: examsLoading } = useGetECExamsQuery(
    { session: sessionId }, { skip: !sessionId }
  );
  const { data: auditData, isLoading: auditLoading } = useGetECAuditLogQuery(undefined);

  const exams     = examsData?.data  || [];
  const auditLogs = auditData?.data  || [];

  const recentLogs = [...auditLogs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          🎓 Exam Department Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
          School-wide marks management and examination tracking
        </p>
        {sessionData?.data && (
          <span style={{ display: 'inline-block', marginTop: 6, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 16, padding: '2px 12px', fontSize: 12, fontWeight: 600, color: '#166534' }}>
            📅 Active Session: {sessionData.data.name || sessionData.data.year}
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard
          icon={<MdGrading />}
          label="Total Exams"
          value={examsLoading ? '…' : exams.length}
          color="#6366f1"
          to="/exam-controller/exams"
        />
        <StatCard
          icon={<MdBarChart />}
          label="Audit Log Entries"
          value={auditLoading ? '…' : auditLogs.length}
          color="#0ea5e9"
          to="/exam-controller/audit-log"
        />
        <StatCard
          icon={<MdUploadFile />}
          label="Enter Marks"
          value="→ Go"
          color="#16a34a"
          to="/exam-controller/marks"
        />
        <StatCard
          icon={<MdEvent />}
          label="Exams by EC"
          value={auditLoading ? '…' : auditLogs.filter(l => l.uploadedByRole === 'exam_controller').length}
          color="#f59e0b"
          to="/exam-controller/audit-log"
        />
      </div>

      {/* Recent audit activity */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Marks Activity</h2>
          <Link to="/exam-controller/audit-log" style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
        </div>

        {auditLoading ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Loading activity…</div>
        ) : recentLogs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <p style={{ margin: 0 }}>No marks activity found. Start entering marks!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Uploaded By</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Role</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Method</th>
                  <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Students</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log, i) => {
                  const isEC = log.uploadedByRole === 'exam_controller';
                  return (
                    <tr key={log._id || i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {log.uploadedBy?.firstName && log.uploadedBy?.lastName
                          ? `${log.uploadedBy.firstName} ${log.uploadedBy.lastName}`
                          : 'Unknown'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: isEC ? '#fef3c7' : '#eff6ff',
                          color: isEC ? '#92400e' : '#1d4ed8',
                        }}>
                          {isEC ? '🎓 Exam Ctrl' : '👨‍🏫 Teacher'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {log.uploadMethod?.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {log.studentCount}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ECDashboard;
