const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateAccessToken, generateRefreshTokenString, hashToken } = require('../utils/jwt');
const { ROLES, USER_STATUS } = require('../constants/roles');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { recordActivity } = require('../middleware/activityLogger');
const env = require('../config/env');

/**
 * Register a new user
 */
const register = async ({ username, email, password, req }) => {
  // Check if email or username already taken
  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });

  if (existingUser) {
    const error = new Error(
      existingUser.email === email.toLowerCase()
        ? 'An account with this email already exists'
        : 'This username is already taken'
    );
    error.statusCode = 409;
    error.code = 'USER_ALREADY_EXISTS';
    throw error;
  }

  // Create user (password is automatically hashed via Mongoose pre-save hook)
  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    password,
    role: ROLES.USER,
    status: USER_STATUS.ACTIVE,
  });

  // Issue tokens
  const accessToken = generateAccessToken(user);
  const refreshTokenRaw = generateRefreshTokenString();
  const tokenHash = hashToken(refreshTokenRaw);
  const familyId = crypto.randomUUID();

  // Expiry calculation (7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    tokenHash,
    user: user._id,
    familyId,
    expiresAt,
    ipAddress: req ? req.ip : '',
    userAgent: req ? req.headers['user-agent'] : '',
  });

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.AUTH_REGISTER,
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      details: { username: user.username, email: user.email },
      req,
    });
  }

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken: refreshTokenRaw,
  };
};

/**
 * Login an existing user
 */
const login = async ({ email, password, req }) => {
  // Use generic invalid credentials message to prevent account enumeration
  const invalidCredentialsError = new Error('Invalid email or password');
  invalidCredentialsError.statusCode = 401;
  invalidCredentialsError.code = 'INVALID_CREDENTIALS';

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw invalidCredentialsError;
  }

  // Check if deactivated
  if (user.status === USER_STATUS.DEACTIVATED) {
    const deactivatedError = new Error('Your account has been deactivated. Please contact an administrator.');
    deactivatedError.statusCode = 403;
    deactivatedError.code = 'ACCOUNT_DEACTIVATED';
    throw deactivatedError;
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw invalidCredentialsError;
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshTokenRaw = generateRefreshTokenString();
  const tokenHash = hashToken(refreshTokenRaw);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    tokenHash,
    user: user._id,
    familyId,
    expiresAt,
    ipAddress: req ? req.ip : '',
    userAgent: req ? req.headers['user-agent'] : '',
  });

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.AUTH_LOGIN,
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      details: { email: user.email },
      req,
    });
  }

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken: refreshTokenRaw,
  };
};

/**
 * Rotate Refresh Token with Automatic Reuse Detection (Replay Attack Defense)
 */
const refresh = async ({ incomingRefreshToken, req }) => {
  if (!incomingRefreshToken) {
    const error = new Error('Refresh token required');
    error.statusCode = 401;
    error.code = 'REFRESH_TOKEN_REQUIRED';
    throw error;
  }

  const incomingHash = hashToken(incomingRefreshToken);
  const tokenRecord = await RefreshToken.findOne({ tokenHash: incomingHash }).populate('user');

  if (!tokenRecord) {
    const error = new Error('Invalid refresh token');
    error.statusCode = 401;
    error.code = 'INVALID_REFRESH_TOKEN';
    throw error;
  }

  // Replay Attack Detection: If token is already revoked, someone is reusing an old token!
  if (tokenRecord.isRevoked) {
    // Invalidate entire family immediately!
    await RefreshToken.updateMany(
      { familyId: tokenRecord.familyId },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );

    const error = new Error('Security Alert: Refresh token reuse detected. Session terminated.');
    error.statusCode = 403;
    error.code = 'TOKEN_REUSE_DETECTED';
    throw error;
  }

  // Check expiration
  if (new Date() > tokenRecord.expiresAt) {
    tokenRecord.isRevoked = true;
    tokenRecord.revokedAt = new Date();
    await tokenRecord.save();

    const error = new Error('Refresh token expired');
    error.statusCode = 401;
    error.code = 'REFRESH_TOKEN_EXPIRED';
    throw error;
  }

  // Verify user still exists and is active
  const user = tokenRecord.user;
  if (!user || user.status === USER_STATUS.DEACTIVATED) {
    const error = new Error('Account inactive or not found');
    error.statusCode = 403;
    error.code = 'ACCOUNT_INACTIVE';
    throw error;
  }

  // Rotate token: Revoke current token
  const newRefreshTokenRaw = generateRefreshTokenString();
  const newHash = hashToken(newRefreshTokenRaw);

  tokenRecord.isRevoked = true;
  tokenRecord.revokedAt = new Date();
  tokenRecord.replacedByTokenHash = newHash;
  await tokenRecord.save();

  // Issue new pair with the same familyId
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    tokenHash: newHash,
    user: user._id,
    familyId: tokenRecord.familyId,
    expiresAt,
    ipAddress: req ? req.ip : '',
    userAgent: req ? req.headers['user-agent'] : '',
  });

  const newAccessToken = generateAccessToken(user);

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.AUTH_REFRESH_TOKEN,
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      details: { familyId: tokenRecord.familyId },
      req,
    });
  }

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshTokenRaw,
    user: user.toSafeObject(),
  };
};

/**
 * Logout User - Revokes active refresh token
 */
const logout = async ({ incomingRefreshToken, req }) => {
  if (incomingRefreshToken) {
    const tokenHash = hashToken(incomingRefreshToken);
    await RefreshToken.findOneAndUpdate(
      { tokenHash },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
  }

  if (req && req.user) {
    recordActivity({
      action: ACTIVITY_TYPES.AUTH_LOGOUT,
      resourceType: 'AUTH',
      resourceId: req.user._id.toString(),
      details: {},
      req,
    });
  }

  return true;
};

/**
 * OAuth Login / Account Linking (Google / Facebook)
 */
const oauthLogin = async ({ provider, email, name, avatar, providerId, req }) => {
  let user = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      provider === 'google' ? { googleId: providerId } : { facebookId: providerId },
    ],
  });

  if (user) {
    // Link provider ID if not linked
    if (provider === 'google' && !user.googleId) user.googleId = providerId;
    if (provider === 'facebook' && !user.facebookId) user.facebookId = providerId;
    if (avatar && !user.avatar) user.avatar = avatar;
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    // Generate a unique base username
    let baseUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
    if (baseUsername.length < 3) baseUsername = `user_${Date.now().toString().slice(-4)}`;
    let username = baseUsername;
    let count = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}_${count}`;
      count += 1;
    }

    user = await User.create({
      username,
      email: email.toLowerCase(),
      avatar: avatar || '',
      role: ROLES.USER,
      status: USER_STATUS.ACTIVE,
      googleId: provider === 'google' ? providerId : undefined,
      facebookId: provider === 'facebook' ? providerId : undefined,
      lastLoginAt: new Date(),
    });
  }

  // Issue tokens
  const accessToken = generateAccessToken(user);
  const refreshTokenRaw = generateRefreshTokenString();
  const tokenHash = hashToken(refreshTokenRaw);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    tokenHash,
    user: user._id,
    familyId,
    expiresAt,
    ipAddress: req ? req.ip : '',
    userAgent: req ? req.headers['user-agent'] : '',
  });

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.AUTH_OAUTH_LOGIN,
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      details: { provider, email: user.email },
      req,
    });
  }

  return {
    user: user.toSafeObject(),
    accessToken,
    refreshToken: refreshTokenRaw,
  };
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  oauthLogin,
};
