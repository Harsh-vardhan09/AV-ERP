// Public API of the documents module.
//
// Getters, not eager requires: an eager barrel pulls its controllers' whole
// dependency tree at load time, which is how the tenancy <-> notifications
// cycle formed. Deferring to first access keeps each consumer's load minimal.
module.exports = {
  // globalTemplateController: mounted by modules/tenancy/routes/superAdminRoutes under
  // /api/super-admin/templates/* — the only cross-module consumer today
   get globalTemplateController() { return require('./controllers/globalTemplateController'); },
};
