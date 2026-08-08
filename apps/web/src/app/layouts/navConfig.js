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
  MdOutlineAutoStories,
  MdPrint,
  MdOutlineSettings,
  MdUploadFile,
  MdBook,
  MdReport,
  MdSettings,
  MdBarChart,
  MdAttachMoney,
  MdArticle,
  MdBadge,
  MdEdit,
  MdDeleteOutline,
  MdBlock,
  MdExitToApp,
  MdUpgrade,
  MdFeed,
  MdGridView,
  MdLibraryBooks,
  MdPayments,
  MdAccountBalance,
  MdReceipt,
} from 'react-icons/md';
import { FaChalkboardTeacher, FaUserGraduate, FaCalendarCheck, FaCreditCard } from 'react-icons/fa';

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
    { to: '/admin/bulk-import', icon: MdUploadFile, label: '📥 Bulk Import' },
  ],
};

const admissionFormsGroup = (prefix) => ({
  group: 'admissionForms',
  label: 'Admission Forms',
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

const CUSTOM_FORMS_GROUP = {
  group: 'customForms',
  label: 'Custom Forms',
  icon: MdArticle,
  storageKey: 'erp.sidebar.customforms.open',
  defaultOpen: true,
  items: [
    { to: '/admin/custom-forms', icon: MdArticle, label: 'All Forms', end: true },
    { to: '/admin/custom-forms/create', icon: MdPersonAdd, label: 'Create New Form' },
  ],
};

const LIBRARY_GROUP = {
  group: 'library',
  label: 'Library',
  icon: MdLibraryBooks,
  storageKey: 'erp.sidebar.library.open',
  defaultOpen: false,
  items: [
    { to: '/admin/library/dashboard', icon: MdDashboard, label: 'Library Dashboard' },
    { to: '/admin/library/books', icon: MdLibraryBooks, label: 'Manage Books' },
    { to: '/admin/library/issue', icon: MdBook, label: 'Issue Book' },
    { to: '/admin/library/return', icon: MdCheckCircle, label: 'Return Book' },
    { to: '/admin/library/issued', icon: MdDescription, label: 'All Issues' },
    { to: '/admin/library/overdue', icon: MdReport, label: 'Overdue Books' },
    { to: '/admin/library/librarians', icon: MdPeople, label: 'Manage Librarians' },
  ],
};

const PAYROLL_GROUP = {
  group: 'payroll',
  label: 'Payroll',
  icon: MdAttachMoney,
  storageKey: 'erp.sidebar.payroll.open',
  defaultOpen: false,
  items: [
    { to: '/admin/payroll/dashboard', icon: MdAttachMoney, label: 'Payroll Dashboard' },
    { to: '/admin/payroll/runs', icon: MdPayments, label: 'Payroll Runs' },
    { to: '/admin/payroll/employee-salaries', icon: MdPeople, label: 'Employee Salaries' },
    { to: '/admin/payroll/structures', icon: MdDescription, label: 'Salary Structures' },
    { to: '/admin/payroll/components', icon: MdDescription, label: 'Salary Components' },
    { to: '/admin/payroll/tax-config', icon: MdOutlineSettings, label: 'Tax Config' },
    { to: '/admin/payroll/attendance', icon: FaCalendarCheck, label: 'Staff Attendance' },
    { to: '/admin/payroll/payslips', icon: MdReceipt, label: 'Payslips' },
    { to: '/admin/payroll/payment-batches', icon: MdAccountBalance, label: 'Payment Batches' },
    { to: '/admin/payroll/reports', icon: MdBarChart, label: 'Reports' },
  ],
};

export const navConfig = {
  admin: [
    { to: '/admin/dashboard', icon: MdDashboard, size: 20, label: 'Dashboard' },
    STUDENTS_GROUP,
    admissionFormsGroup('/admin'),
    TEACHERS_GROUP,
    ID_CARDS_GROUP,
    CUSTOM_FORMS_GROUP,
    LIBRARY_GROUP,
    PAYROLL_GROUP,
    { to: '/admin/sessions', icon: MdCalendarMonth, size: 20, label: 'Sessions' },
    { to: '/admin/classes', icon: MdClass, size: 20, label: 'Classes & Sections' },
    { to: '/admin/subjects', icon: MdSubject, size: 20, label: 'Subjects' },
    { to: '/admission/register-teacher', icon: MdPersonAdd, size: 20, label: 'Register Teacher' },
    {
      to: '/admin/teacher-assignment',
      icon: FaChalkboardTeacher,
      size: 20,
      label: 'Teacher Assignment',
    },
    { to: '/admin/exams', icon: MdGrading, size: 20, label: 'Exams' },
    { to: '/admin/marks-audit-log', icon: MdBarChart, size: 20, label: 'Marks Audit Log' },
    { to: '/admin/teacher-leaves', icon: MdCheckCircle, size: 20, label: 'Teacher Leaves' },
    { to: '/admin/staff', icon: MdBadge, size: 20, label: 'Staff Management' },
    {
      to: '/admin/biometric/devices',
      icon: MdCheckCircle,
      size: 20,
      label: 'Biometric Devices',
      module: 'biometric',
    },
    {
      to: '/admin/biometric/attendance',
      icon: FaCalendarCheck,
      size: 20,
      label: 'Faculty Attendance',
      module: 'biometric',
    },
    {
      to: '/admin/fee',
      icon: MdAttachMoney,
      size: 20,
      label: 'Fee Management',
      module: 'fee_management',
    },
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
    {
      to: '/admin/oases',
      icon: MdOutlineAutoStories,
      size: 20,
      label: 'OASES – Evaluation',
      module: 'oases',
    },
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
    { to: '/teacher/materials', icon: MdBook, size: 18, label: 'Knowledge Center' },
    { to: '/teacher/leave', icon: MdDescription, size: 18, label: 'My Leave' },
    { to: '/teacher/student-leaves', icon: MdCheckCircle, size: 18, label: 'Student Leaves' },
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
    {
      to: '/teacher/oases',
      icon: MdOutlineAutoStories,
      size: 18,
      label: 'OASES – My Copies',
      module: 'oases',
    },
    { to: '/teacher/payroll/my-payslips', icon: MdReceipt, size: 18, label: 'My Payslips' },
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
    { to: '/student/leave', icon: MdDescription, size: 18, label: 'Apply Leave' },
    { to: '/student/materials', icon: MdBook, size: 18, label: 'Knowledge Center' },
    { to: '/student/library', icon: MdLibraryBooks, size: 18, label: 'Library' },
    { to: '/student/notices', icon: MdNotifications, size: 18, label: 'Notices' },
    { to: '/student/complaints', icon: MdReport, size: 18, label: 'Complaints' },
    {
      to: '/student/fees',
      icon: FaCreditCard,
      size: 18,
      label: 'My Fees',
      module: 'fee_management',
    },
    // No module key: the old filter tested for '/report-cards' and this path is
    // '/report-card', so report_cards=false never hid it.
    { to: '/student/report-card', icon: MdDescription, size: 18, label: 'Report Card' },
  ],

  admission: [
    { to: '/admission/dashboard', icon: MdDashboard, size: 18, label: 'Dashboard' },
    admissionFormsGroup('/admission'),
    { to: '/admission/register-student', icon: MdPersonAdd, size: 18, label: 'Register Student' },
    {
      to: '/admission/register-teacher',
      icon: FaChalkboardTeacher,
      size: 18,
      label: 'Register Teacher',
    },
    { to: '/admission/students', icon: FaUserGraduate, size: 18, label: 'All Students' },
    { to: '/admission/teachers', icon: MdPeople, size: 18, label: 'All Teachers' },
    { to: '/admin/bulk-import', icon: MdUploadFile, size: 18, label: '📥 Bulk Import' },
  ],

  accounts: [
    {
      to: '/accounts/fee/students',
      icon: FaUserGraduate,
      size: 18,
      label: 'Student Fees',
      module: 'fee_management',
    },
    {
      to: '/accounts/fee/collect',
      icon: FaCreditCard,
      size: 18,
      label: 'Collect Payment',
      module: 'fee_management',
    },
    {
      to: '/accounts/payroll/dashboard',
      icon: MdAttachMoney,
      size: 18,
      label: 'Payroll Dashboard',
    },
    { to: '/accounts/payroll/runs', icon: MdPayments, size: 18, label: 'Payroll Runs' },
    { to: '/accounts/payroll/payslips', icon: MdReceipt, size: 18, label: 'Payslips' },
    {
      to: '/accounts/payroll/payment-batches',
      icon: MdAccountBalance,
      size: 18,
      label: 'Payment Batches',
    },
    { to: '/accounts/payroll/reports', icon: MdBarChart, size: 18, label: 'Payroll Reports' },
  ],

  librarian: [
    { to: '/librarian/dashboard', icon: MdDashboard, size: 20, label: 'Dashboard' },
    { to: '/librarian/books', icon: MdLibraryBooks, size: 20, label: 'Manage Books' },
    { to: '/librarian/issue', icon: MdBook, size: 20, label: 'Issue Book' },
    { to: '/librarian/return', icon: MdCheckCircle, size: 20, label: 'Return Book' },
    { to: '/librarian/issued', icon: MdDescription, size: 20, label: 'All Issues' },
    { to: '/librarian/overdue', icon: MdReport, size: 20, label: 'Overdue Books' },
  ],

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
