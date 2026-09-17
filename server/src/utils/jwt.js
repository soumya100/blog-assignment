const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Generate Access Token (Short-lived, e.g. 15m)
 * @param {Object} user 
 * @returns {string}
 */
const generateAccessToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    username: user.username,
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: 'devlog-api',
    audience: 'devlog-client',
  });
};

/**
 * Generate cryptographically secure refresh token string
 * @returns {string}
 */
const generateRefreshTokenString = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * SHA-256 Hash of refresh token for database storage
 * @param {string} token 
 * @returns {string}
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Verify Access Token
 * Explicitly restrict algorithms to prevent algorithm confusion attacks ('none', etc.)
 * @param {string} token 
 * @returns {Object} decoded payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: 'devlog-api',
    audience: 'devlog-client',
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
  verifyAccessToken,
};
