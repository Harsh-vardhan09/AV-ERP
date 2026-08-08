import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './api/userApi';
import { schoolApi } from './api/userApi';
import { assignmentApi } from './api/assignmentapi';
import { knowlegecenterapi } from './api/knowlegecenterapi';
import { adminApi } from './api/adminApi';
import { teacherApi } from './api/teacherApi';
import { studentApi } from './api/studentApi';
import { admissionApi } from './api/admissionApi';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './reducers/userreducer';
import sidebarReducer from './reducers/sidebarslice';
import ComplainsReducer from "./features/complainSlice";
import { chatapi } from './api/chat';
import { feeApi } from '../modules/fees/api/feeApi';
import { reportCardApi } from './api/reportCardApi';
import { documentApi } from '../modules/documents/api/documentApi';
import { documentTemplateApi } from '../modules/documents/api/documentTemplateApi';
import { templateConfigApi } from '../modules/documents/api/templateConfigApi';
import { generatedDocumentsApi } from '../modules/documents/api/generatedDocumentsApi';
import examReducer from './slices/examSlice';
import oasesSettingsReducer from './slices/oasesSettingsSlice';
import moduleSettingsReducer from './slices/moduleSettingsSlice';
// ── Super Admin (Phase 1) — NOT persisted (security)
import { superAdminApi } from './api/superAdminApi';
import superAdminReducer from './slices/superAdminSlice';
// ── Staff Credential Management
import { staffApi } from './api/staffApi';
// ── Notification System (Phase 1)
import { notificationApi } from './api/notificationApi';
import notificationReducer from './slices/notificationSlice';
// —— Notification Preferences (Phase 3)
import { notificationPreferenceApi } from './api/notificationPreferenceApi';
import { studentManagementApi } from './api/studentManagementApi';
import { teacherManagementApi } from './api/teacherManagementApi';
import { customFormApi }        from './api/customFormApi';
// —— Dynamic Report Card System ——
import { dynamicReportApi } from './api/dynamicReportApi';
import { reportTemplateApi } from './api/reportTemplateApi';
// —— Library Management System ——
import { libraryApi } from './api/libraryApi';
// —— Admission Template System ——
import { admissionTemplateApi } from './api/admissionTemplateApi';
import { admissionRefApi } from './api/admissionApi';
import { payrollApi }           from '../modules/payroll/api/payrollApi'; // 💰 Payroll Module
// —— Exam Controller Module ——
import { examControllerApi }    from './api/examControllerApi'; // 🎓 Exam Controller RBAC

const persistConfig = {
  key: 'root',
  storage,
};

const persistedUserReducer = persistReducer(persistConfig, userReducer);

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [schoolApi.reducerPath]: schoolApi.reducer,
    [assignmentApi.reducerPath]: assignmentApi.reducer,
    [knowlegecenterapi.reducerPath]: knowlegecenterapi.reducer,
    [chatapi.reducerPath]: chatapi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [teacherApi.reducerPath]: teacherApi.reducer,
    [studentApi.reducerPath]: studentApi.reducer,
    [admissionApi.reducerPath]: admissionApi.reducer,
    [feeApi.reducerPath]: feeApi.reducer,
    [reportCardApi.reducerPath]: reportCardApi.reducer,
    [documentApi.reducerPath]: documentApi.reducer,
    [documentTemplateApi.reducerPath]: documentTemplateApi.reducer,
    [templateConfigApi.reducerPath]: templateConfigApi.reducer,
    [generatedDocumentsApi.reducerPath]: generatedDocumentsApi.reducer,
    oasesSettings: oasesSettingsReducer,
    moduleSettings: moduleSettingsReducer,
    user: persistedUserReducer,
    sidebar: sidebarReducer,
    complains: ComplainsReducer,
    exam: examReducer,
    // ── Super Admin (Phase 1) ──
    [superAdminApi.reducerPath]: superAdminApi.reducer,
    superAdmin: superAdminReducer,
    // ── Staff Management ──
    [staffApi.reducerPath]: staffApi.reducer,
    // ── Notification System (Phase 1) ──
    [notificationApi.reducerPath]: notificationApi.reducer,
    notifications: notificationReducer,
    // —— Notification Preferences (Phase 3) ——
    [notificationPreferenceApi.reducerPath]: notificationPreferenceApi.reducer,
    // —— Student Management ——
    [studentManagementApi.reducerPath]: studentManagementApi.reducer,
    // —— Teacher Management ——
    [teacherManagementApi.reducerPath]: teacherManagementApi.reducer,
    // —— Custom Forms ——
    [customFormApi.reducerPath]: customFormApi.reducer,
    // —— Dynamic Report Card System ——
    [dynamicReportApi.reducerPath]: dynamicReportApi.reducer,
    [reportTemplateApi.reducerPath]: reportTemplateApi.reducer,
    // —— Library Management System ——
    [libraryApi.reducerPath]: libraryApi.reducer,
    // —— Admission Template System ——
    [admissionTemplateApi.reducerPath]: admissionTemplateApi.reducer,
    // —— Admission Ref (classes/sections) ——
    [admissionRefApi.reducerPath]: admissionRefApi.reducer,
    // —— Payroll Module ——
    [payrollApi.reducerPath]: payrollApi.reducer,
    // —— Exam Controller Module ——
    [examControllerApi.reducerPath]: examControllerApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    })
      .concat(authApi.middleware)
      .concat(schoolApi.middleware)
      .concat(assignmentApi.middleware)
      .concat(knowlegecenterapi.middleware)
      .concat(chatapi.middleware)
      .concat(adminApi.middleware)
      .concat(teacherApi.middleware)
      .concat(studentApi.middleware)
      .concat(admissionApi.middleware)
      .concat(feeApi.middleware)
      .concat(reportCardApi.middleware)
      .concat(documentApi.middleware)
      .concat(documentTemplateApi.middleware)
      .concat(templateConfigApi.middleware)
      .concat(generatedDocumentsApi.middleware)
      // ── Super Admin (Phase 1) ──
      .concat(superAdminApi.middleware)
      // ── Staff Management ──
      .concat(staffApi.middleware)
      // ── Notification System (Phase 1) ──
      .concat(notificationApi.middleware)
      // —— Notification Preferences (Phase 3) ——
      .concat(notificationPreferenceApi.middleware)
      // —— Student Management ——
      .concat(studentManagementApi.middleware)
      // —— Teacher Management ——
      .concat(teacherManagementApi.middleware)
      // —— Custom Forms ——
      .concat(customFormApi.middleware)
      // —— Dynamic Report Card System ——
      .concat(dynamicReportApi.middleware)
      .concat(reportTemplateApi.middleware)
      // —— Library Management System ——
      .concat(libraryApi.middleware)
      // —— Admission Template System ——
      .concat(admissionTemplateApi.middleware)
      // —— Admission Ref (classes/sections) ——
      .concat(admissionRefApi.middleware)
      // —— Payroll Module ——
      .concat(payrollApi.middleware)
      // —— Exam Controller Module ——
      .concat(examControllerApi.middleware),
});

export const persistor = persistStore(store);
