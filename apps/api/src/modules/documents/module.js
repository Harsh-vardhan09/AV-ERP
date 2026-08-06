// key/label/description/defaultEnabled mirror the 'documents' entry in
// @av-erp/shared — documentRoutes gates on it via checkModuleAccess
module.exports = {
  key:            'documents',
  label:          'Documents (TC/Migration)',
  description:    'Transfer and migration certificate generation',
  defaultEnabled: true,
  canDisable:     true,
  // 'people' owns StudentProfile/User, 'academics' owns the session and class data
  // the certificate snapshots read; both are still reached via src-old (TEMP-marked)
  dependsOn:      ['core', 'people', 'academics'],
  basePath:       '/api/v1/documents',
  routes:         require('./routes'),
  permissions:    require('./permissions'),
  jobs:           [],
  events:         [],
};
