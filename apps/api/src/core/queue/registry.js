module.exports = {
  bootWorkers: () => {
    require('../../modules/biometric/jobs/attendanceWorker');
    require('../../modules/notifications/jobs/notificationWorker');
    require('../../modules/notifications/jobs/digestWorker');
    require('../../modules/notifications/jobs/emailWorker');
    require('../../modules/payroll/jobs/payrollWorker');
    require('../../modules/payroll/jobs/pdfWorker');
  },
};