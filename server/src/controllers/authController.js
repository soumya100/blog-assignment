const crypto = require('crypto');
const authService = require('../services/authService');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Resolve target frontend client URL for OAuth redirects
 * Prioritizes explicit client query, request origin/referer, and falls back to CLIENT_URL
 */
const resolveClientUrl = (req, explicitClientUrl = null) => {
  const candidate =
    explicitClientUrl ||
    req?.query?.client_url ||
    req?.headers?.origin ||
    (req?.headers?.referer
      ? (() => {
          try {
            return new URL(req.headers.referer).origin;
          } catch (e) {
            return null;
          }
        })()
      : null) ||
    env.CLIENT_URL;

  if (candidate) {
    try {
      const normalized = candidate.trim().replace(/\/$/, '');
      if (
        /^https:\/\/[a-zA-Z0-9-_]+\.onrender\.com$/.test(normalized) ||
        /^https:\/\/[a-zA-Z0-9-_]+\.vercel\.app$/.test(normalized) ||
        normalized === env.CLIENT_URL.replace(/\/$/, '') ||
        normalized === 'http://localhost:5173' ||
        normalized === 'http://127.0.0.1:5173' ||
        normalized === 'http://localhost:3000' ||
        normalized === 'http://localhost:5174' ||
        (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized))
      ) {
        return normalized;
      }
    } catch (e) {
      // Fallback
    }
  }
  return env.CLIENT_URL.replace(/\/$/, '');
};

/**
 * Dynamically resolve provider OAuth callback URL
 * Prevents accidental localhost callback in production / Render deployment
 */
const resolveCallbackUrl = (provider, req = null) => {
  const configured = provider === 'google' ? env.GOOGLE_CALLBACK_URL : env.FACEBOOK_CALLBACK_URL;
  const isProd = env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  if (configured && (!isProd || !configured.includes('localhost'))) {
    return configured;
  }

  // Auto-detect production backend host from Render or request headers
  const backendBase =
    env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    (req
      ? `${req.secure || req.headers?.['x-forwarded-proto'] === 'https' ? 'https' : req.protocol}://${req.get('host')}`
      : '') ||
    'http://localhost:5000';

  return `${backendBase.replace(/\/$/, '')}/api/v1/auth/${provider}/callback`;
};

/**
 * Generate cryptographically signed OAuth state token
 * Combines timestamp, nonce, optional client return origin, and callback URI with HMAC-SHA256 signature
 */
const generateOAuthState = (clientUrl = '', callbackUrl = '') => {
  const timestamp = Date.now().toString(36);
  const nonce = crypto.randomBytes(16).toString('hex');
  const clientB64 = clientUrl ? Buffer.from(clientUrl).toString('base64url') : '';
  const cbB64 = callbackUrl ? Buffer.from(callbackUrl).toString('base64url') : '';
  const payload = `${timestamp}.${nonce}.${clientB64}.${cbB64}`;
  const signature = crypto
    .createHmac('sha256', env.COOKIE_SECRET || env.JWT_ACCESS_SECRET || 'dev_oauth_secret')
    .update(payload)
    .digest('hex');
  return `${payload}.${signature}`;
};

/**
 * Verify OAuth state against cookie or cryptographic HMAC
 * Resilient across cross-subdomain redirections and proxy partitions on Render
 */
