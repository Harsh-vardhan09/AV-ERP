// Public API of the notifications module. Both are exported as whole namespaces
// because consumers destructure many different functions from them.
module.exports = {
  // notificationService — createInAppNotification / sendEmailNotification /
  // notifyMultipleUsers / sendBulkEmails. Consumers: admin, admission, notice,
  // reportCard, student, teacher controllers and fee (razorpay, studentFee)
  get notificationService() {
    return require('./services/notificationService');
  },

  // emailService — sendStaffCredentials / sendAdminCredentials /
  // sendPasswordChangedNotification / sendPayslipEmail / getTransporter.
  // Consumers: modules/library, plus staff, superAdmin, authenticates
  // controllers, platformRoutes and payroll's payslipService
  get emailService() {
    return require('./lib/emailService');
  },

  // mailtrap — legacy OTP / verification / reset mail, now on emailService's
  // transport. Consumer: modules/identity/controllers/otpController
  get mailtrap() {
    return require('./lib/mailtrap');
  },

  // emailTemplates — welcomeStudent / welcomeTeacher / leaveDecision /
  // noticePublished / feePaymentReceipt. Consumers: admin, admission, notice,
  // teacher controllers and fee's studentFeeController
  get emailTemplates() {
    return require('./lib/emailTemplates');
  },

  // scheduleNotifications. Consumer: people/controllers/adminController
  get scheduleNotifications() {
    return require('./lib/scheduleNotifications');
  },
};
