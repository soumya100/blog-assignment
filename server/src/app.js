const express = require('express');
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

// Trust reverse proxies if running behind Nginx / Heroku / AWS ALB
app.set('trust proxy', 1);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled for flexible client cross-origin dev
    crossOriginEmbedderPolicy: false,
  })
);

// CORS setup
const allowedOrigins = [
  env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, or specify strict origins
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

// Versioned API Routes
app.use('/api/v1', routes);

// 404 Route Handler
app.use(notFoundHandler);

// Centralized Error Handler
app.use(centralizedErrorHandler);

module.exports = app;
