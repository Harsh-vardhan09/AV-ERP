import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import userReducer from '@shared/lib/store/userSlice';
import sidebarReducer from '@shared/lib/store/sidebarSlice';

// adminApi and assignmentapi have no owning module yet — adminApi mirrors the
// backend god-controller, assignments belong to a web `academics` module that
// does not exist.
import { adminApi } from '@shared/lib/api/adminApi';
import { assignmentApi } from '@modules/academics';

import { authApi, schoolApi } from '@modules/identity';
import { chatapi, knowlegecenterapi, complainReducer } from '@modules/communication';
import { teacherApi, studentApi, staffApi, studentManagementApi, teacherManagementApi } from '@modules/people';
import { admissionApi, admissionRefApi, admissionTemplateApi, customFormApi } from '@modules/admissions';
import { feeApi } from '@modules/fees';
import { reportCardApi, dynamicReportApi, reportTemplateApi } from '@modules/reportcards';
import { documentApi, documentTemplateApi, templateConfigApi, generatedDocumentsApi } from '@modules/documents';
import { examReducer, oasesSettingsReducer } from '@modules/oases';
import { superAdminApi, superAdminReducer, moduleSettingsReducer } from '@modules/tenancy';
import { notificationApi, notificationPreferenceApi, notificationReducer } from '@modules/notifications';
import { libraryApi } from '@modules/library';
import { payrollApi } from '@modules/payroll';
import { examControllerApi } from '@modules/examination';

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
    complains: complainReducer,
    exam: examReducer,
    [superAdminApi.reducerPath]: superAdminApi.reducer,
    superAdmin: superAdminReducer,
    [staffApi.reducerPath]: staffApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    notifications: notificationReducer,
    [notificationPreferenceApi.reducerPath]: notificationPreferenceApi.reducer,
    [studentManagementApi.reducerPath]: studentManagementApi.reducer,
    [teacherManagementApi.reducerPath]: teacherManagementApi.reducer,
    [customFormApi.reducerPath]: customFormApi.reducer,
    [dynamicReportApi.reducerPath]: dynamicReportApi.reducer,
    [reportTemplateApi.reducerPath]: reportTemplateApi.reducer,
    [libraryApi.reducerPath]: libraryApi.reducer,
    [admissionTemplateApi.reducerPath]: admissionTemplateApi.reducer,
    [admissionRefApi.reducerPath]: admissionRefApi.reducer,
    [payrollApi.reducerPath]: payrollApi.reducer,
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
      .concat(superAdminApi.middleware)
      .concat(staffApi.middleware)
      .concat(notificationApi.middleware)
      .concat(notificationPreferenceApi.middleware)
      .concat(studentManagementApi.middleware)
      .concat(teacherManagementApi.middleware)
      .concat(customFormApi.middleware)
      .concat(dynamicReportApi.middleware)
      .concat(reportTemplateApi.middleware)
      .concat(libraryApi.middleware)
      .concat(admissionTemplateApi.middleware)
      .concat(admissionRefApi.middleware)
      .concat(payrollApi.middleware)
      .concat(examControllerApi.middleware),
});

export const persistor = persistStore(store);
