module.exports = {
  key:            'imports',
  label:          'Bulk Import',
  description:    'CSV and XLSX import of students, teachers, fees and attendance',
  defaultEnabled: true,
  canDisable:     true,
  dependsOn:      ['core', 'people', 'academics'],
  basePath:       '/api/v1/import',
  order:          300,

  routes:      require('./routes'),
  permissions: require('./permissions'),

  // The worker is driven by init.js, which nothing calls yet — see docs/import-system.md.
  // Registering it here would start a processor for a queue no one fills.
  jobs:        [],
  events:      [],
};
