const mongoose = require('mongoose');

// globalSetup put the in-memory replica set's URI on MONGO_URI. Every suite
// shares that one mongod, so each connects and wipes rather than restarting it.
const connect = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  return mongoose.connection;
};

const clear = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

const disconnect = async () => {
  await mongoose.connection.close();
};

module.exports = { connect, clear, disconnect };
