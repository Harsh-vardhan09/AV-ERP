// 'academics' is not a key in @av-erp/shared — the module is structural, not toggleable.
// The assignment routes gate on the separate 'assignments' registry key, which they
// already call via checkModuleAccess and which must keep working unchanged.
module.exports = {
  key: 'academics',
  label: 'Academics',
  description: 'Sessions, classes, sections, subjects and their teacher mappings',
  defaultEnabled: true,
  canDisable: false,
  dependsOn: ['core', 'tenancy'],
  basePath: '/api/v1/academics',

  // Nothing serves the basePath yet, so routes/index.js is an empty router and the
  // loader skips it. Assignments keep their own top-level path.
  routes: require('./routes'),

  // order 90 is load-bearing: /api/v1/assignment mounted ABOVE the bare /api/v1
  // complaint router (order 130), which applies a router-level varifyToken to
  // everything below it. Moving this down changes unauthenticated responses.
  extraMounts: [
    {
      path: '/api/v1/assignment',
      routes: require('./routes/assignmentRoutes'),
      auth: 'router',
      limiter: 'api',
      order: 90,
    },
  ],

  permissions: require('./permissions'),
  jobs: [],
  events: [],
};
