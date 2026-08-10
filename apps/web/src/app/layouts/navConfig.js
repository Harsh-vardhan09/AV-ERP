import {
  MdDashboard,
  MdAssignment,
  MdPersonAdd,
  MdClass,
  MdSubject,
  MdPeople,
  MdGrading,
  MdCalendarMonth,
  MdCheckCircle,
  MdDescription,
  MdNotifications,
  MdPrint,
  MdOutlineSettings,
  MdUploadFile,
  MdBook,
  MdReport,
  MdSettings,
  MdBarChart,
  MdArticle,
  MdBadge,
  MdEdit,
  MdDeleteOutline,
  MdBlock,
  MdExitToApp,
  MdUpgrade,
  MdFeed,
  MdGridView,
} from 'react-icons/md';
import { FaChalkboardTeacher, FaUserGraduate, FaCalendarCheck } from 'react-icons/fa';

/**
 * The nav tree as data. Entries are rendered in array order.
 *
 *   link  { to, icon, size, label, module?, end? }
 *   group { group, label, icon, size, storageKey, defaultOpen, items }
 *
 * `module` is a key from packages/shared/modules.js. Sidebar hides an entry
 * when the school has that module switched off. Only the entries that were
 * already hidden carry a key — see docs, the old filter matched on URL
 * substrings and covered five of the thirteen registry keys.
 */

const STUDENTS_GROUP = {
  group: 'students',
  label: 'Students',
  icon: FaUserGraduate,
  storageKey: 'erp.sidebar.students.open',
  defaultOpen: true,
  items: [
    { to: '/admin/students/all', icon: MdPeople, label: 'All Students' },
    { to: '/admin/students/bulk-edit', icon: MdEdit, label: 'Students Bulk Edit' },
    { to: '/admin/students/deleted', icon: MdDeleteOutline, label: 'Deleted Students' },
    { to: '/admin/students/passed', icon: FaUserGraduate, label: 'Passed Students' },
    { to: '/admin/students/dropped', icon: MdExitToApp, label: 'Dropped Students' },
    { to: '/admin/students/suspended', icon: MdBlock, label: 'Suspended Students' },
    { to: '/admin/students/promotion', icon: MdUpgrade, label: 'Migration / Promotion' },
    { to: '/admin/bulk-import', icon: MdUploadFile, label: '📥 Bulk Import', module: 'imports' },
  ],
};

const admissionFormsGroup = (prefix) => ({
  group: 'admissionForms',
  label: 'Admission Forms',
  module: 'admissions',
  icon: MdFeed,
  storageKey: 'erp.sidebar.admissionforms.open',
  defaultOpen: true,
  items: [
    { to: `${prefix}/admission-forms/print`, icon: MdPrint, label: 'Print Admission Form' },
    {
      to: `${prefix}/admission-forms/settings`,
      icon: MdOutlineSettings,
      label: 'Admission Form Settings',
    },
    { to: `${prefix}/admission/templates`, icon: MdUploadFile, label: 'Admission Templates' },
  ],
});

const TEACHERS_GROUP = {
  group: 'teachers',
  label: 'Teachers',
  icon: FaChalkboardTeacher,
  storageKey: 'erp.sidebar.teachers.open',
  defaultOpen: true,
  items: [
    { to: '/admin/teachers/all', icon: FaChalkboardTeacher, label: 'All Teachers' },
    { to: '/admin/teachers/deleted', icon: MdDeleteOutline, label: 'Deleted Teachers' },
  ],
};

const ID_CARDS_GROUP = {
  group: 'idCards',
  label: 'ID Cards',
  icon: MdBadge,
  storageKey: 'erp.sidebar.idcards.open',
  defaultOpen: true,
  items: [
    { to: '/admin/id-cards/students', icon: MdBadge, label: 'Student ID Cards' },
    { to: '/admin/id-cards/teachers', icon: MdBadge, label: 'Teacher ID Cards' },
  ],
};