const verifyOAuthState = (state, cookieState) => {
  if (!state) return { isValid: false, clientUrl: null, callbackUrl: null };

  const isDirectMatch = Boolean(cookieState && state === cookieState);

  try {
    const parts = state.split('.');
    if (parts.length === 3) {
      const [timestampStr, nonce, receivedSig] = parts;
      const timestamp = parseInt(timestampStr, 36);
      if (Date.now() - timestamp > 15 * 60 * 1000) {
        return { isValid: false, clientUrl: null, callbackUrl: null };
      }
      const payload = `${timestampStr}.${nonce}`;
      const expectedSig = crypto
        .createHmac('sha256', env.COOKIE_SECRET || env.JWT_ACCESS_SECRET || 'dev_oauth_secret')
        .update(payload)
        .digest('hex');

      if (
        receivedSig.length === expectedSig.length &&
        crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))
      ) {
        return { isValid: true, clientUrl: null, callbackUrl: null };
      }
    } else if (parts.length === 5) {
      const [timestampStr, nonce, clientB64, cbB64, receivedSig] = parts;
      const timestamp = parseInt(timestampStr, 36);
      if (Date.now() - timestamp > 15 * 60 * 1000) {
        return { isValid: false, clientUrl: null, callbackUrl: null };
      }
      const payload = `${timestampStr}.${nonce}.${clientB64}.${cbB64}`;
      const expectedSig = crypto
        .createHmac('sha256', env.COOKIE_SECRET || env.JWT_ACCESS_SECRET || 'dev_oauth_secret')
        .update(payload)
        .digest('hex');

      if (
        receivedSig.length === expectedSig.length &&
        crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig))
      ) {
        const clientUrl = clientB64 ? Buffer.from(clientB64, 'base64url').toString('utf8') : null;
        const callbackUrl = cbB64 ? Buffer.from(cbB64, 'base64url').toString('utf8') : null;
        return { isValid: true, clientUrl, callbackUrl };
      }
    }
  } catch (err) {
    // Malformed state
  }

  if (isDirectMatch) {
    return { isValid: true, clientUrl: null, callbackUrl: null };
  }

  return { isValid: false, clientUrl: null, callbackUrl: null };
};

const ACCESS_COOKIE_NAME = 'accessToken';
const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_NAME = REFRESH_COOKIE_NAME;

const getAuthCookieOptions = (req = null) => {
  const isHttps =
    Boolean(req && (req.secure || req.headers?.['x-forwarded-proto'] === 'https')) ||
    env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true';

  return {
    httpOnly: true,
    secure: isHttps,
    // 'none' is mandatory for cross-site cookie transmission (e.g. Vercel <-> Render or Render Static <-> Web Service)
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    // Chrome CHIPS (Cookies Having Independent Partitioned State)
    // Ensures Chrome 2024+ retains cross-site cookies between separate onrender.com subdomains
    ...(isHttps ? { partitioned: true } : {}),
  };
};

