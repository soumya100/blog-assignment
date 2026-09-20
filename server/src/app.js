const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput } = require('./middleware/security');
const { notFoundHandler, centralizedErrorHandler } = require('./middleware/errorHandler');

const app = express();

// Trust reverse proxies (Render, Heroku, Cloudflare) - 1 hop
app.set('trust proxy', 1);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for flexible client cross-origin dev
    crossOriginEmbedderPolicy: false,
  })
);

// CORS setup
const configuredOrigins = (env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]
  .filter(Boolean)
  .map((url) => url.replace(/\/$/, ''));

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;

  // Permit Render and Vercel cloud deployments for the platform
  if (/^https:\/\/[a-zA-Z0-9-_]+\.onrender\.com$/.test(normalized)) return true;
  if (/^https:\/\/[a-zA-Z0-9-_]+\.vercel\.app$/.test(normalized)) return true;

  // In development, permit local dev servers on any port (localhost, 127.0.0.1, LAN)
  if (env.NODE_ENV !== 'production') {
    if (
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized) ||
      /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(normalized)
    ) {
      return true;
    }
  }

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Cross-Origin Request Blocked by CORS Policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['set-cookie'],
  })
);

// HTTP Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request parsers with size boundaries (supports compressed user profile image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// NoSQL injection sanitizer
app.use(sanitizeInput);

// General rate limiter on all API endpoints
app.use('/api', apiLimiter);

// Versioned API Routes (and /api compatibility alias for provider callbacks)
app.use('/api/v1', routes);
app.use('/api', routes);

// Serve static client build if present (Unified Single-Service Deployment on Render)
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 Route Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(centralizedErrorHandler);

module.exports = app;
