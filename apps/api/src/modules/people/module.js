module.exports = {
  key: 'people',
  label: 'People',
  description: 'Students, teachers, staff and their profiles, enrolment and management screens',
  defaultEnabled: true,
  canDisable: false,
  dependsOn: ['core', 'identity'],

  // Reserved, nothing mounted there. All six routers below own top-level paths
  // that predate this module, the same arrangement as communication.
  basePath: '/api/v1/people',
  routes: null,

  order: 20,

  extraMounts: [
    {
      path: '/api/v1/admin',
      routes: require('./routes/adminRoutes'),
      auth: 'router',
      limiter: 'api',
      order: 20,
    },
    {
      path: '/api/v1/teacher',
      routes: require('./routes/teacherRoutes'),
      auth: 'router',
      limiter: 'api',
      order: 30,
    },
    {
      path: '/api/v1/student',
      routes: require('./routes/studentRoutes'),
      auth: 'router',
      limiter: 'api',
      order: 40,
    },
    {
      path: '/api/v1/staff',
      routes: require('./routes/staffRoutes'),
      auth: 'router',
      limiter: 'api',
      order: 230,
    },
    {
      path: '/api/v1/student-management',
      routes: require('./routes/studentManagementRoutes'),
      auth: 'router',
      limiter: 'api',
      order: 260,
    },
    {
      path: '/api/v1/teacher-management',
      routes: require('./routes/teacherManagementRoutes'),
      auth: 'router',
      limiter: 'api',
      order: 270,
    },
  ],

  // Not transcribed yet: adminRoutes, teacherRoutes and studentRoutes still resolve
  // most handlers out of the legacy god-controllers, which move during the extraction.
  // Transcribing now would pin a surface that is about to change.
  permissions: {},
  jobs: [],
  events: [],
};
