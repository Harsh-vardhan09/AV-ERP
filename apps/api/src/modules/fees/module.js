module.exports = {
  // 'fee_management', not 'fees' — this key is persisted in SchoolSettings.modules
  // documents already. Renaming it would silently disable the module for every school.
  key:            'fee_management',
  label:          'Fee Management',
  description:    'Fee heads, structures, student fees, payments, refunds and reports',
  defaultEnabled: true,
  canDisable:     true,
  dependsOn:      ['core', 'people', 'academics'],
  basePath:       '/api/v1/fee',

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
