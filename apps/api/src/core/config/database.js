const mongoose = require('mongoose');
const logger   = require('../logging/logger');
const dns      = require('dns');

const connect = async () => {
    try {
        const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
        if (!connectionString) {
            throw new Error('MONGO_URI environment variable is not set in Render Environment Variables.');
        }

        // Set Node's DNS resolver to use public DNS servers (Google/Cloudflare).
        // This resolves the querySrv ECONNREFUSED error on environments where the local/router DNS doesn't support SRV lookups.
        try {
            dns.setServers(['8.8.8.8', '1.1.1.1']);
        } catch (dnsErr) {
            logger.warn('Failed to set custom DNS servers, using system default:', dnsErr.message);
        }

        // FIX LOW-9: Add production-grade connection options.
        // maxPoolSize controls how many simultaneous connections Mongoose maintains.
        // serverSelectionTimeoutMS: fail fast if MongoDB is unreachable at boot.
        // socketTimeoutMS: close idle sockets to prevent resource leaks.
        await mongoose.connect(connectionString, {
            maxPoolSize:               10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS:          45000,
        });

        logger.info('DATABASE — connected successfully');
    } catch (error) {
        logger.error('DATABASE — connection error', { error: error.message });
        process.exit(1);
    }
};

module.exports = connect;
