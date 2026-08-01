import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { authApi, useLogoutMutation, useGetMySchoolQuery, useCheak_authQuery } from '../redux/api/userApi';
import { userlogout } from '../redux/reducers/userreducer';
import { useGetMyClassTeacherQuery } from '../redux/api/teacherApi';
import {
  MdDashboard, MdAssignment, MdPersonAdd, MdLogout,
  MdSchool, MdClass, MdSubject, MdPeople, MdGrading, MdMenu,
  MdCalendarMonth, MdCheckCircle, MdDescription, MdNotifications,
  MdOutlineAutoStories, MdPrint, MdOutlineSettings,
  MdUploadFile, MdBook, MdReport, MdSettings, MdBarChart, MdAttachMoney, MdArticle, MdBadge,
  MdEdit, MdDeleteOutline, MdBlock, MdExitToApp, MdUpgrade, MdFeed,
  MdPerson, MdEmail, MdPhone, MdBusiness, MdClose, MdGridView, MdLibraryBooks,
  MdPayments, MdAccountBalance, MdReceipt
} from 'react-icons/md';
import { GiPayMoney } from 'react-icons/gi';
import { FaChalkboardTeacher, FaUserGraduate, FaCalendarCheck, FaCreditCard } from 'react-icons/fa';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import NotificationBell from './NotificationBell';
import LibraryDueAlert from './LibraryDueAlert';
import MobileBottomNav from './MobileBottomNav';

const COLLAPSE_KEY = 'erp.sidebar.collapsed';
const STUDENTS_OPEN_KEY = 'erp.sidebar.students.open';
const ADMISSION_FORMS_OPEN_KEY = 'erp.sidebar.admissionforms.open';
const TEACHERS_OPEN_KEY = 'erp.sidebar.teachers.open';
const ID_CARDS_OPEN_KEY = 'erp.sidebar.idcards.open';
const CUSTOM_FORMS_OPEN_KEY = 'erp.sidebar.customforms.open';

// ── Students collapsible sub-items ──
const STUDENTS_SUB_ITEMS = [
  { to: '/admin/students/all', icon: <MdPeople size={17} />, label: 'All Students' },
  { to: '/admin/students/bulk-edit', icon: <MdEdit size={17} />, label: 'Students Bulk Edit' },
  { to: '/admin/students/deleted', icon: <MdDeleteOutline size={17} />, label: 'Deleted Students' },
  { to: '/admin/students/passed', icon: <FaUserGraduate size={17} />, label: 'Passed Students' },
  { to: '/admin/students/dropped', icon: <MdExitToApp size={17} />, label: 'Dropped Students' },
  { to: '/admin/students/suspended', icon: <MdBlock size={17} />, label: 'Suspended Students' },
  { to: '/admin/students/promotion', icon: <MdUpgrade size={17} />, label: 'Migration / Promotion' },
  { to: '/admin/bulk-import', icon: <MdUploadFile size={17} />, label: '📥 Bulk Import' },
];

