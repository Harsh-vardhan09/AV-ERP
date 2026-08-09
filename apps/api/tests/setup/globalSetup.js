const { MongoMemoryReplSet } = require('mongodb-memory-server');

// A replica set, not a standalone: the fee payment path runs inside
// session.withTransaction, which Mongo only supports on a replica set.
module.exports = async () => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  process.env.MONGO_URI = replSet.getUri('av_erp_test');
  globalThis.__MONGO_REPLSET__ = replSet;
};
