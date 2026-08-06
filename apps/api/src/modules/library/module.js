// The 'library' key is not yet registered in src-old/utils/moduleConstants, so this
// module is not gated by checkModuleAccess — adding it there changes school defaults
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
