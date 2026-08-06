// 'library' is registered in @av-erp/shared (defaultEnabled true). The routes still
// do not call checkModuleAccess, so the toggle is declared but not enforced yet
module.exports = {
  key:            'library',
  label:          'Library',
  description:    'Book catalogue, issue and return, librarian accounts',
  defaultEnabled: true,
  canDisable:     true,
  // 'people' does not exist yet — it owns the User/StudentProfile this module
  // still reaches into src-old for, marked TEMP in the controller and service
  dependsOn:      ['core', 'people'],
  basePath:       '/api/v1/library',
  routes:         require('./routes'),
  permissions:    require('./permissions'),
  jobs:           [],
  events:         [],
};
