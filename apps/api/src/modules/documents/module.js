// key/label/description/defaultEnabled mirror the 'documents' entry in
// @av-erp/shared — documentRoutes gates on it via checkModuleAccess
module.exports = {
  key: 'documents',
  label: 'Documents (TC/Migration)',
  description: 'Transfer and migration certificate generation',
  defaultEnabled: true,
  canDisable: true,
  // 'people' owns StudentProfile/User, 'academics' owns the session and class data
  // the certificate snapshots read; both are still TEMP-marked cross-module reads.
  // 'tenancy' owns School + SchoolSettings, which schoolBrandingService reads for
  // the certificate letterhead (the controller already imported School).
  dependsOn: ['core', 'people', 'academics', 'tenancy'],
  basePath: '/api/v1/documents',
  order: 80,
  routes: require('./routes'),
  permissions: require('./permissions'),
  jobs: [],
  events: [],
};
