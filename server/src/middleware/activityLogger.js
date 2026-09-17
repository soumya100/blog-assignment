const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/**
 * Helper to record user activity in database without blocking the request flow
 * @param {Object} options 
 * @param {string} options.action - from ACTIVITY_TYPES
 * @param {string} options.resourceType - 'POST' | 'COMMENT' | 'USER' | 'AUTH' | 'ADMIN'
 * @param {string} [options.resourceId]
 * @param {Object} [options.details]
 * @param {import('express').Request} options.req
 */
const recordActivity = async ({ action, resourceType, resourceId = null, details = {}, req }) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const userId = req.user ? req.user._id : null;

    // Filter out any passwords or tokens from details
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.refreshToken;

    await ActivityLog.create({
      user: userId,
      action,
      resourceType,
      resourceId: resourceId ? resourceId.toString() : null,
      details: sanitizedDetails,
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    });
  } catch (err) {
    // Non-blocking failure; log error and proceed
    logger.error(`Failed to record activity log [${action}]: ${err.message}`);
  }
};

module.exports = {
  recordActivity,
};
