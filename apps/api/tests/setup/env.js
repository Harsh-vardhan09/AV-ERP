// Runs before the module registry is populated. Several modules read these at
// require time — oases/middlewares/auth throws outright without JWT_SECRET.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-16-chars';
process.env.SUPER_ADMIN_JWT_SECRET =
  process.env.SUPER_ADMIN_JWT_SECRET || 'test-super-admin-secret-16';
process.env.PLATFORM_SECRET = process.env.PLATFORM_SECRET || 'test-platform-secret-16';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Bull's factory returns a no-op stub instead of opening a Redis connection that
// would keep the run alive after the last assertion
process.env.REDIS_DISABLED = 'true';
