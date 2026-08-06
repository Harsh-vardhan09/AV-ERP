// Paths follow the workers: each moves to modules/<domain>/jobs as that module migrates
module.exports = {
  bootWorkers: () => {
    require('../../modules/biometric/jobs/attendanceWorker');
    require('../../modules/notifications/jobs/notificationWorker');
    require('../../modules/notifications/jobs/digestWorker');
    require('../../modules/notifications/jobs/emailWorker');
    require('../../../src-old/workers/payrollWorker');
    require('../../modules/payroll/jobs/pdfWorker');
  },
};