// ── Collapsible Students group ──
const StudentsGroup = ({ isCollapsed, onMobileClose }) => {
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem(STUDENTS_OPEN_KEY) !== 'false'; } catch { return true; }
  });

  const toggle = () => setOpen(prev => {
    const next = !prev;
    try { localStorage.setItem(STUDENTS_OPEN_KEY, String(next)); } catch { }
    return next;
  });

  // Collapsed (icon-only) mode — just show the group icon
  if (isCollapsed) {
    return (
      <button
        onClick={toggle}
        title="Students"
        className="erp-nav-item"
        style={{ justifyContent: 'center', gap: 0, width: '100%' }}
      >
        <FaUserGraduate size={20} />
      </button>
    );
  }

  return (
    <div>
      {/* Group header — uses same erp-nav-item class as all other nav links */}
      <button
        onClick={toggle}
        className="erp-nav-item"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <FaUserGraduate size={18} />
          <span className="erp-nav-label">Students</span>
        </span>
        {open
          ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
      </button>

      {/* Sub-items */}
      {open && (
        <div style={{ paddingLeft: 14 }}>
          {STUDENTS_SUB_ITEMS.map((item, i) => (
            <NavLink
              key={i}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
              style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7, gap: 8 }}
            >
              {item.icon}
              <span className="erp-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Admission Forms collapsible sub-items ──
const ADMISSION_FORMS_SUB_ITEMS = [
  { to: '/admin/admission-forms/print', icon: <MdPrint size={17} />, label: 'Print Admission Form' },
  { to: '/admin/admission-forms/settings', icon: <MdOutlineSettings size={17} />, label: 'Admission Form Settings' },
  { to: '/admin/admission/templates', icon: <MdUploadFile size={17} />, label: 'Admission Templates' },
];
const ADMISSION_FORMS_SUB_ITEMS_ADM = [
  { to: '/admission/admission-forms/print', icon: <MdPrint size={17} />, label: 'Print Admission Form' },
  { to: '/admission/admission-forms/settings', icon: <MdOutlineSettings size={17} />, label: 'Admission Form Settings' },
  { to: '/admission/admission/templates', icon: <MdUploadFile size={17} />, label: 'Admission Templates' },
];

// ── Collapsible Admission Forms group ──
const AdmissionFormsGroup = ({ isCollapsed, onMobileClose, role }) => {
  const subItems = role === 'admission' ? ADMISSION_FORMS_SUB_ITEMS_ADM : ADMISSION_FORMS_SUB_ITEMS;
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem(ADMISSION_FORMS_OPEN_KEY) !== 'false'; } catch { return true; }
  });

  const toggle = () => setOpen(prev => {
    const next = !prev;
    try { localStorage.setItem(ADMISSION_FORMS_OPEN_KEY, String(next)); } catch { }
    return next;
  });

  if (isCollapsed) {
    return (
      <button
        onClick={toggle}
        title="Admission Forms"
        className="erp-nav-item"
        style={{ justifyContent: 'center', gap: 0, width: '100%' }}
      >
        <MdFeed size={20} />
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="erp-nav-item"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <MdFeed size={18} />
          <span className="erp-nav-label">Admission Forms</span>
        </span>
        {open
          ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ paddingLeft: 14 }}>
          {subItems.map((item, i) => (
            <NavLink
              key={i}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
              style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7, gap: 8 }}
            >
              {item.icon}
              <span className="erp-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Teachers collapsible sub-items ──
const TEACHERS_SUB_ITEMS = [
  { to: '/admin/teachers/all', icon: <FaChalkboardTeacher size={17} />, label: 'All Teachers' },
  { to: '/admin/teachers/deleted', icon: <MdDeleteOutline size={17} />, label: 'Deleted Teachers' },
];

// ── Collapsible Teachers group ──
const TeachersGroup = ({ isCollapsed, onMobileClose }) => {
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem(TEACHERS_OPEN_KEY) !== 'false'; } catch { return true; }
  });

  const toggle = () => setOpen(prev => {
    const next = !prev;
    try { localStorage.setItem(TEACHERS_OPEN_KEY, String(next)); } catch { }
    return next;
  });

  if (isCollapsed) {
    return (
      <button
        onClick={toggle}
        title="Teachers"
        className="erp-nav-item"
        style={{ justifyContent: 'center', gap: 0, width: '100%' }}
      >
        <FaChalkboardTeacher size={20} />
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="erp-nav-item"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <FaChalkboardTeacher size={18} />
          <span className="erp-nav-label">Teachers</span>
        </span>
        {open
          ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ paddingLeft: 14 }}>
          {TEACHERS_SUB_ITEMS.map((item, i) => (
            <NavLink
              key={i}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
              style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7, gap: 8 }}
            >
              {item.icon}
              <span className="erp-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ID Cards collapsible sub-items ──
const ID_CARDS_SUB_ITEMS = [
  { to: '/admin/id-cards/students', icon: <MdBadge size={17} />, label: 'Student ID Cards' },
  { to: '/admin/id-cards/teachers', icon: <MdBadge size={17} />, label: 'Teacher ID Cards' },
];

// ── Collapsible ID Cards group ──
const IDCardsGroup = ({ isCollapsed, onMobileClose }) => {
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem(ID_CARDS_OPEN_KEY) !== 'false'; } catch { return true; }
  });

  const toggle = () => setOpen(prev => {
    const next = !prev;
    try { localStorage.setItem(ID_CARDS_OPEN_KEY, String(next)); } catch { }
    return next;
  });

  if (isCollapsed) {
    return (
      <button
        onClick={toggle}
        title="ID Cards"
        className="erp-nav-item"
        style={{ justifyContent: 'center', gap: 0, width: '100%' }}
      >
        <MdBadge size={20} />
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="erp-nav-item"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <MdBadge size={18} />
          <span className="erp-nav-label">ID Cards</span>
        </span>
        {open
          ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ paddingLeft: 14 }}>
          {ID_CARDS_SUB_ITEMS.map((item, i) => (
            <NavLink
              key={i}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
              style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7, gap: 8 }}
            >
              {item.icon}
              <span className="erp-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Custom Forms collapsible sub-items ──
const CUSTOM_FORMS_SUB_ITEMS = [
  { to: '/admin/custom-forms', icon: <MdArticle size={17} />, label: 'All Forms' },
  { to: '/admin/custom-forms/create', icon: <MdPersonAdd size={17} />, label: 'Create New Form' },
];

// ── Collapsible Custom Forms group ──
const CustomFormsGroup = ({ isCollapsed, onMobileClose }) => {
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem(CUSTOM_FORMS_OPEN_KEY) !== 'false'; } catch { return true; }
  });

  const toggle = () => setOpen(prev => {
    const next = !prev;
    try { localStorage.setItem(CUSTOM_FORMS_OPEN_KEY, String(next)); } catch { }
    return next;
  });

  if (isCollapsed) {
    return (
      <button
        onClick={toggle}
        title="Custom Forms"
        className="erp-nav-item"
        style={{ justifyContent: 'center', gap: 0, width: '100%' }}
      >
        <MdArticle size={20} />
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={toggle}
        className="erp-nav-item"
        style={{ width: '100%', justifyContent: 'space-between' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <MdArticle size={18} />
          <span className="erp-nav-label">Custom Forms</span>
        </span>
        {open
          ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ paddingLeft: 14 }}>
          {CUSTOM_FORMS_SUB_ITEMS.map((item, i) => (
            <NavLink
              key={i}
              to={item.to}
              end={item.to === '/admin/custom-forms'}
              onClick={onMobileClose}
              className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
              style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7, gap: 8 }}
            >
              {item.icon}
              <span className="erp-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const PAYROLL_OPEN_KEY = 'erp.sidebar.payroll.open';

// ── Payroll collapsible sub-items (admin) ──
const PAYROLL_SUB_ITEMS = [
  { to: '/admin/payroll/dashboard', icon: <MdAttachMoney size={17} />, label: 'Payroll Dashboard' },
  { to: '/admin/payroll/runs', icon: <MdPayments size={17} />, label: 'Payroll Runs' },
  { to: '/admin/payroll/employee-salaries', icon: <MdPeople size={17} />, label: 'Employee Salaries' },
  { to: '/admin/payroll/structures', icon: <MdDescription size={17} />, label: 'Salary Structures' },
  { to: '/admin/payroll/components', icon: <MdDescription size={17} />, label: 'Salary Components' },
  { to: '/admin/payroll/tax-config', icon: <MdOutlineSettings size={17} />, label: 'Tax Config' },
  { to: '/admin/payroll/attendance', icon: <FaCalendarCheck size={17} />, label: 'Staff Attendance' },
  { to: '/admin/payroll/payslips', icon: <MdReceipt size={17} />, label: 'Payslips' },
  { to: '/admin/payroll/payment-batches', icon: <MdAccountBalance size={17} />, label: 'Payment Batches' },
  { to: '/admin/payroll/reports', icon: <MdBarChart size={17} />, label: 'Reports' },
];

const PayrollGroup = ({ isCollapsed, onMobileClose }) => {
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem(PAYROLL_OPEN_KEY) !== 'false'; } catch { return false; }
  });

  const toggle = () => setOpen(prev => {
    const next = !prev;
    try { localStorage.setItem(PAYROLL_OPEN_KEY, String(next)); } catch { }
    return next;
  });

  if (isCollapsed) {
    return (
      <button onClick={toggle} title="Payroll" className="erp-nav-item"
        style={{ justifyContent: 'center', gap: 0, width: '100%' }}>
        <MdAttachMoney size={20} />
      </button>
    );
  }

  return (
    <div>
      <button onClick={toggle} className="erp-nav-item"
        style={{ width: '100%', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <MdAttachMoney size={18} />
          <span className="erp-nav-label">Payroll</span>
        </span>
        {open
          ? <ChevronDown size={14} style={{ flexShrink: 0 }} />
          : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ paddingLeft: 14 }}>
          {PAYROLL_SUB_ITEMS.map((item, i) => (
            <NavLink key={i} to={item.to} onClick={onMobileClose}
              className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
              style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7, gap: 8 }}>
              {item.icon}
              <span className="erp-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const menuConfig = {
  admin: [
    { to: '/admin/dashboard', icon: <MdDashboard size={20} />, label: 'Dashboard' },
    { to: '/admin/sessions', icon: <MdCalendarMonth size={20} />, label: 'Sessions' },
    { to: '/admin/classes', icon: <MdClass size={20} />, label: 'Classes & Sections' },
    { to: '/admin/subjects', icon: <MdSubject size={20} />, label: 'Subjects' },
    { to: '/admission/register-teacher', icon: <MdPersonAdd size={20} />, label: 'Register Teacher' },
    { to: '/admin/teacher-assignment', icon: <FaChalkboardTeacher size={20} />, label: 'Teacher Assignment' },
    { to: '/admin/exams', icon: <MdGrading size={20} />, label: 'Exams' },
    { to: '/admin/marks-audit-log', icon: <MdBarChart size={20} />, label: 'Marks Audit Log' },
    // { to: '/admin/settings', icon: <MdSettings size={20} />, label: 'School Settings' },
    { to: '/admin/teacher-leaves', icon: <MdCheckCircle size={20} />, label: 'Teacher Leaves' },
    { to: '/admin/staff', icon: <MdBadge size={20} />, label: 'Staff Management' },
    // { to: '/admin/staff?role=exam_controller', icon: <MdGrading size={20} />, label: 'Exam Controllers' },
    { to: '/admin/biometric/devices', icon: <MdCheckCircle size={20} />, label: 'Biometric Devices' },
    { to: '/admin/biometric/attendance', icon: <FaCalendarCheck size={20} />, label: 'Faculty Attendance' },
    { to: '/admin/fee', icon: <MdAttachMoney size={20} />, label: 'Fee Management' },
    // Legacy "Report Cards" generator retired — it used the pre-template
    // renderer and duplicated this screen. Template Report Cards is now the
    // single generator; Report Card Templates is where the layout is chosen.
    { to: '/admin/template-report-cards', icon: <MdGridView size={20} />, label: 'Report Cards' },
    { to: '/admin/templates', icon: <MdUploadFile size={20} />, label: 'Report Card Templates' },
    { to: '/admin/documents', icon: <MdArticle size={20} />, label: 'Documents (TC / Migration)' },
    // ── OASES module ──
    { to: '/admin/oases', icon: <MdOutlineAutoStories size={20} />, label: 'OASES – Evaluation' },
    { to: '/admin/settings', icon: <MdSettings size={20} />, label: 'School Settings' },
    // 💰 Payroll sub-items rendered via PayrollGroup collapsible below
    // Students sub-module items are rendered as a collapsible group — see StudentsGroup below
  ],
  teacher: [
    { to: '/teacher/dashboard', icon: <MdDashboard size={18} />, label: 'Dashboard' },
    { to: '/teacher/attendance', icon: <FaCalendarCheck size={18} />, label: 'Take Attendance' },
    { to: '/teacher/assignments', icon: <MdAssignment size={18} />, label: 'Assignments' },
    { to: '/teacher/marks', icon: <MdUploadFile size={18} />, label: 'Upload Marks' },
    { to: '/teacher/tests', icon: <MdGrading size={18} />, label: 'My Tests' },
    { to: '/teacher/materials', icon: <MdBook size={18} />, label: 'Knowledge Center' },
    { to: '/teacher/leave', icon: <MdDescription size={18} />, label: 'My Leave' },
    { to: '/teacher/student-leaves', icon: <MdCheckCircle size={18} />, label: 'Student Leaves' },
    { to: '/teacher/my-students', icon: <FaUserGraduate size={18} />, label: 'My Students' },
    { to: '/teacher/co-scholastic', icon: <MdGrading size={18} />, label: 'Co-Scholastic Marks' },
    { to: '/teacher/report-cards', icon: <MdDescription size={18} />, label: 'Report Cards' },
    { to: '/teacher/template-report-cards', icon: <MdGridView size={18} />, label: 'Template Report Cards' },
    // ── OASES module ── always shown for teachers
    { to: '/teacher/oases', icon: <MdOutlineAutoStories size={18} />, label: 'OASES – My Copies' },
    // 💰 Payroll — teacher self-service
    { to: '/teacher/payroll/my-payslips', icon: <MdReceipt size={18} />, label: 'My Payslips' },
  ],

  student: [
    { to: '/student/dashboard', icon: <MdDashboard size={18} />, label: 'Dashboard' },
    { to: '/student/attendance', icon: <FaCalendarCheck size={18} />, label: 'Attendance' },
    { to: '/student/assignments', icon: <MdAssignment size={18} />, label: 'Assignments' },
    { to: '/student/marks', icon: <MdBarChart size={18} />, label: 'Marks & Results' },
    { to: '/student/leave', icon: <MdDescription size={18} />, label: 'Apply Leave' },
    { to: '/student/materials', icon: <MdBook size={18} />, label: 'Knowledge Center' },
    { to: '/student/library', icon: <MdLibraryBooks size={18} />, label: 'Library' },
    { to: '/student/notices', icon: <MdNotifications size={18} />, label: 'Notices' },
    { to: '/student/complaints', icon: <MdReport size={18} />, label: 'Complaints' },
    { to: '/student/fees', icon: <FaCreditCard size={18} />, label: 'My Fees' },
    { to: '/student/report-card', icon: <MdDescription size={18} />, label: 'Report Card' },
  ],

  admission: [
    { to: '/admission/dashboard', icon: <MdDashboard size={18} />, label: 'Dashboard' },
    { to: '/admission/register-student', icon: <MdPersonAdd size={18} />, label: 'Register Student' },
    { to: '/admission/register-teacher', icon: <FaChalkboardTeacher size={18} />, label: 'Register Teacher' },
    { to: '/admission/students', icon: <FaUserGraduate size={18} />, label: 'All Students' },
    { to: '/admission/teachers', icon: <MdPeople size={18} />, label: 'All Teachers' },
    { to: '/admin/bulk-import', icon: <MdUploadFile size={18} />, label: '📥 Bulk Import' },
    // ── Admission Forms is rendered as a collapsible group — see AdmissionFormsGroup ──
  ],
  accounts: [
    { to: '/accounts/fee/students', icon: <FaUserGraduate size={18} />, label: 'Student Fees' },
    { to: '/accounts/fee/collect', icon: <FaCreditCard size={18} />, label: 'Collect Payment' },
    // 💰 Payroll (accounts role can manage salary payments)
    { to: '/accounts/payroll/dashboard', icon: <MdAttachMoney size={18} />, label: 'Payroll Dashboard' },
    { to: '/accounts/payroll/runs', icon: <MdPayments size={18} />, label: 'Payroll Runs' },
    { to: '/accounts/payroll/payslips', icon: <MdReceipt size={18} />, label: 'Payslips' },
    { to: '/accounts/payroll/payment-batches', icon: <MdAccountBalance size={18} />, label: 'Payment Batches' },
    { to: '/accounts/payroll/reports', icon: <MdBarChart size={18} />, label: 'Payroll Reports' },
  ],
  // ── Library Management System ──
  librarian: [
    { to: '/librarian/dashboard', icon: <MdDashboard size={20} />, label: 'Dashboard' },
    { to: '/librarian/books', icon: <MdLibraryBooks size={20} />, label: 'Manage Books' },
    { to: '/librarian/issue', icon: <MdBook size={20} />, label: 'Issue Book' },
    { to: '/librarian/return', icon: <MdCheckCircle size={20} />, label: 'Return Book' },
    { to: '/librarian/issued', icon: <MdDescription size={20} />, label: 'All Issues' },
    { to: '/librarian/overdue', icon: <MdReport size={20} />, label: 'Overdue Books' },
  ],

  // ── Exam Controller (MARKS_ALL_ACCESS — school-wide marks management) ──
  exam_controller: [
    { to: '/exam-controller/dashboard', icon: <MdDashboard size={20} />, label: 'Dashboard' },
    { to: '/exam-controller/marks', icon: <MdUploadFile size={20} />, label: 'Manage Marks' },
    { to: '/exam-controller/audit-log', icon: <MdBarChart size={20} />, label: 'Marks Audit Log' },
    { to: '/exam-controller/exams', icon: <MdGrading size={20} />, label: 'All Exams' },
  ],
};

// ── Library nav items also available inside admin sidebar ──
const LIBRARY_ADMIN_ITEMS = [
  { to: '/admin/library/dashboard', icon: <MdDashboard size={17} />, label: 'Library Dashboard' },
  { to: '/admin/library/books', icon: <MdLibraryBooks size={17} />, label: 'Manage Books' },
  { to: '/admin/library/issue', icon: <MdBook size={17} />, label: 'Issue Book' },
  { to: '/admin/library/return', icon: <MdCheckCircle size={17} />, label: 'Return Book' },
  { to: '/admin/library/issued', icon: <MdDescription size={17} />, label: 'All Issues' },
  { to: '/admin/library/overdue', icon: <MdReport size={17} />, label: 'Overdue Books' },
  { to: '/admin/library/librarians', icon: <MdPeople size={17} />, label: 'Manage Librarians' },
];


const LIBRARY_OPEN_KEY = 'erp.sidebar.library.open';

const LibraryGroup = ({ isCollapsed, onMobileClose }) => {
  const [open, setOpen] = React.useState(() => {
    try { return localStorage.getItem(LIBRARY_OPEN_KEY) !== 'false'; } catch { return false; }
  });
  const toggle = () => setOpen(prev => {
    const next = !prev;
    try { localStorage.setItem(LIBRARY_OPEN_KEY, String(next)); } catch { }
    return next;
  });
  if (isCollapsed) {
    return (
      <button onClick={toggle} title="Library" className="erp-nav-item" style={{ justifyContent: 'center', gap: 0, width: '100%' }}>
        <MdLibraryBooks size={20} />
      </button>
    );
  }
  return (
    <div>
      <button onClick={toggle} className="erp-nav-item" style={{ width: '100%', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <MdLibraryBooks size={18} />
          <span className="erp-nav-label">Library</span>
        </span>
        {open ? <ChevronDown size={14} style={{ flexShrink: 0 }} /> : <ChevronRight size={14} style={{ flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ paddingLeft: 14 }}>
          {LIBRARY_ADMIN_ITEMS.map((item, i) => (
            <NavLink key={i} to={item.to} onClick={onMobileClose}
              className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
              style={{ fontSize: 13, paddingTop: 7, paddingBottom: 7, gap: 8 }}>
              {item.icon}
              <span className="erp-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
};

const roleLabels = {
  admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
  admission: 'Admission Dept',
  accounts: 'Accounts Dept',
  librarian: 'Librarian',
  exam_controller: 'Exam Department',
};

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED = 68;

const DashboardLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  // ── Authoritative auth source (same as ProtectedRoute) ─────────────
  // Always use the API check-auth result for role — avoids redux-persist
  // rehydration mismatches that cause the wrong sidebar to appear.
  const { data: authData } = useCheak_authQuery();

  const rawUser = useSelector(state => state?.user);
  const isOasesEnabled = useSelector(state => state?.oasesSettings?.isOasesEnabled ?? false);
  // Phase 2 — per-module enable flags
  const enabledModules = useSelector(state => state?.moduleSettings?.modules ?? {});

  // Role from API is authoritative; fall back to Redux only if API hasn't loaded yet
  const role = authData?.user?.role ||
    rawUser?.user?.user?.role ||
    rawUser?.user?.role ||
    rawUser?.role ||
    'student';

  // User profile data for display (name, email, etc.)
  const user = authData?.user ||
    rawUser?.user?.user ||
    rawUser?.user ||
    rawUser ||
    {};

  // Fetch current school info (name + logo) for topbar — works for ALL roles
  const { data: schoolData } = useGetMySchoolQuery(undefined, { skip: !user?._id });
  const school = schoolData?.school || null;

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const { data: ctData } = useGetMyClassTeacherQuery(undefined, { skip: role !== 'teacher' });
  const isClassTeacher = (ctData?.data?.length ?? 0) > 0;


  const allItems = menuConfig[role] || [];

  // Filter my-students for non-class-teachers
  const baseItems = role === 'teacher' && !isClassTeacher
    ? allItems.filter((item) => item.to !== '/teacher/my-students')
    : allItems;

  const items = baseItems.filter((item) => {
    const to = item.to || '';
    // OASES — backward compat via existing slice
    if (!isOasesEnabled && (to === '/admin/oases' || to === '/teacher/oases')) return false;
    // Fee Management
    if (enabledModules.fee_management === false && to.includes('/fee')) return false;
    // Report Cards (old + template-based)
    if (enabledModules.report_cards === false &&
      (to.includes('/report-cards') || to.includes('/template-report-cards') ||
       to === '/admin/templates')) return false;
    // Documents
    if (enabledModules.documents === false && to.includes('/documents')) return false;
    // Biometric
    if (enabledModules.biometric === false && to.includes('/biometric')) return false;
    // Assignments (teacher side)
    if (enabledModules.assignments === false && to.includes('/assignments')) return false;
    return true;
  });

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { }
      return next;
    });
  };

  const handleLogout = async () => {
    await dispatch(userlogout());
    await logout();
    localStorage.removeItem('token');
    dispatch(authApi.util.resetApiState());
    navigate('/login');
  };

  // ── Sidebar inner content ──────────────────────────────────────
  // isCollapsed: false on mobile (always full labels), collapsed state on desktop
  const SidebarInner = ({ onMobileClose, isCollapsed }) => (
    <>
      {/* Header — Platform branding only, centered column */}
      <div className="erp-sidebar-header" style={{
        padding: isCollapsed ? '14px 8px 10px' : '22px 14px 18px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'
      }}>

        {/* Collapse / close toggle — absolute top-right */}
        <div style={{ position: 'absolute', top: 10, right: 8 }}>
          {onMobileClose ? (
            <button onClick={onMobileClose} className="erp-sidebar-toggle">
              <ChevronLeft size={17} />
            </button>
          ) : (
            <button onClick={toggleCollapse} className="erp-sidebar-toggle"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          )}
        </div>

        {/* Unified Campus Product Logo */}
        <img
          src="/unified_campus.png"
          alt="Unified Campus"
          style={{
            width: isCollapsed ? 38 : 80,
            height: isCollapsed ? 38 : 80,
            objectFit: 'contain',
            borderRadius: isCollapsed ? 8 : 12,
            marginBottom: isCollapsed ? 0 : 8,
            flexShrink: 0,
            transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            background: '#fff',
            padding: isCollapsed ? 3 : 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          }}
        />

        {/* Brand name — only when expanded */}
        {!isCollapsed && (
          <span style={{
            margin: 0, fontSize: 10, fontWeight: 700,
            letterSpacing: '2px', textTransform: 'uppercase',
            color: '#64748b', textAlign: 'center',
            lineHeight: 1.4, display: 'block'
          }}>
            UNIFIED CAMPUS
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="erp-nav">
        {!isCollapsed && <div className="erp-nav-section-label">Navigation</div>}

        {/* Dashboard — always first */}
        {items.slice(0, 1).map((item, i) => (
          <NavLink
            key={`top-${i}`}
            to={item.to}
            onClick={onMobileClose}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
            style={{ justifyContent: isCollapsed ? 'center' : undefined, gap: isCollapsed ? 0 : undefined }}
          >
            {item.icon}
            {!isCollapsed && <span className="erp-nav-label">{item.label}</span>}
          </NavLink>
        ))}

        {/* Students collapsible group — admin only, 2nd position */}
        {role === 'admin' && (
          <StudentsGroup isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        )}

        {/* Admission Forms collapsible group — admin + admission, 3rd position */}
        {(role === 'admin' || role === 'admission') && (
          <AdmissionFormsGroup isCollapsed={isCollapsed} onMobileClose={onMobileClose} role={role} />
        )}

        {/* Teachers collapsible group — admin only, 4th position */}
        {role === 'admin' && (
          <TeachersGroup isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        )}

        {/* ID Cards collapsible group — admin only, 5th position */}
        {role === 'admin' && (
          <IDCardsGroup isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        )}

        {/* Custom Forms collapsible group — admin only, 6th position */}
        {role === 'admin' && (
          <CustomFormsGroup isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        )}

        {/* Library Management — admin (collapsible group) */}
        {role === 'admin' && (
          <LibraryGroup isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        )}

        {/* 💰 Payroll collapsible group — admin only */}
        {role === 'admin' && (
          <PayrollGroup isCollapsed={isCollapsed} onMobileClose={onMobileClose} />
        )}

        {/* Remaining menu items — Dashboard is already rendered above */}
        {items.slice(1).map((item, i) => (
          <NavLink
            key={`rest-${i}`}
            to={item.to}
            onClick={onMobileClose}
            title={isCollapsed ? item.label : undefined}
            className={({ isActive }) => `erp-nav-item${isActive ? ' active' : ''}`}
            style={{ justifyContent: isCollapsed ? 'center' : undefined, gap: isCollapsed ? 0 : undefined }}
          >
            {item.icon}
            {!isCollapsed && <span className="erp-nav-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="erp-sidebar-footer">
        <button
          onClick={handleLogout}
          className="erp-logout-btn"
          title={isCollapsed ? 'Logout' : undefined}
          style={{ justifyContent: isCollapsed ? 'center' : undefined, gap: isCollapsed ? 0 : undefined }}
        >
          <MdLogout size={18} />
          {!isCollapsed && <span className="erp-logout-label">Logout</span>}
        </button>
      </div>
    </>
  );

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)' }}>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} className="erp-overlay" />
      )}

      {/* Mobile sidebar — always EXPANDED (isCollapsed=false) regardless of desktop pref */}
      <aside
        id="erp-mobile-sidebar"
        className="erp-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 50, width: SIDEBAR_WIDTH,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <SidebarInner onMobileClose={() => setMobileOpen(false)} isCollapsed={false} />
      </aside>

      {/* Desktop sidebar — respects the collapsed preference */}
      <aside
        id="erp-desktop-sidebar"
        className="erp-sidebar"
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 30, width: sidebarWidth, flexShrink: 0 }}
      >
        <SidebarInner onMobileClose={null} isCollapsed={collapsed} />
      </aside>

      {/* Desktop content spacer — hidden on mobile via CSS */}
      <div
        id="erp-sidebar-spacer"
        style={{ width: sidebarWidth, flexShrink: 0, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)' }}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {/* Topbar */}
        <header className="erp-topbar">
          {role !== 'student' && role !== 'teacher' && (
            <button className="erp-topbar-mobile-btn" onClick={() => setMobileOpen(true)}>
              <MdMenu size={22} />
            </button>
          )}

          {/* School brand — shows current school name + logo */}
          <div className="erp-topbar-brand" style={{ gap: 10 }}>
            {school?.logoUrl ? (
              <img src={school.logoUrl} alt={school.name}
                style={{
                  width: 30, height: 30, borderRadius: 6, objectFit: 'cover', flexShrink: 0,
                  border: '1.5px solid var(--card-border)'
                }} />
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: 6, flexShrink: 0,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff'
              }}>
                {school?.name?.[0]?.toUpperCase() || <MdSchool size={16} />}
              </div>
            )}
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              {school?.name || 'Loading...'}
            </span>
          </div>

          {/* Right side — Notification + Profile */}
          <div className="erp-topbar-right">
            <NotificationBell />

            {/* Profile dropdown */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                id="topbar-profile-btn"
                onClick={() => setProfileOpen(prev => !prev)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  background: profileOpen ? 'var(--color-primary-light)' : 'var(--card-bg)',
                  border: '1.5px solid var(--card-border)', borderRadius: 8,
                  padding: '5px 10px 5px 6px', transition: 'all 0.18s ease',
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--color-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff'
                }}>
                  {user?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600, maxWidth: 110, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)'
                }}>
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown size={13} style={{
                  flexShrink: 0, color: 'var(--text-secondary)',
                  transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s'
                }} />
              </button>

              {/* Profile dropdown panel */}
              {profileOpen && (
                <div id="topbar-profile-panel" style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  width: 'min(290px, calc(100vw - 24px))', background: '#ffffff',
                  border: '1px solid #cbd5e1', borderRadius: 16,
                  boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.12)', zIndex: 100,
                  overflow: 'hidden', animation: 'fadeSlideDown 0.18s ease'
                }}>
                  {/* Profile header */}
                  <div style={{
                    padding: '16px', background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                      background: '#4f46e5',
                      border: '2px solid #e0e7ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: '#ffffff'
                    }}>
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 15, color: '#0f172a',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginTop: 1 }}>
                        {roleLabels[role]}
                      </div>
                    </div>
                    <button onClick={() => setProfileOpen(false)}
                      style={{
                        marginLeft: 'auto', background: '#e2e8f0',
                        border: 'none', borderRadius: 8, color: '#64748b',
                        width: 26, height: 26, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                      }}>
                      <MdClose size={15} />
                    </button>
                  </div>

                  {/* Profile details */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {user?.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 6, borderRadius: 8, background: '#eef2ff', color: '#4f46e5', display: 'flex', flexShrink: 0 }}>
                          <MdEmail size={16} />
                        </div>
                        <div>
                          <div style={{
                            fontSize: 10, color: '#94a3b8', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>Email</div>
                          <div style={{
                            fontSize: 13, color: '#0f172a', fontWeight: 600,
                            wordBreak: 'break-all'
                          }}>{user.email}</div>
                        </div>
                      </div>
                    )}
                    {user?.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 6, borderRadius: 8, background: '#eef2ff', color: '#4f46e5', display: 'flex', flexShrink: 0 }}>
                          <MdPhone size={16} />
                        </div>
                        <div>
                          <div style={{
                            fontSize: 10, color: '#94a3b8', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>Phone</div>
                          <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                            {user.phone}
                          </div>
                        </div>
                      </div>
                    )}
                    {school?.name && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 6, borderRadius: 8, background: '#eef2ff', color: '#4f46e5', display: 'flex', flexShrink: 0 }}>
                          <MdBusiness size={16} />
                        </div>
                        <div>
                          <div style={{
                            fontSize: 10, color: '#94a3b8', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>School</div>
                          <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                            {school.name}
                          </div>
                        </div>
                      </div>
                    )}
                    {user?.role && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 6, borderRadius: 8, background: '#eef2ff', color: '#4f46e5', display: 'flex', flexShrink: 0 }}>
                          <MdPerson size={16} />
                        </div>
                        <div>
                          <div style={{
                            fontSize: 10, color: '#94a3b8', fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.5px'
                          }}>Role</div>
                          <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
                            {roleLabels[role]}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Divider + Logout */}
                  <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 16px', background: '#fafafa' }}>
                    <button onClick={handleLogout} style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '10px 14px', borderRadius: 10, border: '1px solid #fecdd3',
                      background: '#fff1f2', color: '#e11d48',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.15s'
                    }}>
                      <MdLogout size={16} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="erp-main-content" style={{ flex: 1, overflowY: 'auto', padding: '28px', background: 'var(--page-bg)' }}>
          <Outlet />
          {(role === 'student' || role === 'teacher') && (
            <div className="h-28 w-full shrink-0 md:hidden pointer-events-none" aria-hidden="true" />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation for Students and Teachers */}
      <MobileBottomNav role={role} />

      {/* Library due-date popup — renders only for students with overdue/due-soon books */}
      <LibraryDueAlert />
    </div>
  );
};

export default DashboardLayout;
