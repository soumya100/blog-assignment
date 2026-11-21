const mongoose = require('mongoose');
const dns = require('dns');
const env = require('./env');
const logger = require('../utils/logger');

// Prevent querySrv ETIMEOUT on Windows / ISPs that drop DNS SRV queries
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (dnsErr) {
  // Fallback to default system resolver if custom DNS cannot be configured
}

let mongoMemoryServer = null;

const connectDB = async (uriOverride = null) => {
  env.validateProductionConfig();
  const targetUri = uriOverride || env.MONGODB_URI;

  if (env.NODE_ENV === 'production' && !targetUri) {
    throw new Error('MONGODB_URI is required in production. Refusing to start without the configured database.');
  }

  if (targetUri) {
    try {
      logger.info('Connecting to configured MongoDB database.');
      await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 5000,
      });
      logger.info('Connected to MongoDB successfully.');
      return;
    } catch (err) {
      if (env.NODE_ENV === 'production') {
        logger.error('Production database connection failed. Refusing in-memory fallback.');
        throw err;
      }
      logger.warn(`External MongoDB connection failed: ${err.message}. Checking development fallback...`);
    }
  }

  // Embedded MongoDB is strictly a development/test convenience.
  if (env.NODE_ENV === 'production') {
    throw new Error('In-memory MongoDB is disabled in production.');
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    logger.info('Initializing embedded MongoMemoryServer for development/testing...');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    logger.info('Connected to embedded MongoDB for development/testing.');
  } catch (err) {
    logger.error(`Failed to initialize embedded MongoDB: ${err.message}`);
    throw err;
  }
};

const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
    logger.info('Disconnected from MongoDB.');
  } catch (err) {
    logger.error(`Error during MongoDB disconnect: ${err.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
