import React from 'react';
import { useGetAllStudentsQuery, useGetAllTeachersQuery } from '../../redux/api/admissionApi';
import { MdPersonAdd, MdPeople, MdArrowForward } from 'react-icons/md';
import { FaChalkboardTeacher, FaUserGraduate } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const AdmissionDashboard = () => {
  const { data: studData } = useGetAllStudentsQuery({});
  const { data: teachData } = useGetAllTeachersQuery({});
  const navigate = useNavigate();

  const students = studData?.data || [];
  const teachers = teachData?.data || [];

  const cards = [
    { label: 'Total Students',    value: students.length, icon: <FaUserGraduate size={22} />,     path: '/admission/students' },
    { label: 'Total Teachers',    value: teachers.length, icon: <FaChalkboardTeacher size={22} />, path: '/admission/teachers' },
    { label: 'Register Student',  value: '+',             icon: <MdPersonAdd size={22} />,         path: '/admission/register-student' },
    { label: 'Register Teacher',  value: '+',             icon: <MdPeople size={22} />,            path: '/admission/register-teacher' },
  ];

  return (
    <div>
      <h1 className="erp-page-title">Admission Dashboard</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>Manage student and teacher registrations</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
        {cards.map((c, i) => (
          <div
            key={i}
            onClick={() => navigate(c.path)}
            className="erp-stat-card erp-action-card clickable"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div className="erp-stat-label">{c.label}</div>
                <div className="erp-stat-value">{c.value}</div>
                <div className="erp-stat-link" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Go <MdArrowForward className="erp-action-arrow" />
                </div>
              </div>
              <div className="erp-icon-box">{c.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdmissionDashboard;
