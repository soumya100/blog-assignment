const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/apiResponse');
const { USER_STATUS, ROLES } = require('../constants/roles');

/**
 * Extract access token from HttpOnly cookie or Authorization header
 */
const extractAccessToken = (req) => {
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  if (req.signedCookies && req.signedCookies.accessToken) {
    return req.signedCookies.accessToken;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
};

/**
 * Require valid JWT access token from HttpOnly cookie or Authorization header
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = extractAccessToken(req);
    if (!token) {
      return errorResponse(res, 401, 'Authentication token missing or malformed', null, 'UNAUTHORIZED');
    }
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Access token has expired', null, 'TOKEN_EXPIRED');
      }
      return errorResponse(res, 401, 'Invalid access token', null, 'INVALID_TOKEN');
    }

    // Server-side authoritative verification (do not blindly trust decoded claims)
    const user = await User.findById(decoded.sub).select('+password');
    if (!user) {
      return errorResponse(res, 401, 'User account no longer exists', null, 'USER_NOT_FOUND');
    }

    if (user.status === USER_STATUS.DEACTIVATED) {
      return errorResponse(res, 403, 'Account is deactivated. Please contact support.', null, 'ACCOUNT_DEACTIVATED');
    }

    req.user = user;
    next();
  } catch (err) {
    return errorResponse(res, 500, 'Authentication error', null, 'INTERNAL_AUTH_ERROR');
  }
};

/**
 * Require specific role(s) (RBAC)
 * @param  {...string} roles 
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required', null, 'UNAUTHORIZED');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'Access denied. Insufficient permissions.', null, 'FORBIDDEN');
    }

    next();
  };
};

/**
 * Require ownership of a document or Admin privileges (BOLA / IDOR Prevention)
 * @param {import('mongoose').Model} Model 
 * @param {string} idParamName 
 * @param {string} authorFieldName 
 */
const requireOwnership = (Model, idParamName = 'id', authorFieldName = 'author') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParamName];
      if (!resourceId) {
        return errorResponse(res, 400, 'Resource identifier missing', null, 'BAD_REQUEST');
      }

      const resource = await Model.findById(resourceId);
      if (!resource || resource.isDeleted) {
        return errorResponse(res, 404, 'Resource not found', null, 'NOT_FOUND');
      }

      // Check ownership or admin status
      const isOwner = resource[authorFieldName] && resource[authorFieldName].toString() === req.user._id.toString();
      const isAdmin = req.user.role === ROLES.ADMIN;

      if (!isOwner && !isAdmin) {
        return errorResponse(res, 403, 'You do not have permission to modify this resource', null, 'FORBIDDEN');
      }

      req.resource = resource;
      next();
    } catch (err) {
      if (err.name === 'CastError') {
        return errorResponse(res, 400, 'Invalid resource ID format', null, 'INVALID_ID');
      }
      return errorResponse(res, 500, 'Error verifying resource ownership', null, 'INTERNAL_ERROR');
    }
  };
};

/**
 * Optional authentication: attaches req.user if token is present and valid,
 * but allows public requests to proceed if omitted.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractAccessToken(req);
    if (token) {
      try {
        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.sub);
        if (user && user.status === USER_STATUS.ACTIVE) {
          req.user = user;
        }
      } catch (e) {
        // Silently ignore token errors for optional auth
      }
    }
    next();
  } catch (err) {
    next();
  }
};

module.exports = {
  requireAuth,
  requireRole,
  requireOwnership,
  optionalAuth,
};