const setAuthCookies = (res, { accessToken, refreshToken }, req = null) => {
  const baseOptions = getAuthCookieOptions(req);

  if (refreshToken) {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  if (accessToken) {
    res.cookie(ACCESS_COOKIE_NAME, accessToken, {
      ...baseOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });
  }
};

const clearAuthCookies = (res, req = null) => {
  const baseOptions = getAuthCookieOptions(req);
  res.clearCookie(ACCESS_COOKIE_NAME, baseOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseOptions);
};

const setRefreshTokenCookie = (res, token, req = null) => {
  setAuthCookies(res, { refreshToken: token }, req);
};

const clearRefreshTokenCookie = (res, req = null) => {
  clearAuthCookies(res, req);
};

const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const result = await authService.register({ username, email, password, req });

    setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, req);

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
    }, req);

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
    }, req);

    return successResponse(res, 200, 'Token refreshed successfully', {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    clearAuthCookies(res, req);
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.cookies[COOKIE_NAME] || req.body.refreshToken;
    await authService.logout({ incomingRefreshToken, req });
    clearAuthCookies(res, req);

    return successResponse(res, 200, 'Logged out successfully');
  } catch (err) {
    clearAuthCookies(res, req);
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
    clearAuthCookies(res, req);

    return successResponse(res, 200, 'Token revoked successfully');
  } catch (err) {
    clearAuthCookies(res, req);
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

  // If authenticated via Bearer token without cookies (e.g. cross-origin/proxy callback landing),
  // ensure HttpOnly cookies are established for the caller's origin as well:
  if (!req.cookies?.accessToken && token && req.user) {
    setAuthCookies(res, { accessToken: token }, req);
  }

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
    }, req);

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
  const targetClientUrl = resolveClientUrl(req);

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    logger.warn('Google OAuth initiated but credentials are missing in environment.');
    return res.redirect(`${targetClientUrl}/login?notice=OAUTH_SETUP_REQUIRED&provider=google`);
  }

  const callbackUrl = resolveCallbackUrl('google', req);
  const state = generateOAuthState(targetClientUrl, callbackUrl);

  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || process.env.RENDER === 'true',
    sameSite: (env.NODE_ENV === 'production' || process.env.RENDER === 'true') ? 'none' : 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000,
    ...((env.NODE_ENV === 'production' || process.env.RENDER === 'true') ? { partitioned: true } : {}),
  });

  const queryParams = new URLSearchParams({
    redirect_uri: callbackUrl,
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
    const { code, state, error, error_description } = req.query;
    const storedState = req.cookies?.oauth_state;

    res.clearCookie('oauth_state', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production' || process.env.RENDER === 'true',
      sameSite: (env.NODE_ENV === 'production' || process.env.RENDER === 'true') ? 'none' : 'lax',
      path: '/',
    });

    const stateVerification = verifyOAuthState(state, storedState);
    const targetClientUrl = resolveClientUrl(req, stateVerification.clientUrl);

    if (error) {
      logger.warn('Google OAuth provider returned error:', { error, error_description });
      return res.redirect(`${targetClientUrl}/oauth/callback?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!stateVerification.isValid) {
      logger.warn('Google OAuth state verification failed.');
      return res.redirect(`${targetClientUrl}/oauth/callback?error=INVALID_OAUTH_STATE`);
    }

    const callbackUrl = stateVerification.callbackUrl || resolveCallbackUrl('google', req);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error('Google OAuth token exchange failed:', {
        status: tokenRes.status,
        error: tokenData.error,
        description: tokenData.error_description,
      });
      const errMsg = tokenData.error_description || tokenData.error || 'TOKEN_EXCHANGE_FAILED';
      return res.redirect(`${targetClientUrl}/oauth/callback?error=${encodeURIComponent(errMsg)}`);
    }

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profileRes.ok || !profile || !profile.email) {
      logger.error('Failed to retrieve user profile from Google:', { status: profileRes.status });
      return res.redirect(`${targetClientUrl}/oauth/callback?error=NO_EMAIL_FROM_GOOGLE`);
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
    }, req);

    return res.redirect(`${targetClientUrl}/oauth/callback?token=${result.accessToken}`);
  } catch (err) {
    next(err);
  }
};

/**
 * Live Facebook OAuth 2.0 Flow
 */
const facebookAuth = (req, res) => {
  const targetClientUrl = resolveClientUrl(req);

  if (!env.FACEBOOK_CLIENT_ID || !env.FACEBOOK_CLIENT_SECRET) {
    logger.warn('Facebook OAuth initiated but credentials are missing in environment.');
    return res.redirect(`${targetClientUrl}/login?notice=OAUTH_SETUP_REQUIRED&provider=facebook`);
  }

  const callbackUrl = resolveCallbackUrl('facebook', req);
  const state = generateOAuthState(targetClientUrl, callbackUrl);

  res.cookie('oauth_facebook_state', state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production' || process.env.RENDER === 'true',
    sameSite: (env.NODE_ENV === 'production' || process.env.RENDER === 'true') ? 'none' : 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000,
    ...((env.NODE_ENV === 'production' || process.env.RENDER === 'true') ? { partitioned: true } : {}),
  });

  const queryParams = new URLSearchParams({
    client_id: env.FACEBOOK_CLIENT_ID,
    redirect_uri: callbackUrl,
    state,
    scope: env.FACEBOOK_SCOPE || 'email,public_profile',
    response_type: 'code',
  });

  return res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${queryParams.toString()}`);
};

const facebookCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;
    const storedState = req.cookies?.oauth_facebook_state;

    res.clearCookie('oauth_facebook_state', {
      httpOnly: true,
      secure: env.NODE_ENV === 'production' || process.env.RENDER === 'true',
      sameSite: (env.NODE_ENV === 'production' || process.env.RENDER === 'true') ? 'none' : 'lax',
      path: '/',
    });

    const stateVerification = verifyOAuthState(state, storedState);
    const targetClientUrl = resolveClientUrl(req, stateVerification.clientUrl);

    if (error) {
      logger.warn('Facebook OAuth provider returned error:', { error, error_description });
      return res.redirect(`${targetClientUrl}/oauth/callback?error=${encodeURIComponent(error_description || error)}`);
    }

    if (!stateVerification.isValid) {
      logger.warn('Facebook OAuth state verification failed.');
      return res.redirect(`${targetClientUrl}/oauth/callback?error=INVALID_OAUTH_STATE`);
    }

    const callbackUrl = stateVerification.callbackUrl || resolveCallbackUrl('facebook', req);

    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${new URLSearchParams({
      client_id: env.FACEBOOK_CLIENT_ID,
      client_secret: env.FACEBOOK_CLIENT_SECRET,
      redirect_uri: callbackUrl,
      code,
    }).toString()}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error('Facebook OAuth token exchange failed:', {
        status: tokenRes.status,
        error: tokenData.error?.message || tokenData.error,
      });
      const errMsg = tokenData.error?.message || 'TOKEN_EXCHANGE_FAILED';
      return res.redirect(`${targetClientUrl}/oauth/callback?error=${encodeURIComponent(errMsg)}`);
    }

    // Fetch Facebook User Profile
    const profileUrl = `https://graph.facebook.com/me?${new URLSearchParams({
      fields: 'id,name,email,picture.type(large)',
      access_token: tokenData.access_token,
    }).toString()}`;

    const profileRes = await fetch(profileUrl);
    const profile = await profileRes.json();

    if (!profileRes.ok || !profile || !profile.id) {
      logger.error('Failed to retrieve user profile from Facebook:', {
        status: profileRes.status,
        error: profile?.error?.message,
      });
      return res.redirect(`${targetClientUrl}/oauth/callback?error=FACEBOOK_PROFILE_FAILED`);
    }

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
    }, req);

    return res.redirect(`${targetClientUrl}/oauth/callback?token=${result.accessToken}`);
  } catch (err) {
    next(err);
  }
};

