const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { errorResponse } = require('../utils/apiResponse');

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'Too many requests from this IP. Please try again later.',
      null,
      'RATE_LIMIT_EXCEEDED'
    );
  },
});

// Strict rate limiter for sensitive authentication endpoints (brute-force defense)
const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.NODE_ENV === 'test' ? 1000 : env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'Too many authentication attempts. Please try again after 15 minutes.',
      null,
      'AUTH_RATE_LIMIT_EXCEEDED'
    );
  },
});

// Post / Comment creation limiter (anti-spam)
const contentCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      429,
      'Content creation rate limit reached. Please wait a few moments before posting again.',
      null,
      'SPAM_PROTECTION_LIMIT'
    );
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  contentCreationLimiter,
};
