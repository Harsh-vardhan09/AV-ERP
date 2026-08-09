module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
  // One mongod for the whole run; workers would each start their own
  maxWorkers: 1,
  // First run downloads a mongod binary
  testTimeout: 120000,
  // Mongoose and the socket server keep handles open past the last assertion,
  // so jest would sit there instead of exiting and CI would hang.
  forceExit: true,
};
