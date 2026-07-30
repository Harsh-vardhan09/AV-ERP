import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useCheak_authQuery } from './redux/api/userApi';
import { useGetSchoolSettingsQuery } from './redux/api/admissionApi';
import { useDispatch, useSelector } from 'react-redux';
import { setOasesEnabled, resetOasesState } from './redux/slices/oasesSettingsSlice';
import { setModules } from './redux/slices/moduleSettingsSlice';
import { incrementUnreadCount, setLatestNotification } from './redux/slices/notificationSlice';
import { io } from 'socket.io-client';
import Sidebar from './pages/Sidebar';
import Loader from './components/Loader';
import ShimmerUi from './pages/shimmerui';
import { useCheckSuperAdminAuthQuery } from './redux/api/superAdminApi';
import { setSuperAdmin } from './redux/slices/superAdminSlice';
import { useServerHealth } from './hooks/useServerHealth';
import ServiceUnavailable from './pages/ServiceUnavailable';

// ===== NEW: DashboardLayout and role-based pages =====
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));

// ===== Super Admin (Phase 1 + Phase 2) =====
const SuperAdminLogin = lazy(() => import('./pages/superadmin/SuperAdminLogin'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const SuperAdminSchools = lazy(() => import('./pages/superadmin/SuperAdminSchools'));
const SuperAdminLayout = lazy(() => import('./components/SuperAdminLayout'));
const SchoolModules = lazy(() => import('./pages/superadmin/SchoolModules'));
const SchoolStaffAdmin = lazy(() => import('./pages/superadmin/SchoolStaffAdmin'));
const SuperAdminTemplateManager = lazy(() => import('./pages/superadmin/SuperAdminTemplateManager'));
const SuperAdminAdmissionTemplateManager = lazy(() => import('./pages/superadmin/SuperAdminAdmissionTemplateManager'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const SessionManager = lazy(() => import('./pages/admin/SessionManager'));
const ClassManager = lazy(() => import('./pages/admin/ClassManager'));
const SubjectManager = lazy(() => import('./pages/admin/SubjectManager'));
const TeacherAssignmentPage = lazy(() => import('./pages/admin/TeacherAssignmentPage'));
const ExamManager = lazy(() => import('./pages/admin/ExamManager'));
const MarksAuditLog = lazy(() => import('./pages/admin/MarksAuditLog'));
const SchoolSettingsPage = lazy(() => import('./pages/admin/SchoolSettingsPage'));
const TeacherLeaveManager = lazy(() => import('./pages/admin/UserManager'));
const StaffManager = lazy(() => import('./pages/admin/StaffManager'));
const BiometricDeviceManagement = lazy(() => import('./pages/fringerprint'));
const FacultyAttendance = lazy(() => import('./pages/FacultyAttendance'));

// Teacher pages (new)
const TeacherDashboardNew = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TakeAttendanceNew = lazy(() => import('./pages/teacher/TakeAttendance'));
const TeacherLeave = lazy(() => import('./pages/teacher/TeacherLeave'));
const StudentLeaveApproval = lazy(() => import('./pages/teacher/StudentLeaveApproval'));
const UploadMarks = lazy(() => import('./pages/teacher/UploadMarks'));
const TeacherTestCreate = lazy(() => import('./pages/teacher/TeacherTestCreate'));
const TeacherAssignments = lazy(() => import('./pages/teacher/TeacherAssignments'));
const TeacherKnowledgeCenter = lazy(() => import('./pages/teacher/TeacherKnowledgeCenter'));
const AdminKnowledgeCenter = lazy(() => import('./pages/admin/AdminKnowledgeCenter'));
const AdminStudentDirectory = lazy(() => import('./pages/admin/AdminStudentDirectory'));
const AdminStudentDetail = lazy(() => import('./pages/admin/AdminStudentDetail'));
const AdminTeacherDirectory = lazy(() => import('./pages/admin/AdminTeacherDirectory'));
const AdminTeacherDetail = lazy(() => import('./pages/admin/AdminTeacherDetail'));
const AdminClassDirectory = lazy(() => import('./pages/admin/AdminClassDirectory'));
const AdminSubjectDirectory = lazy(() => import('./pages/admin/AdminSubjectDirectory'));
// ── Student Management — 7 sub-features ──
const AllStudents = lazy(() => import('./pages/admin/students/AllStudents'));
const StudentsBulkEdit = lazy(() => import('./pages/admin/students/StudentsBulkEdit'));
const DeletedStudents = lazy(() => import('./pages/admin/students/DeletedStudents'));
const PassedStudents = lazy(() => import('./pages/admin/students/PassedStudents'));
const DroppedStudents = lazy(() => import('./pages/admin/students/DroppedStudents'));
const SuspendedStudents = lazy(() => import('./pages/admin/students/SuspendedStudents'));
const MigrationPromotion = lazy(() => import('./pages/admin/students/MigrationPromotion'));
const EditStudentPage = lazy(() => import('./pages/admin/students/EditStudentPage'));
const BulkImport = lazy(() => import('./pages/admin/BulkImport')); // 📥 Bulk Import
// ── Teacher Management ──
const AllTeachers = lazy(() => import('./pages/admin/teachers/AllTeachers'));
const DeletedTeachers = lazy(() => import('./pages/admin/teachers/DeletedTeachers'));
const EditTeacherPage = lazy(() => import('./pages/admin/teachers/EditTeacherPage'));
// ── ID Cards module ──
const StudentIdCard = lazy(() => import('./pages/admin/idCards/StudentIdCard'));
const TeacherIdCard = lazy(() => import('./pages/admin/idCards/TeacherIdCard'));
// ── Custom Forms module ──
const AllForms = lazy(() => import('./pages/admin/customForms/AllForms'));
const CreateForm = lazy(() => import('./pages/admin/customForms/CreateForm'));
const EditForm = lazy(() => import('./pages/admin/customForms/EditForm'));
const DeletedForms = lazy(() => import('./pages/admin/customForms/DeletedForms'));
const FormLeads = lazy(() => import('./pages/admin/customForms/FormLeads'));
const FeeModuleHub = lazy(() => import('./pages/fee/FeeModuleHub'));
const PayrollModuleHub = lazy(() => import('./pages/PayrollModuleHub')); // 💰 Payroll Module
const ReportCardManager = lazy(() => import('./pages/reportcard/ReportCardManager'));
const ReportCardEditor = lazy(() => import('./pages/reportcard/ReportCardEditor'));
// —— Dynamic Report Card System ——
const DynamicReportManager = lazy(() => import('./pages/reportcard/DynamicReportManager'));
const TemplateManager = lazy(() => import('./pages/reportcard/TemplateManager'));
const TemplateEditor = lazy(() => import('./pages/reportcard/TemplateEditor'));
const TemplateReportCard = lazy(() => import('./pages/reportcard/TemplateReportCard'));
const DocumentHub = lazy(() => import('./pages/documents/DocumentHub'));
const DocumentStudentList = lazy(() => import('./pages/documents/DocumentStudentList'));
const TransferCertificatePage = lazy(() => import('./pages/documents/TransferCertificatePage'));
const MigrationCertificatePage = lazy(() => import('./pages/documents/MigrationCertificatePage'));
const OasesModuleHub = lazy(() => import('./pages/oases/OasesModuleHub')); // OASES module
const TemplateConfigPage = lazy(() => import('./pages/documents/TemplateConfigPage'));
const NewDocumentForm = lazy(() => import('./pages/documents/NewDocumentForm'));
const CertificatePreview = lazy(() => import('./pages/documents/CertificatePreview'));
// ── Admission Forms module ──
const PrintAdmissionForm = lazy(() => import('./pages/admin/admissionForms/PrintAdmissionForm'));
const AdmissionFormSettings = lazy(() => import('./pages/admin/admissionForms/AdmissionFormSettings'));
const PrintPreview = lazy(() => import('./pages/admin/admissionForms/PrintPreview'));
const AdmissionTemplateManager = lazy(() => import('./pages/admin/admissionForms/AdmissionTemplateManager'));
const AdmissionTemplatePreview = lazy(() => import('./pages/admin/admissionForms/AdmissionTemplatePreview'));

// ── Library Management System ──
const LibraryDashboard  = lazy(() => import('./pages/library/LibraryDashboard'));
const ManageBooks       = lazy(() => import('./pages/library/ManageBooks'));
const IssueBook         = lazy(() => import('./pages/library/IssueBook'));
const ReturnBook        = lazy(() => import('./pages/library/ReturnBook'));
const IssuedBooks       = lazy(() => import('./pages/library/IssuedBooks'));
const OverdueBooks      = lazy(() => import('./pages/library/OverdueBooks'));
const ManageLibrarians  = lazy(() => import('./pages/library/ManageLibrarians'));
const StudentLibrary    = lazy(() => import('./pages/student/StudentLibrary'));

// ── Exam Controller Module (MARKS_ALL_ACCESS) ──
const ECDashboard       = lazy(() => import('./pages/examController/ECDashboard'));
const ECMarksManagement = lazy(() => import('./pages/examController/ECMarksManagement'));
const ECAuditLog        = lazy(() => import('./pages/examController/ECAuditLog'));
const ECAllExams        = lazy(() => import('./pages/examController/ECAllExams'));

// Student pages (new)
const StudentDashboardNew = lazy(() => import('./pages/student/StudentDashboard'));
const StudentAttendanceNew = lazy(() => import('./pages/student/StudentAttendance'));
const StudentLeave = lazy(() => import('./pages/student/StudentLeave'));
const StudentMarks = lazy(() => import('./pages/student/StudentMarks'));
const StudentFees = lazy(() => import('./pages/student/StudentFees'));

// Admission pages
const AdmissionDashboard = lazy(() => import('./pages/admission/AdmissionDashboard'));
const RegisterStudent = lazy(() => import('./pages/admission/RegisterStudent'));
const RegisterTeacher = lazy(() => import('./pages/admission/RegisterTeacher'));
const StudentListPage = lazy(() => import('./pages/admission/StudentList'));
const TeacherListPage = lazy(() => import('./pages/admission/TeacherList'));
const AdmissionStudentDetail = lazy(() => import('./pages/admission/AdmissionStudentDetail'));
const AdmissionTeacherDetail = lazy(() => import('./pages/admission/AdmissionTeacherDetail'));

// ===== EXISTING: Lazy loaded components =====
const HomePage = lazy(() => import('./pages/Homepage'));
const Registration = lazy(() => import('./pages/Registration'));
const NewLogin = lazy(() => import('./pages/Loginpage'));
const OTPVerification = lazy(() => import('./pages/Otppage'));
const ForgotPassword = lazy(() => import('./pages/Resetpass'));
const ChangePassword = lazy(() => import('./pages/Changepassword'));
const ForcePasswordChange = lazy(() => import('./pages/ForcePasswordChange'));
const Dashboard = lazy(() => import('./pages/Deshboard'));
const TeacherAnalyticsDashboard = lazy(() => import('./pages/DeshboardTeacher.jsx'));
const TimeTable = lazy(() => import('./pages/timetable'));
const TeacherAssign = lazy(() => import('./pages/TeacherAssign'));
const UploadedFiles = lazy(() => import('./pages/UploadedFiles'));
const Eventpage = lazy(() => import('./pages/Eventpage'));
const Teachersassignment = lazy(() => import('./pages/teachersassignment'));
const KnowlegedgeCenter = lazy(() => import('./pages/Knowledgecenter'));
const Knowledgeadmin = lazy(() => import('./pages/knowlegeadmin'));
const AttendanceApp = lazy(() => import('./pages/Signal'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const Roadmapshow = lazy(() => import('./pages/Roadmapshow'));
const Finance = lazy(() => import('./pages/finance.jsx'));
const Finaceentry = lazy(() => import('./pages/financeentry.jsx'));
const FeeManagement = lazy(() => import('./pages/feepage.jsx'));
const StudentRegistration = lazy(() => import('./pages/Registration.jsx'));
const StudentManagementDashboard = lazy(() => import('./pages/Students_data.jsx'));
const TeacherMyStudents = lazy(() => import('./pages/teacher/TeacherMyStudents'));
const CoScholasticMarks = lazy(() => import('./pages/teacher/CoScholasticMarks'));
// Phase 1 — Notification System
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
// Phase 3 — Notification Preferences + Admin Control Panel
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const NotificationAdmin = lazy(() => import('./pages/admin/NotificationAdmin'));

// Student components
const AssignmentPage = lazy(() => import('./components/students/assignments/Assignmentpage'));
const AssignmentsDetails = lazy(() => import('./components/students/assignments/AssignmentsDetails'));
const SubmissionPage = lazy(() => import('./components/students/assignments/SubmissionPage'));
const AttendancePage = lazy(() => import('./components/students/attendance/index'));
const ShowSingle = lazy(() => import("./components/students/events/ShowSingle"));
const AddEventForm = lazy(() => import('./components/students/events/AddEventForm'));
const Application = lazy(() => import('./components/students/Leave/Application'));
const Noticebox = lazy(() => import("./components/students/news/Noticebox"));
const Notice = lazy(() => import("./components/students/news/Notice"));
const Noticeapprove = lazy(() => import("./components/students/news/Noticeapprove"));
const Noticeopen = lazy(() => import("./components/students/news/Noticeopen"));
const Allnoticepage = lazy(() => import('./components/students/news/Allnoticepage'));
const Eventform = lazy(() => import('./components/students/events/eventform'));
const GroupEventForm = lazy(() => import('./components/students/events/groupEventform'));
const EventMember = lazy(() => import('./components/students/events/eventmember'));
const ComplaintBox = lazy(() => import('./components/students/Complain-Box/complainBox'));
const ComplaintForm = lazy(() => import('./components/students/Complain-Box/complainForm'));
const ComplaintNext = lazy(() => import('./components/students/Complain-Box/complainNext'));
const Request = lazy(() => import('./components/students/Complain-Box/request'));

// Admin components
const TakeAttendance = lazy(() => import('./components/admin/attendance/TakeAttendance'));
const AdminTt = lazy(() => import('./components/admin/adminTt'));
const PDFViewer = lazy(() => import('./components/admin/Leave/PDFViewer'));
const LeaveSection = lazy(() => import("./components/admin/Leave/LeavesSection"));
const Kahoot = lazy(() => import('./components/admin/kahoot/kahootTeam.jsx'));
const Kahootwinners = lazy(() => import('./components/admin/kahoot/kahootwinners.jsx'));
const Kahootscore = lazy(() => import('./components/admin/kahoot/kahootScore.jsx'));
const Kahootquize = lazy(() => import('./components/admin/kahoot/kahootQueeze.jsx'));
const KahootWaitMember = lazy(() => import('./components/admin/kahoot/kahootWaiting.jsx'));
const ChatApp = lazy(() => import('./components/Chat/ChatApp'));

// Role definitions
const ROLES = { STUDENT: 'student', TEACHER: 'teacher', ADMIN: 'admin', ADMISSION: 'admission', ACCOUNTS: 'accounts', LIBRARIAN: 'librarian', EXAM_CONTROLLER: 'exam_controller' };
const allRoles = [ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN, ROLES.ADMISSION, ROLES.ACCOUNTS, ROLES.LIBRARIAN, ROLES.EXAM_CONTROLLER];
const bothRoles = [ROLES.STUDENT, ROLES.TEACHER];

// Role-based home redirect
const roleHomePaths = {
  admin: '/admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  admission: '/admission/dashboard',
  accounts: '/accounts/fee/students',
  librarian: '/librarian/dashboard',
  exam_controller: '/exam-controller/dashboard',
};

// ProtectedRoute Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useCheak_authQuery();

  if (isLoading) return <ShimmerUi />;

  const role = data?.user?.role;

  if (!data) {
    navigate('/login', { replace: true });
    return null;
  }

  // If user has not yet changed their temporary password, redirect to the
  // force-change page regardless of which route they tried to access.
  if (data?.user?.mustChangePassword &&
    !window.location.pathname.includes('/change-password')) {
    navigate('/change-password', { replace: true });
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to their own dashboard instead of login
    const home = roleHomePaths[role] || '/login';
    navigate(home, { replace: true });
    return null;
  }

  return children;
};

// PublicRoute Component  
const PublicRoute = ({ children }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useCheak_authQuery();
  const user = useSelector(state => state?.user?.user?.user);

  if (isLoading) return <Loader />;

  if (data?.success) {
    // Normal ERP redirect by role (OASES is now a module INSIDE ERP — no separate redirect)
    const role = data?.user?.role || user?.role;
    const home = roleHomePaths[role] || '/';
    navigate(home, { replace: true });
    return null;
  }

  return children;
};

// Home redirect component
const HomeRedirect = () => {
  const { data, isLoading } = useCheak_authQuery();
  if (isLoading) return <ShimmerUi />;
  if (!data?.success) return <Navigate to="/login" replace />;
  const role = data?.user?.role;
  return <Navigate to={roleHomePaths[role] || '/login'} replace />;
};

const OasesEnabledRoute = ({ children, redirectTo }) => {
  const { isOasesEnabled, loaded } = useSelector((state) => state.oasesSettings || { isOasesEnabled: false, loaded: false });
  if (!loaded) return <ShimmerUi />;
  if (!isOasesEnabled) return <Navigate to={redirectTo} replace />;
  return children;
};

/**
 * SuperAdminProtectedRoute — guards /superadmin/* routes.
 * Separate from ProtectedRoute — uses superAdminApi, not authApi.
 * Does NOT interact with school user state in any way.
 */
const SuperAdminProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const { data, isLoading } = useCheckSuperAdminAuthQuery();
  const dispatch = useDispatch();

  // Sync super admin into Redux if not yet set (e.g. after page refresh)
  React.useEffect(() => {
    if (data?.success && data?.superAdmin) {
      dispatch(setSuperAdmin(data.superAdmin));
    }
  }, [data, dispatch]);

  if (isLoading) return <ShimmerUi />;

  if (!data?.success) {
    navigate('/superadmin/login', { replace: true });
    return null;
  }

  return children;
};

// Require this many consecutive failures before blocking the app with the
// Service Unavailable screen. Prevents a single transient network glitch
// (or a cold-start 5xx during Vercel wake-up) from locking users out.
const FAILURE_THRESHOLD = 2;

/**
 * ServerHealthWrapper
 * ───────────────────
 * Monitors the backend health endpoint every 10 seconds.
 * If the server is offline or degraded for FAILURE_THRESHOLD consecutive
 * checks, it replaces the entire app with the ServiceUnavailable page.
 * Once the server recovers, the app is automatically restored.
 */
function ServerHealthWrapper({ children }) {
  const { status, lastChecked, responseTime, errorMessage, retryCount, manualRetry } =
    useServerHealth();

  // Only block the UI after FAILURE_THRESHOLD consecutive failures.
  // retryCount increments on every failed attempt; resetting to 0 on success.
  const isConfirmedDown =
    (status === 'offline' || status === 'degraded') && retryCount >= FAILURE_THRESHOLD;

  if (isConfirmedDown) {
    return (
      <ServiceUnavailable
        status={status}
        lastChecked={lastChecked}
        responseTime={responseTime}
        errorMessage={errorMessage}
        retryCount={retryCount}
        manualRetry={manualRetry}
      />
    );
  }

  return children;
}

function App() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state?.user?.user);
  const { data: settingsData, isLoading: settingsLoading } = useGetSchoolSettingsQuery();

  // —— Socket.io: real-time notification listener ——
  useEffect(() => {
    // Resolve user._id regardless of nesting depth
    const userId = currentUser?._id || currentUser?.user?._id;
    if (!userId) return;

    const socket = io(import.meta.env.VITE_PORT, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      // NOTE: Server auto-joins the user's notification room on connection via JWT.
      // Manual 'join:room' with 'user:' prefix is blocked server-side — do NOT emit it.
    });

    socket.on('notification:new', (notif) => {
      dispatch(incrementUnreadCount());
      dispatch(setLatestNotification(notif));
      toast(notif.title, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#fff',
          color: '#111827',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          fontSize: '13px',
          maxWidth: '320px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        },
        icon: '🔔',
      });
    });

    return () => socket.disconnect();
  }, [currentUser?._id, currentUser?.user?._id, dispatch]);

  // 💰 Sync Redux user to localStorage — payroll pages read role via localStorage.getItem('user')
  React.useEffect(() => {
    const u = currentUser?.user || currentUser || null;
    if (u?._id) {
      localStorage.setItem('user', JSON.stringify(u));
      if (u.role) localStorage.setItem('role', u.role);
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (settingsLoading) return;

    const settingsModules = settingsData?.data?.modules;
    const oasesEnabled = settingsData?.data?.isOasesEnabled ?? false;

    // Update the new module settings slice (drives ModuleGatedRoute + sidebar)
    if (settingsModules) {
      dispatch(setModules(settingsModules));
    }

    // Keep existing OASES slice working (backward compat — many components read it)
    // Fix: Super Admin's modules.oases=true must NOT override the school's own isOasesEnabled toggle.
    // If Super Admin explicitly disabled → always off. Otherwise, school's toggle is the final gate.
    const oases = settingsModules?.oases === false ? false : oasesEnabled;
    dispatch(setOasesEnabled(oases));
    if (!oases) dispatch(resetOasesState());
  }, [settingsData, settingsLoading, dispatch]);

  return (
    <ServerHealthWrapper>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Loader />}>
          <Routes>
            {/* ==== HOME: redirects to role-specific dashboard ==== */}
            <Route path="/" element={<HomeRedirect />} />

            {/* ==== PUBLIC ROUTES ==== */}
            <Route path="/signup2" element={<PublicRoute><Registration /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><NewLogin /></PublicRoute>} />
            <Route path="/otp" element={<PublicRoute><OTPVerification /></PublicRoute>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/forgot-password/:token" element={<ChangePassword />} />

            {/* Force password change — required for admin-created staff on first login */}
            <Route
              path="/change-password"
              element={
                <ProtectedRoute allowedRoles={allRoles}>
                  <ForcePasswordChange />
                </ProtectedRoute>
              }
            />
            <Route path="/passkey" element={<AttendanceApp />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/roadmapshow" element={<Roadmapshow />} />
            <Route path="/events" element={<Eventpage />} />
            <Route path="/description/:id" element={<ShowSingle />} />
            <Route path="/eventmember" element={<EventMember />} />

            {/* ====================================== */}
            {/* ==== NEW: ROLE-BASED DASHBOARD ROUTES ==== */}
            {/* ====================================== */}

            {/* Admin routes — also allow admission role to access /admin/bulk-import */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.ADMISSION]}><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="sessions" element={<SessionManager />} />
              <Route path="classes" element={<ClassManager />} />
              <Route path="subjects" element={<SubjectManager />} />
              <Route path="teacher-assignment" element={<TeacherAssignmentPage />} />
              <Route path="exams" element={<ExamManager />} />
              <Route path="marks-audit-log" element={<MarksAuditLog />} />
              <Route path="settings" element={<SchoolSettingsPage />} />
              <Route path="teacher-leaves" element={<TeacherLeaveManager />} />
              <Route path="staff" element={<StaffManager />} />
              <Route path="knowledge-center" element={<AdminKnowledgeCenter />} />
              <Route path="students" element={<AdminStudentDirectory />} />
              <Route path="students/:id" element={<AdminStudentDetail />} />
              <Route path="teachers" element={<AdminTeacherDirectory />} />
              <Route path="teachers/:id" element={<AdminTeacherDetail />} />
              <Route path="class-list" element={<AdminClassDirectory />} />
              <Route path="subject-list" element={<AdminSubjectDirectory />} />
              <Route path="biometric/devices" element={<BiometricDeviceManagement />} />
              <Route path="biometric/attendance" element={<FacultyAttendance />} />
              <Route path="fee/*" element={<FeeModuleHub />} />
              {/* 💰 Payroll Module — admin manages all payroll */}
              <Route path="payroll/*" element={<PayrollModuleHub />} />
              <Route path="report-cards" element={<ReportCardManager />} />
              <Route path="report-cards/:studentId" element={<ReportCardEditor />} />
              {/* —— Dynamic Report Card System —— */}
              <Route path="dynamic-reports" element={<DynamicReportManager />} />
              <Route path="templates" element={<TemplateManager />} />
              <Route path="templates/new" element={<TemplateEditor />} />
              <Route path="templates/edit/:id" element={<TemplateEditor />} />
              {/* Template-based report cards — fully dynamic, no hardcoding */}
              <Route path="template-report-cards" element={<TemplateReportCard />} />
              <Route path="documents" element={<DocumentHub />} />
              <Route
                path="documents/tc"
                element={<DocumentStudentList documentType="TC" basePath="/admin/documents/tc" />}
              />
              <Route path="documents/tc/:studentId" element={<NewDocumentForm forcedType="TC" />} />
              <Route
                path="documents/migration"
                element={<DocumentStudentList documentType="MIGRATION" basePath="/admin/documents/migration" />}
              />
              <Route path="documents/migration/:studentId" element={<MigrationCertificatePage />} />
              <Route path="oases/*" element={
                <OasesEnabledRoute redirectTo="/admin/exams">
                  <OasesModuleHub />
                </OasesEnabledRoute>
              } />
              <Route path="documents/template-config" element={<TemplateConfigPage />} />
              <Route path="documents/new/:type/:studentId" element={<NewDocumentForm />} />
              <Route path="documents/preview/:id" element={<CertificatePreview />} />
              {/* Phase 3 — Notification control moved into School Settings (/admin/settings) */}
              <Route path="notifications" element={<Navigate to="/admin/settings" replace />} />
              {/* ── Student Management — 7 sub-features ── */}
              <Route path="students/all" element={<AllStudents />} />
              <Route path="students/bulk-edit" element={<StudentsBulkEdit />} />
              <Route path="students/deleted" element={<DeletedStudents />} />
              <Route path="students/passed" element={<PassedStudents />} />
              <Route path="students/dropped" element={<DroppedStudents />} />
              <Route path="students/suspended" element={<SuspendedStudents />} />
              <Route path="students/promotion" element={<MigrationPromotion />} />
              <Route path="students/:id/edit" element={<EditStudentPage />} />
              {/* ── Bulk Import System — Students + Teachers ── */}
              <Route path="bulk-import" element={<BulkImport />} />
              {/* ── Teacher Management ── */}

              <Route path="teachers/all" element={<AllTeachers />} />
              <Route path="teachers/deleted" element={<DeletedTeachers />} />
              <Route path="teachers/:id/edit" element={<EditTeacherPage />} />
              {/* ── Admission Forms module ── */}
              <Route path="admission-forms/print" element={<PrintAdmissionForm />} />
              <Route path="admission-forms/print/:id" element={<PrintPreview />} />
              <Route path="admission-forms/settings" element={<AdmissionFormSettings />} />
              {/* ── Admission Form Templates (School Admin — READ-ONLY) ── */}
              {/* School admins can VIEW and PREVIEW templates only. */}
              {/* Template upload/edit/delete is Super Admin only.   */}
              <Route path="admission/templates" element={<AdmissionTemplateManager />} />
              <Route path="admission/templates/:id/preview" element={<AdmissionTemplatePreview />} />
              {/* ── ID Cards module ── */}
              <Route path="id-cards/students" element={<StudentIdCard />} />
              <Route path="id-cards/teachers" element={<TeacherIdCard />} />
              {/* ── Custom Forms module ── */}
              <Route path="custom-forms" element={<AllForms />} />
              <Route path="custom-forms/create" element={<CreateForm />} />
              <Route path="custom-forms/deleted" element={<DeletedForms />} />
              <Route path="custom-forms/:id/edit" element={<EditForm />} />
              <Route path="custom-forms/:id/leads" element={<FormLeads />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Library routes (accessible by admin — nested under /admin/library) */}
            <Route path="/admin/library" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<LibraryDashboard />} />
              <Route path="books" element={<ManageBooks />} />
              <Route path="issue" element={<IssueBook />} />
              <Route path="return" element={<ReturnBook />} />
              <Route path="issued" element={<IssuedBooks />} />
              <Route path="overdue" element={<OverdueBooks />} />
              <Route path="librarians" element={<ManageLibrarians />} />
              <Route index element={<Navigate to="dashboard" replace />} />

            </Route>

            {/* Accounts role routes */}
            <Route path="/accounts" element={<ProtectedRoute allowedRoles={[ROLES.ACCOUNTS]}><DashboardLayout /></ProtectedRoute>}>
              <Route path="fee/*" element={<FeeModuleHub />} />
              {/* 💰 Payroll Module — admin manages all payroll */}
              <Route path="payroll/*" element={<PayrollModuleHub />} />
              <Route index element={<Navigate to="fee/students" replace />} />
            </Route>

            {/* Teacher routes (new management panel) */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<TeacherDashboardNew />} />
              <Route path="attendance" element={<TakeAttendanceNew />} />
              <Route path="assignments" element={<TeacherAssignments />} />
              <Route path="marks" element={<UploadMarks />} />
              <Route path="tests" element={<TeacherTestCreate />} />
              <Route path="materials" element={<TeacherKnowledgeCenter />} />
              <Route path="leave" element={<TeacherLeave />} />
              <Route path="student-leaves" element={<StudentLeaveApproval />} />
              <Route path="my-students" element={<TeacherMyStudents />} />
              <Route path="co-scholastic" element={<CoScholasticMarks />} />
              <Route path="report-cards" element={<ReportCardManager />} />
              <Route path="report-cards/:studentId" element={<ReportCardEditor />} />
              <Route path="template-report-cards" element={<TemplateReportCard />} />
              {/* 💰 Payroll — teacher self-service: view own payslips */}
              <Route path="payroll/my-payslips" element={<PayrollModuleHub />} />
              <Route path="oases/*" element={
                <OasesEnabledRoute redirectTo="/teacher/dashboard">
                  <OasesModuleHub />
                </OasesEnabledRoute>
              } />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Student routes (new management panel) */}
            <Route path="/student" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]}><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<StudentDashboardNew />} />
              <Route path="attendance" element={<StudentAttendanceNew />} />
              <Route path="assignments" element={<AssignmentPage />} />
              <Route path="marks" element={<StudentMarks />} />
              <Route path="leave" element={<StudentLeave />} />
              <Route path="materials" element={<KnowlegedgeCenter />} />
              <Route path="notices" element={<Allnoticepage />} />
              <Route path="complaints" element={<ComplaintForm />} />
              <Route path="fees" element={<StudentFees />} />
              <Route path="report-card" element={<ReportCardEditor />} />
              <Route path="library"      element={<StudentLibrary />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Admission routes */}
            <Route path="/admission" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.ADMISSION]}><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<AdmissionDashboard />} />
              <Route path="register-student" element={<RegisterStudent />} />
              <Route path="register-teacher" element={<RegisterTeacher />} />
              <Route path="students" element={<StudentListPage />} />
              <Route path="students/:id" element={<AdmissionStudentDetail />} />
              <Route path="teachers" element={<TeacherListPage />} />
              <Route path="teachers/:id" element={<AdmissionTeacherDetail />} />
              {/* ── Admission Forms module (also accessible from admission role) ── */}
              <Route path="admission-forms/print" element={<PrintAdmissionForm />} />
              <Route path="admission-forms/print/:id" element={<PrintPreview />} />
              <Route path="admission-forms/settings" element={<AdmissionFormSettings />} />
              {/* ── Admission Form Templates (admission role — READ-ONLY) ── */}
              {/* Admission staff can VIEW and PREVIEW templates only.    */}
              <Route path="admission/templates" element={<AdmissionTemplateManager />} />
              <Route path="admission/templates/:id/preview" element={<AdmissionTemplatePreview />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Librarian role routes */}
            <Route path="/librarian" element={<ProtectedRoute allowedRoles={[ROLES.LIBRARIAN]}><DashboardLayout /></ProtectedRoute>}>
              <Route path="dashboard" element={<LibraryDashboard />} />
              <Route path="books" element={<ManageBooks />} />
              <Route path="issue" element={<IssueBook />} />
              <Route path="return" element={<ReturnBook />} />
              <Route path="issued" element={<IssuedBooks />} />
              <Route path="overdue" element={<OverdueBooks />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* ── Shared: /admin/bulk-import accessible by admission role too ── */}
            {/* Note: /admin route is ProtectedRoute for admin only, so we also add
                the BulkImport page directly under /admission/bulk-import */}


            {/* ====================================== */}
            {/* ==== LEGACY ROUTES (backward compatible) ==== */}
            {/* ====================================== */}

            {/* Routes for both student and teacher */}
            <Route path="/home" element={<ProtectedRoute allowedRoles={bothRoles}><Sidebar /><HomePage /></ProtectedRoute>} />
            <Route path="/chatapp" element={<ProtectedRoute allowedRoles={bothRoles}><ChatApp /></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute allowedRoles={bothRoles}><TimeTable /></ProtectedRoute>} />
            <Route path="/addevent" element={<ProtectedRoute allowedRoles={bothRoles}><AddEventForm /></ProtectedRoute>} />
            <Route path="/application" element={<ProtectedRoute allowedRoles={bothRoles}><Application /></ProtectedRoute>} />
            <Route path="/showleaves/:filename" element={<ProtectedRoute allowedRoles={bothRoles}><PDFViewer /></ProtectedRoute>} />
            <Route path="/notifications" element={
              <ProtectedRoute allowedRoles={allRoles}>
                <NotificationCenter />
              </ProtectedRoute>
            } />
            {/* Phase 3 — Notification Preferences (all roles) */}
            <Route path="/notification-preferences" element={
              <ProtectedRoute allowedRoles={allRoles}>
                <NotificationPreferences />
              </ProtectedRoute>
            } />
            <Route path="/noticeapprove" element={<ProtectedRoute allowedRoles={bothRoles}><Noticeapprove /></ProtectedRoute>} />
            <Route path="/fullnotice/:id" element={<ProtectedRoute allowedRoles={bothRoles}><Noticeopen /></ProtectedRoute>} />
            <Route path="/addnotice" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT, ROLES.TEACHER, ROLES.ADMIN]}><Notice /></ProtectedRoute>} />
            <Route path="/box" element={<ProtectedRoute allowedRoles={bothRoles}><Noticebox /></ProtectedRoute>} />
            <Route path="/eventform" element={<ProtectedRoute allowedRoles={bothRoles}><Eventform /></ProtectedRoute>} />
            <Route path="/groupeventform" element={<ProtectedRoute allowedRoles={bothRoles}><GroupEventForm /></ProtectedRoute>} />
            <Route path="/complaintbox" element={<ProtectedRoute allowedRoles={bothRoles}><ComplaintBox /></ProtectedRoute>} />
            <Route path="/complaintform" element={<ProtectedRoute allowedRoles={bothRoles}><ComplaintForm /></ProtectedRoute>} />
            <Route path="/next/:id" element={<ProtectedRoute allowedRoles={bothRoles}><ComplaintNext /></ProtectedRoute>} />
            <Route path="/request" element={<ProtectedRoute allowedRoles={bothRoles}><Request /></ProtectedRoute>} />
            <Route path="/quiz" element={<ProtectedRoute allowedRoles={bothRoles}><Kahoot /></ProtectedRoute>} />
            <Route path="/quizwinner" element={<ProtectedRoute allowedRoles={bothRoles}><Kahootwinners /></ProtectedRoute>} />
            <Route path="/quizscore" element={<ProtectedRoute allowedRoles={bothRoles}><Kahootscore /></ProtectedRoute>} />
            <Route path="/quizquestion" element={<ProtectedRoute allowedRoles={bothRoles}><Kahootquize /></ProtectedRoute>} />
            <Route path="/quizmember" element={<ProtectedRoute allowedRoles={bothRoles}><KahootWaitMember /></ProtectedRoute>} />

            {/* Teacher-only legacy routes */}
            <Route path="/teacherassignment" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><TeacherAssign /></ProtectedRoute>} />
            <Route path="/createtimetable" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><AdminTt /></ProtectedRoute>} />
            <Route path="/register" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><StudentRegistration /></ProtectedRoute>} />
            <Route path="/Dashboard" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><TeacherAnalyticsDashboard /></ProtectedRoute>} />
            <Route path="/teacherassignmentupload" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><Teachersassignment /></ProtectedRoute>} />
            <Route path="/teacherassignmentupload/:id" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><UploadedFiles /></ProtectedRoute>} />
            <Route path="/takeattendance" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><TakeAttendance /></ProtectedRoute>} />
            <Route path="/leavesection" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><LeaveSection /></ProtectedRoute>} />
            <Route path="/knowlegecentercreate" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><Knowledgeadmin /></ProtectedRoute>} />
            <Route path="/entry" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><Finaceentry /></ProtectedRoute>} />
            <Route path="/studentdesh" element={<ProtectedRoute allowedRoles={[ROLES.TEACHER]}><StudentManagementDashboard /></ProtectedRoute>} />

            {/* Student-only legacy routes */}
            <Route path="/dashboardstd" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]}><Dashboard /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]}><AttendancePage /></ProtectedRoute>} />
            <Route path="/assignment" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]}><AssignmentPage /></ProtectedRoute>} />
            <Route path="/assignment/:subject" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]}><AssignmentsDetails /></ProtectedRoute>} />
            <Route path="/assignment/:subject/:assignmentid" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]}><SubmissionPage /></ProtectedRoute>} />
            <Route path="/knowlegecenter" element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]}><KnowlegedgeCenter /></ProtectedRoute>} />

            {/* Finance / Admin — open */}
            <Route path="/finance" element={<Finance />} />
            <Route path="/admin/fees" element={<FeeManagement />} />

            {/* 🎓 Exam Controller Module — MARKS_ALL_ACCESS school-wide marks management */}
            <Route
              path="/exam-controller"
              element={
                <ProtectedRoute allowedRoles={[ROLES.EXAM_CONTROLLER]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ECDashboard />} />
              <Route path="marks"     element={<ECMarksManagement />} />
              <Route path="audit-log" element={<ECAuditLog />} />
              <Route path="exams"     element={<ECAllExams />} />
            </Route>

            {/* 💰 /payroll/* fallback — handles navigate() calls from inside payroll pages */}
            <Route path="/payroll" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.ACCOUNTS]}><DashboardLayout /></ProtectedRoute>}>
              <Route path="*" element={<PayrollModuleHub />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* ── Service Unavailable preview route (for direct testing) ── */}
            <Route path="/service-unavailable" element={
              <ServiceUnavailable
                status="offline"
                lastChecked={new Date()}
                responseTime={null}
                errorMessage="Unable to reach the server. It may be down or restarting."
                retryCount={3}
                manualRetry={() => window.location.href = '/'}
              />
            } />

            {/* OASES / System — Unauthorized page */}
            <Route path="/unauthorized" element={
              <div style={{
                minHeight: '100vh', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #060b18 0%, #0d1526 100%)',
                color: '#fff', fontFamily: 'Inter,system-ui,sans-serif', gap: '16px',
              }}>
                <div style={{ fontSize: '56px', filter: 'drop-shadow(0 0 24px rgba(239,68,68,0.4))' }}>🔒</div>
                <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Access Denied</h1>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>You don&apos;t have permission to view this page.</p>
                <button
                  onClick={() => window.history.back()}
                  style={{
                    marginTop: '8px', padding: '12px 28px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                    fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.35)'
                  }}
                >
                  ← Go Back
                </button>
              </div>
            } />

            {/* ============================================== */}
            {/* ==== SUPER ADMIN ROUTES (Phase 1) ==== */}
            {/* ============================================== */}

            {/* Public — no auth required */}
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />

            {/* Protected — requires valid superAdminToken cookie */}
            <Route
              path="/superadmin"
              element={
                <SuperAdminProtectedRoute>
                  <SuperAdminLayout />
                </SuperAdminProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
              <Route path="dashboard" element={<SuperAdminDashboard />} />
              <Route path="schools" element={<SuperAdminSchools />} />
              <Route path="schools/:id/modules" element={<SchoolModules />} />
              <Route path="schools/:id/staff" element={<SchoolStaffAdmin />} />
              {/* Super admin uploads HTML/CSS report templates to any school */}
              <Route path="schools/:id/templates" element={<SuperAdminTemplateManager />} />
              {/* Alias: /superadmin/templates goes to the all-schools template manager */}
              <Route path="templates" element={<SuperAdminTemplateManager />} />
              {/* Super admin uploads HTML/CSS admission form templates to any school */}
              <Route path="admission-templates" element={<SuperAdminAdmissionTemplateManager />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster position="top-right" />
      </Router>
    </ServerHealthWrapper>
  );
}

export default App;
