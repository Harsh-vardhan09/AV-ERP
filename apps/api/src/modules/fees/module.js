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
  order:          190,
  // No limiter: this mount never had one, and razorpay/webhook is called by
  // Razorpay's infrastructure, not per user
  limiter:        null,

  routes:      require('./routes'),
  permissions: require('./permissions'),
  jobs:        [],
  events:      [],
};
