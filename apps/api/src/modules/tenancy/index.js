// Public API of the tenancy module.
//
// Getters, not eager requires: a barrel that requires its controllers at load time
// drags in their whole dependency tree, and tenancy -> superAdminController ->
// identity -> otpController -> notifications -> notificationService loops back here.
// Deferring to first access breaks the cycle — a consumer loads only what it names.
module.exports = {
  // School — consumers: modules/library, modules/documents, modules/identity,
  // ~28 people's legacy controllers and the seed/tool scripts
  get School() {
    return require('./models/School');
  },

  // SchoolSettings — consumers: core/security/moduleGate, notifications, report cards
  get SchoolSettings() {
    return require('./models/SchoolSettings');
  },

  // SuperAdmin — consumer: core/security/superAdminAuth
  get SuperAdmin() {
    return require('./models/SuperAdmin');
  },

  // superAdminController — consumer: modules/reportcards/routes/reportTemplateRoutes
  get superAdminController() {
    return require('./controllers/superAdminController');
  },
};
