/**
 * Exam Controller — Audit Log Page
 * Shows all marks upload events for the school with role filtering.
 */
import React, { useState } from 'react';
import { useGetECAuditLogQuery } from '../../redux/api/examControllerApi';

const ECAuditLog = () => {
  const { data, isLoading } = useGetECAuditLogQuery();
  const [roleFilter, setRoleFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const logs = data?.data || [];

  const filtered = logs.filter(l => {
    if (roleFilter !== 'all' && l.uploadedByRole !== roleFilter) return false;
    if (methodFilter !== 'all' && l.uploadMethod !== methodFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          📋 Marks Audit Log
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
          Complete record of all marks upload events for this school
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Role</label>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13 }}>
            <option value="all">All Roles</option>
            <option value="teacher">Teacher</option>
            <option value="exam_controller">Exam Controller</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Method</label>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 13 }}>
            <option value="all">All Methods</option>
            <option value="manual">Manual</option>
            <option value="excel">Excel</option>
            <option value="manual_dynamic">Manual Dynamic</option>
            <option value="excel_dynamic">Excel Dynamic</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', paddingBottom: 2 }}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: 12, border: '1px solid var(--card-border)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading audit log…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <p style={{ margin: 0 }}>No records found for the selected filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.07)' }}>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Uploaded By</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Role</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Method</th>
                  <th style={{ padding: '11px 10px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Students</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Exam</th>
                  <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const isEC = log.uploadedByRole === 'exam_controller';
                  const isAdmin = log.uploadedByRole === 'admin';
                  const roleColor = isEC ? { bg: '#fef3c7', color: '#92400e', label: '🎓 Exam Ctrl' }
                    : isAdmin ? { bg: '#ede9fe', color: '#5b21b6', label: '⚙️ Admin' }
                      : { bg: '#eff6ff', color: '#1d4ed8', label: '👨‍🏫 Teacher' };

                  return (
                    <tr key={log._id || i} style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {log.uploadedBy?.firstName
                          ? `${log.uploadedBy.firstName} ${log.uploadedBy.lastName}`
                          : '—'}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: roleColor.bg, color: roleColor.color }}>
                          {roleColor.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {log.uploadMethod?.replace(/_/g, ' ')}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {log.studentCount}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {log.examId?.name || '—'}
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {log.createdAt
                          ? new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
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

export default ECAuditLog;
