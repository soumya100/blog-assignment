const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { errorResponse } = require('../utils/apiResponse');

const createLimiter = ({ windowMs, max, message, code }) => rateLimit({
  windowMs,
  max: env.NODE_ENV === 'test' ? 1000 : max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => errorResponse(res, 429, message, null, code),
});

// Keep unrelated authentication operations in independent buckets.
const apiLimiter = createLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP. Please try again later.',
  code: 'RATE_LIMIT_EXCEEDED',
});
const authLimiter = createLimiter({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});
const registerLimiter = createLimiter({ windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX_REQUESTS, message: 'Too many registration attempts. Please try again later.', code: 'REGISTER_RATE_LIMIT_EXCEEDED' });
const loginLimiter = createLimiter({ windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX_REQUESTS, message: 'Too many login attempts. Please try again later.', code: 'LOGIN_RATE_LIMIT_EXCEEDED' });
const refreshLimiter = createLimiter({ windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX_REQUESTS, message: 'Too many refresh attempts. Please try again later.', code: 'REFRESH_RATE_LIMIT_EXCEEDED' });
const recoveryLimiter = createLimiter({ windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX_REQUESTS, message: 'Too many password recovery attempts. Please try again later.', code: 'RECOVERY_RATE_LIMIT_EXCEEDED' });
const oauthLimiter = createLimiter({ windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, max: env.AUTH_RATE_LIMIT_MAX_REQUESTS, message: 'Too many OAuth attempts. Please try again later.', code: 'OAUTH_RATE_LIMIT_EXCEEDED' });

const viewTrackingLimiter = createLimiter({ windowMs: 60 * 1000, max: 60, message: 'View tracking rate limit reached.', code: 'VIEW_RATE_LIMIT_EXCEEDED' });
const postCreationLimiter = createLimiter({ windowMs: 5 * 60 * 1000, max: 30, message: 'Post creation rate limit reached. Please wait before posting again.', code: 'POST_RATE_LIMIT_EXCEEDED' });
const commentCreationLimiter = createLimiter({ windowMs: 5 * 60 * 1000, max: 30, message: 'Comment creation rate limit reached. Please wait before commenting again.', code: 'COMMENT_RATE_LIMIT_EXCEEDED' });
const importCreationLimiter = createLimiter({ windowMs: 5 * 60 * 1000, max: 5, message: 'Import rate limit reached. Please wait before importing again.', code: 'IMPORT_RATE_LIMIT_EXCEEDED' });

module.exports = {
  apiLimiter, authLimiter, registerLimiter, loginLimiter, refreshLimiter, recoveryLimiter, oauthLimiter,
  viewTrackingLimiter, postCreationLimiter, commentCreationLimiter, importCreationLimiter,
};
