const logger = require('../utils/logger');
const { errorResponse } = require('../utils/apiResponse');
const env = require('../config/env');

const notFoundHandler = (req, res) => {
  return errorResponse(res, 404, `Route ${req.method} ${req.originalUrl} not found`, null, 'ROUTE_NOT_FOUND');
};

// Centralized Express error-handling middleware
const centralizedErrorHandler = (err, req, res, next) => {
  // CORS policy violation error
  if (err.message && err.message.includes('CORS Policy')) {
    logger.warn(`CORS blocked request from origin: ${req.headers.origin || 'unknown'}`);
    return errorResponse(res, 403, err.message, null, 'CORS_ERROR');
  }

  logger.error(`Unhandled Request Error: ${err.message}`, {
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  // Malformed JSON request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'Malformed JSON payload in request body', null, 'INVALID_JSON');
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return errorResponse(
      res,
      409,
      `An entity with this ${field} already exists.`,
      [{ field, message: `${field} is already in use` }],
      'DUPLICATE_RESOURCE'
    );
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, 400, `Invalid value provided for ${err.path}`, null, 'INVALID_ID_FORMAT');
  }

  // Mongoose schema validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(res, 400, 'Validation Error', details, 'VALIDATION_ERROR');
  }

  // Custom operational errors with explicit status
  const statusCode = err.statusCode || err.status || 500;
  const isOperational = err.isOperational || (statusCode >= 400 && statusCode < 500);
  const message = isOperational || env.NODE_ENV !== 'production' ? err.message : 'Internal Server Error';
  const code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_SERVER_ERROR';

  return errorResponse(res, statusCode, message, null, code);
};

module.exports = {
  notFoundHandler,
  centralizedErrorHandler,
};