// retired: custom_forms — re-add when modules.json marks it available
// retired: library — re-add when modules.json marks it available
// retired: payroll — re-add when modules.json marks it available
// The CUSTOM_FORMS_GROUP, LIBRARY_GROUP and PAYROLL_GROUP definitions were
// removed with their nav entries; git has them.

export const navConfig = {
  admin: [
    { to: '/admin/dashboard', icon: MdDashboard, size: 20, label: 'Dashboard' },
    STUDENTS_GROUP,
    admissionFormsGroup('/admin'),
    TEACHERS_GROUP,
    ID_CARDS_GROUP,
    // retired: custom_forms, library, payroll — re-add when available
    { to: '/admin/sessions', icon: MdCalendarMonth, size: 20, label: 'Sessions' },
    { to: '/admin/classes', icon: MdClass, size: 20, label: 'Classes & Sections' },
    { to: '/admin/subjects', icon: MdSubject, size: 20, label: 'Subjects' },
    {
      to: '/admission/register-teacher',
      icon: MdPersonAdd,
      size: 20,
      label: 'Register Teacher',
      module: 'admissions',
    },
    {
      to: '/admin/teacher-assignment',
      icon: FaChalkboardTeacher,
      size: 20,
      label: 'Teacher Assignment',
    },
    { to: '/admin/exams', icon: MdGrading, size: 20, label: 'Exams' },
    { to: '/admin/marks-audit-log', icon: MdBarChart, size: 20, label: 'Marks Audit Log' },
    {
      to: '/admin/teacher-leaves',
      icon: MdCheckCircle,
      size: 20,
      label: 'Teacher Leaves',
      module: 'communication',
    },
    {
      to: '/admin/notices',
      icon: MdNotifications,
      size: 20,
      label: 'Notices',
      module: 'communication',
    },
    {
      to: '/admin/complaints',
      icon: MdReport,
      size: 20,
      label: 'Grievances',
      module: 'communication',
    },
    { to: '/admin/staff', icon: MdBadge, size: 20, label: 'Staff Management' },
    // retired: biometric, fee_management — re-add when available
    // The legacy "Report Cards" generator is retired: it used the pre-template
    // renderer. Template Report Cards is the single generator, Report Card
    // Templates is where the layout is chosen.
    {
      to: '/admin/template-report-cards',
      icon: MdGridView,
      size: 20,
      label: 'Report Cards',
      module: 'report_cards',
    },
    {
      to: '/admin/templates',
      icon: MdUploadFile,
      size: 20,
      label: 'Report Card Templates',
      module: 'report_cards',
    },
    {
      to: '/admin/documents',
      icon: MdArticle,
      size: 20,
      label: 'Documents (TC / Migration)',
      module: 'documents',
    },
    // retired: oases — re-add when available
    { to: '/admin/settings', icon: MdSettings, size: 20, label: 'School Settings' },
  ],

  teacher: [
    { to: '/teacher/dashboard', icon: MdDashboard, size: 18, label: 'Dashboard' },
    { to: '/teacher/attendance', icon: FaCalendarCheck, size: 18, label: 'Take Attendance' },
    {
      to: '/teacher/assignments',
      icon: MdAssignment,
      size: 18,
      label: 'Assignments',
      module: 'assignments',
    },
    { to: '/teacher/marks', icon: MdUploadFile, size: 18, label: 'Upload Marks' },
    { to: '/teacher/tests', icon: MdGrading, size: 18, label: 'My Tests' },
    {
      to: '/teacher/materials',
      icon: MdBook,
      size: 18,
      label: 'Knowledge Center',
      module: 'communication',
    },
    {
      to: '/teacher/notices',
      icon: MdNotifications,
      size: 18,
      label: 'Notices',
      module: 'communication',
    },
    {
      to: '/teacher/leave',
      icon: MdDescription,
      size: 18,
      label: 'My Leave',
      module: 'communication',
    },
    {
      to: '/teacher/student-leaves',
      icon: MdCheckCircle,
      size: 18,
      label: 'Student Leaves',
      module: 'communication',
    },
    // Hidden unless the teacher is a class teacher — see Sidebar.
    {
      to: '/teacher/my-students',
      icon: FaUserGraduate,
      size: 18,
      label: 'My Students',
      classTeacherOnly: true,
    },
    { to: '/teacher/co-scholastic', icon: MdGrading, size: 18, label: 'Co-Scholastic Marks' },
    {
      to: '/teacher/report-cards',
      icon: MdDescription,
      size: 18,
      label: 'Report Cards',
      module: 'report_cards',
    },
    // retired: oases, payroll — re-add when available
  ],

  student: [
    { to: '/student/dashboard', icon: MdDashboard, size: 18, label: 'Dashboard' },
    { to: '/student/attendance', icon: FaCalendarCheck, size: 18, label: 'Attendance' },
    {
      to: '/student/assignments',
      icon: MdAssignment,
      size: 18,
      label: 'Assignments',
      module: 'assignments',
    },
    { to: '/student/marks', icon: MdBarChart, size: 18, label: 'Marks & Results' },
    {
      to: '/student/leave',
      icon: MdDescription,
      size: 18,
      label: 'Apply Leave',
      module: 'communication',
    },
    {
      to: '/student/materials',
      icon: MdBook,
      size: 18,
      label: 'Knowledge Center',
      module: 'communication',
    },
    // retired: library — re-add when available
    {
      to: '/student/notices',
      icon: MdNotifications,
      size: 18,
      label: 'Notices',
      module: 'communication',
    },
    {
      to: '/student/complaints',
      icon: MdReport,
      size: 18,
      label: 'Complaints',
      module: 'communication',
    },
    // retired: fee_management — re-add when available
    {
      to: '/student/report-card',
      icon: MdDescription,
      size: 18,
      label: 'Report Card',
      module: 'report_cards',
    },
  ],

  admission: [
    {
      to: '/admission/dashboard',
      icon: MdDashboard,
      size: 18,
      label: 'Dashboard',
      module: 'admissions',
    },
    admissionFormsGroup('/admission'),
    {
      to: '/admission/register-student',
      icon: MdPersonAdd,
      size: 18,
      label: 'Register Student',
      module: 'admissions',
    },
    {
      to: '/admission/register-teacher',
      icon: FaChalkboardTeacher,
      size: 18,
      label: 'Register Teacher',
      module: 'admissions',
    },
    {
      to: '/admission/students',
      icon: FaUserGraduate,
      size: 18,
      label: 'All Students',
      module: 'admissions',
    },
    {
      to: '/admission/teachers',
      icon: MdPeople,
      size: 18,
      label: 'All Teachers',
      module: 'admissions',
    },
    {
      to: '/admin/bulk-import',
      icon: MdUploadFile,
      size: 18,
      label: '📥 Bulk Import',
      module: 'imports',
    },
  ],

  // Both of these roles existed only to run retired modules, so every entry is
  // gone and the nav is empty. See the report — their landing pages are dead too.
  // retired: fee_management, payroll — re-add when available
  accounts: [],

  // retired: library — re-add when available
  librarian: [],

  exam_controller: [
    { to: '/exam-controller/dashboard', icon: MdDashboard, size: 20, label: 'Dashboard' },
    { to: '/exam-controller/marks', icon: MdUploadFile, size: 20, label: 'Manage Marks' },
    { to: '/exam-controller/audit-log', icon: MdBarChart, size: 20, label: 'Marks Audit Log' },
    { to: '/exam-controller/exams', icon: MdGrading, size: 20, label: 'All Exams' },
  ],
};

export const roleLabels = {
  admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
  admission: 'Admission Dept',
  accounts: 'Accounts Dept',
  librarian: 'Librarian',
  exam_controller: 'Exam Department',
};
