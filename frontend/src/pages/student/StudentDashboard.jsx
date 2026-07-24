import React from 'react';
import { useGetMyReportQuery } from '../../redux/api/studentApi';
import { FaCalendarCheck, FaBookOpen, FaClipboardList } from 'react-icons/fa';
import { MdOutlineHowToVote } from 'react-icons/md';
import LibraryReminder from '../../components/library/LibraryReminder';

const StudentDashboard = () => {
  const { data, isLoading } = useGetMyReportQuery();
  const report = data?.data || {};

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
      <div className="erp-spinner" />
    </div>
  );

  const { student, attendance, assignments, marks, leaves } = report;

  const cards = [
    {
      label: 'Attendance',
      value: `${attendance?.percentage || 0}%`,
      sub: `${attendance?.present || 0} / ${attendance?.totalClasses || 0} classes`,
      icon: <FaCalendarCheck size={20} />,
      valueClass: 'erp-stat-value-success',
    },
    {
      label: 'Assignments',
      value: `${assignments?.submitted || 0}/${assignments?.total || 0}`,
      sub: `${assignments?.pending || 0} pending`,
      icon: <FaClipboardList size={20} />,
    },
    {
      label: 'Exams Done',
      value: marks?.length || 0,
      sub: 'marks recorded',
      icon: <FaBookOpen size={20} />,
    },
    {
      label: 'Leave Status',
      value: leaves?.reduce((acc, l) => acc + l.count, 0) || 0,
      sub: leaves?.map(l => `${l.count} ${l._id}`).join(' · ') || 'No leaves',
      icon: <MdOutlineHowToVote size={20} />,
      valueClass: 'erp-stat-value-warning',
    },
  ];

  return (
    <div>
      <h1 className="erp-page-title">Student Dashboard</h1>
      {student && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>
          {student.name} &nbsp;·&nbsp; Class {student.class} – {student.section} &nbsp;·&nbsp; Roll No: {student.rollNo}
        </p>
      )}

      {/* Library overdue / due-soon reminder — renders null when no active issues */}
      <LibraryReminder />

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {cards.map((card, i) => (
          <div key={i} className="erp-stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div className="erp-stat-label">{card.label}</div>
                <div className={`erp-stat-value${card.valueClass ? ` ${card.valueClass}` : ''}`}>{card.value}</div>
                <div className="erp-stat-sub">{card.sub}</div>
              </div>
              <div className="erp-icon-box">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Marks */}
      {marks?.length > 0 && (
        <div className="erp-section-card">
          <h2 className="erp-section-title">Recent Marks</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  {['Exam', 'Subject', 'Marks Obtained'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {marks.slice(0, 10).map((m, i) => (
                  <tr key={i}>
                    <td>{m.examId?.name}</td>
                    <td>{m.subjectId?.name}</td>
                    <td style={{ fontWeight: 700 }}>{m.marksObtained}</td>
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

export default StudentDashboard;
