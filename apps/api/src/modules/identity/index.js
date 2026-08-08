// Public API of the identity module.
//
// Getters, not eager requires: an eager barrel pulls its controllers' whole
// dependency tree at load time, which is how the tenancy <-> notifications
// cycle formed. Deferring to first access keeps each consumer's load minimal.
module.exports = {
  // User — the shared user model. Consumers: modules/library, modules/notifications,
  // core/security/authenticate, ~40 people's legacy controllers, and the seed/tool scripts
  get User() {
    return require('./models/user').User;
  },

  // generateTempPassword — admin-created staff get a temp password.
  // Consumers: modules/library, staffController, superAdminController
  get generatePassword() {
    return require('./lib/generatePassword');
  },

  // generateSuperAdminToken. Consumer: modules/tenancy/controllers/superAdminController
  get generateSuperAdminToken() {
    return require('./lib/generateSuperAdminToken');
  },

  // otpController — OTP send/verify handlers mounted by modules/admissions/routes/admissionRoutes
  get otpController() {
    return require('./controllers/otpController');
  },
};
