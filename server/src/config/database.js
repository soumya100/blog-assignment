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
  // Serverless connection caching: reuse existing open connection across warm invocations
  if (
    !uriOverride &&
    global._mongooseConnection &&
    mongoose.connection.readyState === 1
  ) {
    return;
  }

  const targetUri = uriOverride || env.MONGODB_URI;

  if (targetUri) {
    try {
      logger.info(`Connecting to MongoDB at: ${targetUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
      await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 5000,
      });
      global._mongooseConnection = mongoose.connection;
      logger.info('Connected to MongoDB successfully.');
      return;
    } catch (err) {
      logger.warn(`External MongoDB connection failed: ${err.message}. Checking fallback...`);
      if (env.NODE_ENV === 'production') {
        logger.error('Production database connection failed. Exiting process.');
        process.exit(1);
      }
    }
  }

  // Development / Test fallback: MongoMemoryServer
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    logger.info('Initializing embedded MongoMemoryServer for development/testing...');
    mongoMemoryServer = await MongoMemoryServer.create();
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    logger.info(`Connected to embedded MongoDB at: ${memoryUri}`);
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
