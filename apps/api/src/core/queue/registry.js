// Paths follow the workers: each moves to modules/<domain>/jobs as that module migrates
module.exports = {
  bootWorkers: () => {
    require('../../../src-old/workers/attendanceWorker');
    require('../../../src-old/workers/notificationWorker');
    require('../../../src-old/workers/digestWorker');
    require('../../../src-old/workers/emailWorker');
    require('../../../src-old/workers/payrollWorker');
    require('../../modules/payroll/jobs/pdfWorker');
  },
};
