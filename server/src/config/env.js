const path = require('path');
const dotenv = require('dotenv');

// Load .env from server directory first, fallback to root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || '',
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
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_APP_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_APP_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',

  FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET || '',
  FACEBOOK_CALLBACK_URL: process.env.FACEBOOK_CALLBACK_URL || '',
  FACEBOOK_SCOPE: process.env.FACEBOOK_SCOPE || 'email,public_profile',

  // Admin seed defaults
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@blogplatform.dev',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'AdminSecurePass123!',
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'systemadmin',

  // SMTP / Gmail Email Configuration
  SMTP_HOST: process.env.SMTP_HOST || process.env.MAIL_HOST || process.env.EMAIL_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || process.env.EMAIL_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.MAIL_SECURE === 'true',
  SMTP_SERVICE: process.env.SMTP_SERVICE || '',
  SMTP_USER: process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || process.env.MAIL_PASS || process.env.MAIL_PASSWORD || '',
  EMAIL_USER: process.env.EMAIL_USER || process.env.SMTP_USER || process.env.MAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASS || process.env.MAIL_PASSWORD || '',
  SMTP_FROM: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.MAIL_FROM || '',
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.MAIL_FROM || '',
};

module.exports = env;
