// Public API of the fees module.
//
// Getters, not eager requires: the services pull in the fee models plus people's
// profile models, and studentFeeService reaches notifications. Deferring to first
// access keeps a consumer loading only what it names.
module.exports = {
  // studentFeeService — consumers: modules/admissions/controllers/admissionController
  // and modules/imports/adapters/studentAdapter (fee auto-assignment on new student)
  get studentFeeService() {
    return require('./services/studentFeeService');
  },

  // FeeReceipt — consumer: people/controllers/adminController (dashboard receipts).
  // The model file exports { FeeReceipt, ReceiptCounter }; unwrap so consumers that
  // destructure { FeeReceipt } off this index get the model, not the wrapper.
  get FeeReceipt() {
    return require('./models/FeeReceipt').FeeReceipt;
  },

  // ReceiptCounter — no consumer outside the module yet; exported beside FeeReceipt
  // so the pair stays discoverable together
  get ReceiptCounter() {
    return require('./models/FeeReceipt').ReceiptCounter;
  },

  // StudentFee — consumer: people/controllers/adminController (fee summary tile)
  get StudentFee() {
    return require('./models/StudentFee');
  },
};
