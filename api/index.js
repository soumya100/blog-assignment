const app = require('../server/src/app');
const { connectDB } = require('../server/src/config/database');
const logger = require('../server/src/utils/logger');

// Cache the DB connection across warm serverless invocations
let isConnected = false;

const connectIfNeeded = async () => {
  if (isConnected && require('mongoose').connection.readyState === 1) return;
  await connectDB();
  isConnected = true;
};

// Vercel serverless handler — Express app wrapped as a function
module.exports = async (req, res) => {
  try {
    await connectIfNeeded();
  } catch (err) {
    logger.error('DB connection failed in serverless handler:', err.message);
    return res.status(503).json({ success: false, message: 'Service temporarily unavailable.' });
  }
  return app(req, res);
};
