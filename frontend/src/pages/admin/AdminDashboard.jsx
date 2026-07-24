import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetDashboardStatsQuery, useGetDashboardAnalyticsQuery, useLazyGetAllStudentsAdminQuery, useLazyGetAllTeachersAdminQuery, useLazyGetAllClassesAdminQuery, useLazyGetAllSubjectsAdminQuery } from '../../redux/api/adminApi';
import { MdPeople, MdClass, MdSubject, MdPendingActions, MdSchool, MdClose, MdSearch } from 'react-icons/md';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { AdmissionTrendChart, AttendanceTrendChart, FeesCollectionChart } from '../../components/AdminDashboardCharts';
import { QuickActions, StaffSnapshot, FeesSnapshot, RecentActivity } from '../../components/AdminDashboardSections';

/* ─────────────────────────────────────────
   Detail Modal
───────────────────────────────────────── */
const DetailModal = ({ open, onClose, title, color, icon, loading, rows, columns, type }) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  if (!open) return null;

  // Filter by search
  const matched = search.trim()
    ? rows.filter(r =>
        columns.some(col => {
          const val = col.accessor(r);
          return String(val ?? '').toLowerCase().includes(search.toLowerCase());
        })
      )
    : [...rows];

  // Sort: classes by numericOrder, subjects & others alphabetically by first column
  const filtered = type === 'classes'
    ? [...matched].sort((a, b) => (a.numericOrder ?? 999) - (b.numericOrder ?? 999))
    : [...matched].sort((a, b) => {
        const av = String(columns[0].accessor(a) ?? '').toLowerCase();
        const bv = String(columns[0].accessor(b) ?? '').toLowerCase();
        return av.localeCompare(bv);
      });

  const isClasses  = type === 'classes';
  const isSubjects = type === 'subjects';
  const useCards   = isClasses || isSubjects;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: 880, maxHeight: '92vh' }}
      >
        {/* ── Header ── */}
        <div className="border-b px-6 py-4 flex items-center justify-between bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2 rounded-lg text-gray-500">{icon}</div>
            <div>
              <h2 className="text-gray-800 font-semibold text-base">{title}</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'} found`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-gray-200 transition-all"
          >
            <MdClose size={18} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-sm">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isClasses ? 'Search class name…' : isSubjects ? 'Search subject name or code…' : 'Search…'}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition"
            />
          </div>
        </div>

        {/* ── Content ── */}
        <div className="overflow-auto flex-1 p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading data…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="text-4xl">🔍</div>
              <p className="text-gray-500 font-medium">No records found</p>
              <p className="text-gray-400 text-sm">Try a different search term</p>
            </div>
          ) : useCards ? (
            /* ── CARD GRID (Classes & Subjects) ── */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((row, i) =>
                isClasses ? (
                  /* CLASS CARD */
                  <div
                    key={row._id || i}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition-all duration-150 cursor-default"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                        {row.numericOrder ?? i + 1}
                      </div>
                      {row.session?.name && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                          {row.session.name}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm capitalize leading-snug">{row.name}</p>
                  </div>
                ) : (
                  /* SUBJECT CARD */
                  <div
                    key={row._id || i}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition-all duration-150 cursor-default"
                  >
                    <div className="flex items-center justify-between mb-3">
                      {row.code ? (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono font-bold tracking-widest">
                          {row.code}
                        </span>
                      ) : <span />}
                      {row.type && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize bg-gray-100 text-gray-500">
                          {row.type}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm leading-snug">{row.name}</p>
                  </div>
                )
              )}
            </div>
          ) : (
            /* ── FALLBACK TABLE (shouldn't appear now) ── */
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium w-10">#</th>
                  {columns.map(col => (
                    <th key={col.label} className="text-left py-3 px-4 text-gray-500 font-medium">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row._id || i} className={`border-b border-gray-50 ${
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-indigo-50 transition-colors`}>
                    <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                    {columns.map(col => (
                      <td key={col.label} className="py-3 px-4 text-gray-700">
                        {col.accessor(row) ?? <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {isClasses ? 'Sorted by class order' : 'Sorted A → Z'}
          </p>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 px-4 py-1.5 rounded-lg transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Column definitions per card type
───────────────────────────────────────── */
const COLUMNS = {
  students: [
    { label: 'Name', accessor: r => `${r.firstName} ${r.lastName}` },
    { label: 'Roll No', accessor: r => r.rollNo },
    { label: 'Class', accessor: r => r.classId?.name },
    { label: 'Section', accessor: r => r.sectionId?.name },
    { label: 'Gender', accessor: r => r.gender },
    { label: 'Father', accessor: r => r.parentDetails?.father?.name },
    { label: 'Phone', accessor: r => r.phone || r.parentDetails?.father?.phone },
    { label: 'Admission', accessor: r => r.admissionDate ? new Date(r.admissionDate).toLocaleDateString() : null },
  ],
  teachers: [
    { label: 'Name', accessor: r => `${r.firstName} ${r.lastName}` },
    { label: 'Employee ID', accessor: r => r.employeeId },
    { label: 'Designation', accessor: r => r.designation },
    { label: 'Department', accessor: r => r.department },
    { label: 'Qualification', accessor: r => r.qualification },
    { label: 'Phone', accessor: r => r.phone },
    { label: 'Joining Date', accessor: r => r.joiningDate ? new Date(r.joiningDate).toLocaleDateString() : null },
  ],
  classes: [
    { label: 'Class Name', accessor: r => r.name },
    { label: 'Order', accessor: r => r.numericOrder },
    { label: 'Session', accessor: r => r.session?.name },
  ],
  subjects: [
    { label: 'Subject Name', accessor: r => r.name },
    { label: 'Code', accessor: r => r.code },
    { label: 'Type', accessor: r => r.type },
  ],
};

/* ─────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────── */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetDashboardStatsQuery(undefined, { refetchOnMountOrArgChange: true });
  const stats = data?.data || {};

  // Real analytics data for charts
  const { data: analyticsData, isLoading: analyticsLoading } = useGetDashboardAnalyticsQuery();
  const analytics = analyticsData?.data || {};

  // Lazy queries — only fire when card is clicked
  const [fetchStudents, studentsResult] = useLazyGetAllStudentsAdminQuery();
  const [fetchTeachers, teachersResult] = useLazyGetAllTeachersAdminQuery();
  const [fetchClasses, classesResult] = useLazyGetAllClassesAdminQuery();
  const [fetchSubjects, subjectsResult] = useLazyGetAllSubjectsAdminQuery();

  const [modal, setModal] = useState(null); // null | 'students' | 'teachers' | 'classes' | 'subjects'

  const openPage = (type) => {
    if (type === 'students') navigate('/admin/students');
    else if (type === 'teachers') navigate('/admin/teachers');
    else if (type === 'classes') navigate('/admin/class-list');
    else if (type === 'subjects') navigate('/admin/subject-list');
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
    </div>
  );

  const cards = [
    { label: 'Total Students',  value: stats.totalStudents  || 0,                   icon: <MdPeople size={22} />,           accent: '#6366f1', iconBg: '#eef2ff', borderColor: '#e0e7ff', shadow: 'rgba(99,102,241,0.25)',  type: 'students',  clickable: true },
    { label: 'Total Teachers',  value: stats.totalTeachers  || 0,                   icon: <FaChalkboardTeacher size={22} />, accent: '#10b981', iconBg: '#d1fae5', borderColor: '#a7f3d0', shadow: 'rgba(16,185,129,0.25)', type: 'teachers',  clickable: true },
    { label: 'Total Classes',   value: stats.totalClasses   || 0,                   icon: <MdClass size={22} />,            accent: '#8b5cf6', iconBg: '#ede9fe', borderColor: '#ddd6fe', shadow: 'rgba(139,92,246,0.25)', type: 'classes',   clickable: true },
    { label: 'Total Subjects',  value: stats.totalSubjects  || 0,                   icon: <MdSubject size={22} />,          accent: '#f59e0b', iconBg: '#fef3c7', borderColor: '#fde68a', shadow: 'rgba(245,158,11,0.25)', type: 'subjects',  clickable: true },
    { label: 'Pending Leaves',  value: stats.pendingLeaves  || 0,                   icon: <MdPendingActions size={22} />,   accent: '#ef4444', iconBg: '#fee2e2', borderColor: '#fecaca', shadow: 'rgba(239,68,68,0.25)',  type: null,        clickable: false },
    { label: 'Active Session',  value: stats.activeSession  || 'None', isText: true, icon: <MdSchool size={22} />,          accent: '#0ea5e9', iconBg: '#e0f2fe', borderColor: '#bae6fd', shadow: 'rgba(14,165,233,0.25)',  type: null,        clickable: false },
  ];

  /* pick the right data for the open modal */
  const modalData = {
    students: { rows: studentsResult.data?.data || [], loading: studentsResult.isLoading },
    teachers: { rows: teachersResult.data?.data || [], loading: teachersResult.isLoading },
    classes: { rows: classesResult.data?.data || [], loading: classesResult.isLoading },
    subjects: { rows: subjectsResult.data?.data || [], loading: subjectsResult.isLoading },
  };

  const activeCard = modal ? cards.find(c => c.type === modal) : null;

  return (
    <div>
      <h1 className="erp-page-title">Admin Dashboard</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>Overview of your school at a glance</p>

      {/* Stat Cards — premium color-coded */}
      <div className="dash-stat-grid">
        {cards.map((card, i) => (
          <div
            key={i}
            onClick={() => card.clickable && openPage(card.type)}
            style={{
              background: '#fff', borderRadius: 12, padding: '18px 20px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              cursor: card.clickable ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (card.clickable) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)'; e.currentTarget.style.borderColor = '#d1d5db'; }}}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{card.label}</p>
                <p style={{ fontSize: card.isText ? 18 : 28, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1 }}>{card.value}</p>
                {card.clickable && <p style={{ fontSize: 11, color: '#6366f1', marginTop: 8, fontWeight: 500 }}>View all →</p>}
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', flexShrink: 0 }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* ── 3 Analytics Charts ─────────────────────────── */}
      <div className="dash-chart-grid">
        <AdmissionTrendChart data={analytics.admissionTrend || []} isLoading={analyticsLoading} />
        <AttendanceTrendChart data={analytics.attendanceTrend || []} isLoading={analyticsLoading} />
        <FeesCollectionChart data={analytics.feesCollection || []} isLoading={analyticsLoading} />
      </div>

      {/* ── Bottom 2-column layout ──────────────────────── */}
      <div className="dash-bottom-grid">
        {/* Left: Staff + Fees */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <StaffSnapshot data={analytics.staffSnapshot || {}} isLoading={analyticsLoading} />
          <FeesSnapshot data={analytics.feesSnapshot || {}} isLoading={analyticsLoading} />
        </div>
        {/* Right: Recent Activity */}
        <RecentActivity data={analytics.recentActivity || []} isLoading={analyticsLoading} />
      </div>

      {/* Recent Students */}
      {stats.recentStudents?.length > 0 && (
        <div className="erp-section-card">
          <h2 className="erp-section-title">Recent Admissions</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  {['Name', 'Class', 'Section', 'Joined'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recentStudents.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</td>
                    <td>{s.classId?.name || '—'}</td>
                    <td>{s.sectionId?.name || '—'}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
