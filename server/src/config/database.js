const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let mongoMemoryServer = null;

const connectDB = async (uriOverride = null) => {
  const targetUri = uriOverride || env.MONGODB_URI;

  if (targetUri) {
    try {
      logger.info(`Connecting to MongoDB at: ${targetUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
      await mongoose.connect(targetUri, {
        serverSelectionTimeoutMS: 5000,
      });
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
