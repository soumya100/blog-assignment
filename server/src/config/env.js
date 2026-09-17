const path = require('path');
const dotenv = require('dotenv');

// Load .env from server directory first, fallback to root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || '',

  // JWT configuration
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_secret_access_key_minimum_32_characters_1234567890',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_secret_refresh_key_minimum_32_characters_0987654321',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Cookies
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'dev_cookie_secret_minimum_32_chars_abcdef123456',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  // Rate limits
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  AUTH_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
  AUTH_RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10', 10),

  // OAuth 2.0 Credentials
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',

  FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID || '',
  FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET || '',
  FACEBOOK_CALLBACK_URL: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/facebook/callback',

  // Admin seed defaults
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@blogplatform.dev',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecurePass123!',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'systemadmin',
};

module.exports = env;
