const { bootJobs } = require('../moduleLoader');

// The worker list comes from each module's manifest `jobs` array, collected when
// registerModules ran. Requiring them here rather than at registration keeps Bull
// processors from starting before the DB connection is up.
module.exports = { bootWorkers: bootJobs };