/**
 * OAuth Session Establishment Endpoint
 * Enables frontend SPAs (especially when deployed across separate subdomains or proxies on Render)
 * to establish HttpOnly cookies directly on the caller's origin after a successful OAuth redirect.
 */
const oauthSession = async (req, res, next) => {
  try {
    const token =
      req.body.token ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return errorResponse(res, 400, 'OAuth access token required to establish session', null, 'TOKEN_REQUIRED');
    }

    const { verifyAccessToken } = require('../utils/jwt');
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return errorResponse(res, 401, 'Invalid or expired OAuth token', null, 'INVALID_TOKEN');
    }

    const User = require('../models/User');
    const RefreshToken = require('../models/RefreshToken');
    const { generateRefreshTokenString, hashToken } = require('../utils/jwt');

    const user = await User.findById(decoded.sub);
    if (!user || user.status === 'DEACTIVATED') {
      return errorResponse(res, 401, 'User account invalid or deactivated', null, 'USER_INACTIVE');
    }

    // Look for active refresh token or create new rotation family
    let refreshTokenRecord = await RefreshToken.findOne({
      user: user._id,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    let refreshTokenRaw = null;
    if (!refreshTokenRecord) {
      refreshTokenRaw = generateRefreshTokenString();
      const tokenHash = hashToken(refreshTokenRaw);
      await RefreshToken.create({
        tokenHash,
        user: user._id,
        familyId: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    setAuthCookies(res, {
      accessToken: token,
      refreshToken: refreshTokenRaw,
    }, req);

    return successResponse(res, 200, 'OAuth session established successfully', {
      user: user.toSafeObject(),
      accessToken: token,
    });
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

    clearAuthCookies(res, req);

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
  oauthSession,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
