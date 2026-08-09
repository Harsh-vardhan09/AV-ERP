const mongoose = require('mongoose');
const logger   = require('../logging/logger');
const dns      = require('dns');

const connect = async () => {
    try {
        const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
        if (!connectionString) {
            throw new Error('MONGO_URI environment variable is not set in Render Environment Variables.');
        }

        // Public DNS: fixes querySrv ECONNREFUSED where the local/router resolver
        // does not support the SRV lookups a mongodb+srv:// URI needs
        try {
            dns.setServers(['8.8.8.8', '1.1.1.1']);
        } catch (dnsErr) {
            logger.warn('Failed to set custom DNS servers, using system default:', dnsErr.message);
        }

        // serverSelectionTimeoutMS fails fast when Mongo is unreachable at boot;
        // socketTimeoutMS closes idle sockets so they cannot leak
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
