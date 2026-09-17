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

/**
 * Live Google OAuth 2.0 Flow
 */
const googleAuth = (req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${env.CLIENT_URL}/login?notice=OAUTH_SETUP_REQUIRED`);
  }

  const crypto = require('crypto');
  const state = crypto.randomBytes(24).toString('hex');

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  });

  const queryParams = new URLSearchParams({
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    client_id: env.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'select_account',
    scope: 'openid email profile',
    state,
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${queryParams.toString()}`);
};

const googleCallback = async (req, res, next) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      return res.redirect(`${env.CLIENT_URL}/oauth/callback?error=${encodeURIComponent(error)}`);
    }

    const storedState = req.cookies.oauth_state;
    res.clearCookie('oauth_state');

    if (!state || !storedState || state !== storedState) {
      return res.redirect(`${env.CLIENT_URL}/oauth/callback?error=INVALID_OAUTH_STATE`);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect(`${env.CLIENT_URL}/oauth/callback?error=TOKEN_EXCHANGE_FAILED`);
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profile.email) {
      return res.redirect(`${env.CLIENT_URL}/oauth/callback?error=NO_EMAIL_FROM_GOOGLE`);
    }

    const result = await authService.oauthLogin({
      provider: 'google',
      email: profile.email,
      name: profile.name || profile.given_name || 'Google User',
      avatar: profile.picture || '',
      providerId: profile.sub,
      req,
    });

    setRefreshTokenCookie(res, result.refreshToken);
    return res.redirect(`${env.CLIENT_URL}/oauth/callback?token=${result.accessToken}`);
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
  googleAuth,
  googleCallback,
};
