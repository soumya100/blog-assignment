const path = require('path');
const dotenv = require('dotenv');

// Load .env from server directory first, fallback to root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const env = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || '',
  AI_API_KEY: process.env.AI_API_KEY || '',
  AI_BASE_URL: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  AI_MODEL: process.env.AI_MODEL || '',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
  MONGODB_URI: process.env.MONGODB_URI || '',

  // Development-only OAuth sandbox. Production never enables this by default.
  ENABLE_DEV_OAUTH: process.env.ENABLE_DEV_OAUTH === 'true',

  // Optional Upstash Redis REST cache (fail-open when not configured/unavailable)
  REDIS_REST_URL: process.env.REDIS_REST_URL || '',
  REDIS_REST_TOKEN: process.env.REDIS_REST_TOKEN || '',

  // JWT configuration. Safe local defaults are deliberately unavailable in production.
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || (isProduction ? '' : 'dev_secret_access_key_minimum_32_characters_1234567890'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (isProduction ? '' : 'dev_secret_refresh_key_minimum_32_characters_0987654321'),

  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Cookies
  COOKIE_SECRET: process.env.COOKIE_SECRET || (isProduction ? '' : 'dev_cookie_secret_minimum_32_chars_abcdef123456'),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  // Rate limits
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
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

  // Admin bootstrap credentials are used only by explicit non-production seed workflows.
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || (isProduction ? '' : 'admin@blogplatform.dev'),
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || (isProduction ? '' : 'AdminSecurePass123!'),
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || (isProduction ? '' : 'systemadmin'),

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

const validateProductionConfig = () => {
  if (env.NODE_ENV !== 'production') return;

  const requiredSecrets = [
    ['JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
    ['COOKIE_SECRET', env.COOKIE_SECRET],
  ];

  const invalidValues = new Set([
    'changeme',
    'change-me',
    'secret',
    'password',
    'your-secret',
    'replace-me',
  ]);

  const invalid = [];
  for (const [name, value] of requiredSecrets) {
    if (
      typeof value !== 'string' ||
      value.length < 32 ||
      invalidValues.has(value.toLowerCase()) ||
      value.toLowerCase().includes('dev_secret') ||
      value.toLowerCase().includes('dev_cookie')
    ) {
      invalid.push(name);
    }
  }

  const configuredValues = requiredSecrets.map(([, value]) => value).filter(Boolean);
  if (new Set(configuredValues).size !== configuredValues.length) {
    invalid.push('JWT_ACCESS_SECRET/JWT_REFRESH_SECRET/COOKIE_SECRET (must be independent)');
  }

  if (invalid.length) {
    throw new Error(`Unsafe production configuration. Set strong, independent values for: ${invalid.join(', ')}.`);
  }
};

env.validateProductionConfig = validateProductionConfig;

module.exports = env;
