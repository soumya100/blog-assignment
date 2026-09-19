const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const env = require('../config/env');

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_NAME = REFRESH_COOKIE_NAME;

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const isProduction = env.NODE_ENV === 'production';

  if (refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      // 'none' required for cross-domain cookies (Vercel frontend <-> Render backend)
      // 'none' must always be paired with secure:true (enforced above)
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  if (accessToken) {
    res.cookie(ACCESS_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
  }
};

const clearAuthCookies = (res) => {
  const isProduction = env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  };

  res.clearCookie(ACCESS_COOKIE_NAME, cookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
};

const setRefreshTokenCookie = (res, token) => {
  setAuthCookies(res, { refreshToken: token });
};

const clearRefreshTokenCookie = (res) => {
  clearAuthCookies(res);
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register({ username, email, password, req });

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

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

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

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
    const incomingRefreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.cookies[COOKIE_NAME] || req.body.refreshToken;
    if (!incomingRefreshToken) {
      return errorResponse(res, 401, 'Refresh token not found in cookies or request body', null, 'REFRESH_TOKEN_REQUIRED');
    }

    const result = await authService.refresh({ incomingRefreshToken, req });
    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    return successResponse(res, 200, 'Token refreshed successfully', {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    clearAuthCookies(res);
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.cookies[COOKIE_NAME] || req.body.refreshToken;
    await authService.logout({ incomingRefreshToken, req });
    clearAuthCookies(res);

    return successResponse(res, 200, 'Logged out successfully');
  } catch (err) {
    clearAuthCookies(res);
    next(err);
  }
};

const revoke = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.cookies[COOKIE_NAME] || req.body.refreshToken || req.body.token;
    if (!incomingRefreshToken) {
      return errorResponse(res, 400, 'Refresh token required for revocation', null, 'TOKEN_REQUIRED');
    }

    await authService.revokeToken({ incomingRefreshToken, req });
    clearAuthCookies(res);

    return successResponse(res, 200, 'Token revoked successfully');
  } catch (err) {
    clearAuthCookies(res);
    next(err);
  }
};

const getMe = async (req, res) => {
  const token =
    (req.cookies && req.cookies.accessToken) ||
    (req.signedCookies && req.signedCookies.accessToken) ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  return successResponse(res, 200, 'User profile retrieved', {
    user: req.user.toSafeObject(),
    accessToken: token,
  });
};

const updateProfile = async (req, res, next) => {
  try {
    const { bio, avatar } = req.body;
    const user = await authService.updateProfile({
      userId: req.user._id,
      bio,
      avatar,
      req,
    });

    return successResponse(res, 200, 'Profile updated successfully', {
      user,
    });
  } catch (err) {
    next(err);
  }
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

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

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

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${env.CLIENT_URL}/oauth/callback?token=${result.accessToken}`);
  } catch (err) {
    next(err);
  }
};

/**
 * Live Facebook OAuth 2.0 Flow
 */
const facebookAuth = (req, res) => {
  if (!env.FACEBOOK_CLIENT_ID || !env.FACEBOOK_CLIENT_SECRET) {
    return res.redirect(`${env.CLIENT_URL}/login?notice=OAUTH_SETUP_REQUIRED&provider=facebook`);
  }

  const crypto = require('crypto');
  const state = crypto.randomBytes(24).toString('hex');

  res.cookie('oauth_facebook_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
  });

  const queryParams = new URLSearchParams({
    client_id: env.FACEBOOK_CLIENT_ID,
    redirect_uri: env.FACEBOOK_CALLBACK_URL,
    state,
    scope: env.FACEBOOK_SCOPE || 'public_profile',
    response_type: 'code',
  });

  return res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${queryParams.toString()}`);
};

const facebookCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;
    if (error) {
      return res.redirect(`${env.CLIENT_URL}/oauth/callback?error=${encodeURIComponent(error_description || error)}`);
    }

    const storedState = req.cookies.oauth_facebook_state;
    res.clearCookie('oauth_facebook_state');

    if (!state || !storedState || state !== storedState) {
      return res.redirect(`${env.CLIENT_URL}/oauth/callback?error=INVALID_OAUTH_STATE`);
    }

    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${new URLSearchParams({
      client_id: env.FACEBOOK_CLIENT_ID,
      client_secret: env.FACEBOOK_CLIENT_SECRET,
      redirect_uri: env.FACEBOOK_CALLBACK_URL,
      code,
    }).toString()}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      return res.redirect(`${env.CLIENT_URL}/oauth/callback?error=TOKEN_EXCHANGE_FAILED`);
    }

    // Fetch Facebook User Profile
    const profileUrl = `https://graph.facebook.com/me?${new URLSearchParams({
      fields: 'id,name,email,picture.type(large)',
      access_token: tokenData.access_token,
    }).toString()}`;

    const profileRes = await fetch(profileUrl);
    const profile = await profileRes.json();

    if (!profile.email) {
      profile.email = `facebook_${profile.id}@devlog-user.internal`;
    }

    const avatarUrl = profile.picture?.data?.url || '';

    const result = await authService.oauthLogin({
      provider: 'facebook',
      email: profile.email,
      name: profile.name || 'Facebook User',
      avatar: avatarUrl,
      providerId: profile.id,
      req,
    });

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    return res.redirect(`${env.CLIENT_URL}/oauth/callback?token=${result.accessToken}`);
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset({ email, req });

    const responseData = {
      previewUrl: result.previewUrl,
    };
    if (env.NODE_ENV === 'test') {
      responseData.resetUrl = result.resetUrl;
    }

    return successResponse(res, 200, result.message, responseData);
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyPasswordResetOtp({
      email,
      otp,
      req,
    });

    return successResponse(res, 200, result.message, {
      resetToken: result.resetToken,
    });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const result = await authService.resetPassword({
      token,
      newPassword: password,
      req,
    });

    clearAuthCookies(res);

    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  revoke,
  getMe,
  updateProfile,
  oauthDevLogin,
  googleAuth,
  googleCallback,
  facebookAuth,
  facebookCallback,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
