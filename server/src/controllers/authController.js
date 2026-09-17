const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const env = require('../config/env');

const COOKIE_NAME = 'refreshToken';

const setRefreshTokenCookie = (res, token) => {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: env.COOKIE_DOMAIN || undefined,
  });
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    domain: env.COOKIE_DOMAIN || undefined,
  });
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register({ username, email, password, req });

    setRefreshTokenCookie(res, result.refreshToken);

    return successResponse(res, 201, 'Registration successful', {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken, // Also returned for non-cookie / API clients
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password, req });

    setRefreshTokenCookie(res, result.refreshToken);

    return successResponse(res, 200, 'Login successful', {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies[COOKIE_NAME] || req.body.refreshToken;
    if (!incomingRefreshToken) {
      return errorResponse(res, 401, 'Refresh token not found in cookies or request body', null, 'REFRESH_TOKEN_REQUIRED');
    }

    const result = await authService.refresh({ incomingRefreshToken, req });
    setRefreshTokenCookie(res, result.refreshToken);

    return successResponse(res, 200, 'Token refreshed successfully', {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    clearRefreshTokenCookie(res);
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies[COOKIE_NAME] || req.body.refreshToken;
    await authService.logout({ incomingRefreshToken, req });
    clearRefreshTokenCookie(res);

    return successResponse(res, 200, 'Logged out successfully');
  } catch (err) {
    clearRefreshTokenCookie(res);
    next(err);
  }
};

const getMe = async (req, res) => {
  return successResponse(res, 200, 'User profile retrieved', {
    user: req.user.toSafeObject(),
  });
};

/**
 * OAuth Dev Sandbox / Mock Endpoint
 * Enables immediate evaluation of Google/Facebook authentication without needing external OAuth credentials
 */
const oauthDevLogin = async (req, res, next) => {
  try {
    const { provider, email, name, avatar } = req.body;
    const providerId = `dev_${provider}_${Date.now()}`;
    const result = await authService.oauthLogin({
      provider,
      email,
      name,
      avatar,
      providerId,
      req,
    });

    setRefreshTokenCookie(res, result.refreshToken);

    return successResponse(res, 200, `${provider} authentication successful`, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  oauthDevLogin,
};
