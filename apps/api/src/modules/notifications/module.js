// No 'notifications' key in @av-erp/shared — these routes were never gated by
// checkModuleAccess and still are not
module.exports = {
  key:            'notifications',
  label:          'Notifications',
  description:    'In-app notifications, per-user preferences, email delivery and digests',
  defaultEnabled: true,
  canDisable:     false,
  dependsOn:      ['core'],
  basePath:       '/api/v1/notifications',
  order:          240,

  // Preferences is a separate router on its own path, not nested under /notifications
  extraMounts: [
    {
      path:    '/api/v1/notification-preferences',
      routes:  require('./routes/notificationPreferenceRoutes'),
      auth:    'router',
      limiter: 'api',
      order:   250,
    },
  ],

  routes:      require('./routes'),
  permissions: require('./permissions'),

  jobs: [
    require.resolve('./jobs/notificationWorker'),
    require.resolve('./jobs/digestWorker'),
    require.resolve('./jobs/emailWorker'),
  ],

  // SMS and push are deliberately not implemented
  events: { channels: ['in_app', 'email'] },
};
