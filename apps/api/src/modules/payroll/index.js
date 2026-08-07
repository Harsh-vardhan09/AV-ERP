// Public API of the payroll module.
//
// Getters, not eager requires: the services reach notifications and identity, which
// can reach back here. Deferring to first access keeps a consumer loading only the
// file it names.
module.exports = {
  // Payslip — consumer: modules/notifications/jobs/emailWorker (payslip email job)
  get Payslip() { return require('./models/Payslip'); },

  // payrollQueue — consumer: modules/notifications/jobs/emailWorker, which enqueues
  // onto the same Bull queue the payroll workers drain
  get payrollQueue() { return require('./jobs/payrollQueue'); },
};
