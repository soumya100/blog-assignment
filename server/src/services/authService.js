const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { generateAccessToken, generateRefreshTokenString, hashToken } = require('../utils/jwt');
const { ROLES, USER_STATUS } = require('../constants/roles');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { recordActivity } = require('../middleware/activityLogger');
const env = require('../config/env');
const logger = require('../utils/logger');
const emailService = require('../utils/emailService');

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
  } else if (req && req.user) {
    await RefreshToken.updateMany(
      { user: req.user._id, isRevoked: false },
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
 * Authoritatively revoke a specific refresh token (RFC 7009 compliant)
 */
const revokeToken = async ({ incomingRefreshToken, req }) => {
  if (!incomingRefreshToken) {
    return false;
  }
  const tokenHash = hashToken(incomingRefreshToken);
  const tokenRecord = await RefreshToken.findOneAndUpdate(
    { tokenHash },
    { $set: { isRevoked: true, revokedAt: new Date() } },
    { new: true }
  );

  if (req && tokenRecord) {
    recordActivity({
      action: ACTIVITY_TYPES.AUTH_TOKEN_REVOKED,
      resourceType: 'AUTH',
      resourceId: tokenRecord.user.toString(),
      details: { familyId: tokenRecord.familyId },
      req,
    });
  }

  return !!tokenRecord;
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

/**
 * Request Password Reset (Cryptographic 6-Digit OTP + 1-Click Magic Link via Email)
 */
const requestPasswordReset = async ({ email, req }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // Generic message for anti-enumeration timing defense
  const genericResponse = {
    message: 'If an account exists with that email address, password recovery instructions have been dispatched.',
  };

  if (!user || user.status === USER_STATUS.DEACTIVATED) {
    return genericResponse;
  }

  // 1. Generate secure 6-digit numeric OTP code
  const rawOtp = String(crypto.randomInt(100000, 1000000));
  const hashedOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');

  // 2. Generate unguessable 32-byte cryptographic token for 1-click Magic Link
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

  // 3. Set 10-minute OTP expiration & 15-minute token expiration
  user.passwordResetOtp = hashedOtp;
  user.passwordResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.passwordResetOtpAttempts = 0;
  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const clientBaseUrl = env.CLIENT_URL || 'http://localhost:5173';
  const resetUrl = `${clientBaseUrl}/reset-password/${rawResetToken}`;

  // 4. Dispatch real email with both 6-digit OTP and 1-Click Magic Link via Nodemailer
  let emailResult = null;
  try {
    emailResult = await emailService.sendPasswordRecoveryEmail({
      to: user.email,
      otp: rawOtp,
      resetUrl,
      username: user.username,
    });
  } catch (emailErr) {
    logger.error(`[AuthService] Password recovery email dispatch failed: ${emailErr.message}`);
    const deliveryError = new Error('Unable to send password recovery email. Please check your email configuration or try again later.');
    deliveryError.statusCode = 503;
    deliveryError.code = 'EMAIL_DELIVERY_FAILED';
    deliveryError.isOperational = true;
    throw deliveryError;
  }

  if (req) {
    recordActivity({
      action: 'AUTH_PASSWORD_RESET_REQUEST',
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      details: { email: user.email },
      req,
    });
  }

  return {
    ...genericResponse,
    resetUrl,
    previewUrl: emailResult?.previewUrl || null,
  };
};

/**
 * Verify 6-digit OTP Code with Brute-Force Rate Limiting (Anti-Tampering)
 */
const verifyPasswordResetOtp = async ({ email, otp, req }) => {
  if (!email || !otp) {
    const error = new Error('Email and 6-digit OTP code are required');
    error.statusCode = 400;
    error.code = 'MISSING_FIELDS';
    throw error;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordResetOtp +passwordResetOtpExpires +passwordResetOtpAttempts +passwordResetToken'
  );

  const invalidCodeError = new Error('Invalid or expired verification code');
  invalidCodeError.statusCode = 400;
  invalidCodeError.code = 'INVALID_OR_EXPIRED_OTP';

  if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpires) {
    throw invalidCodeError;
  }

  // Check brute force attempt limit (max 5 attempts)
  if (user.passwordResetOtpAttempts >= 5) {
    user.passwordResetOtp = null;
    user.passwordResetOtpExpires = null;
    await user.save({ validateBeforeSave: false });

    const lockoutError = new Error('Too many invalid attempts. For your security, this verification code has been revoked. Please request a new one.');
    lockoutError.statusCode = 429;
    lockoutError.code = 'OTP_MAX_ATTEMPTS_EXCEEDED';
    throw lockoutError;
  }

  // Check expiration (10 minutes)
  if (user.passwordResetOtpExpires < new Date()) {
    user.passwordResetOtp = null;
    user.passwordResetOtpExpires = null;
    await user.save({ validateBeforeSave: false });
    throw invalidCodeError;
  }

  // Verify hash
  const hashedInputOtp = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
  if (hashedInputOtp !== user.passwordResetOtp) {
    user.passwordResetOtpAttempts = (user.passwordResetOtpAttempts || 0) + 1;
    await user.save({ validateBeforeSave: false });
    const remaining = 5 - user.passwordResetOtpAttempts;
    const mismatchError = new Error(`Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
    mismatchError.statusCode = 400;
    mismatchError.code = 'OTP_MISMATCH';
    throw mismatchError;
  }

  // OTP verified! Generate verified 32-byte token for Step 3
  const verifiedToken = crypto.randomBytes(32).toString('hex');
  const hashedVerifiedToken = crypto.createHash('sha256').update(verifiedToken).digest('hex');

  user.passwordResetToken = hashedVerifiedToken;
  user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
  user.passwordResetOtp = null; // Clear OTP so it cannot be re-used
  user.passwordResetOtpExpires = null;
  user.passwordResetOtpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  if (req) {
    recordActivity({
      action: 'AUTH_OTP_VERIFIED',
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      details: { email: user.email },
      req,
    });
  }

  return {
    success: true,
    message: 'Verification code confirmed. You may now set your new password.',
    resetToken: verifiedToken,
  };
};

/**
 * Reset Password with Cryptographic Token Verification and Session Invalidation
 */
const resetPassword = async ({ token, newPassword, req }) => {
  if (!token) {
    const error = new Error('Password reset token is required');
    error.statusCode = 400;
    error.code = 'TOKEN_MISSING';
    throw error;
  }

  // Hash the incoming token to match database SHA-256
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    const error = new Error('Password reset link is invalid or has expired');
    error.statusCode = 400;
    error.code = 'INVALID_OR_EXPIRED_TOKEN';
    throw error;
  }

  // Update password (triggers bcrypt 12-round pre-save hook)
  user.password = newPassword;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.passwordResetOtp = null;
  user.passwordResetOtpExpires = null;
  user.passwordResetOtpAttempts = 0;
  await user.save();

  // Replay Attack & Compromised Session Defense: Revoke all active refresh tokens for this user
  await RefreshToken.deleteMany({ user: user._id });

  if (req) {
    recordActivity({
      action: 'AUTH_PASSWORD_RESET_SUCCESS',
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      details: { email: user.email },
      req,
    });
  }

  return {
    message: 'Password reset successfully. Please sign in with your new credentials.',
  };
};

/**
 * Update authenticated user profile (bio, avatar)
 */
const updateProfile = async ({ userId, bio, avatar, req }) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (typeof bio === 'string') {
    user.bio = bio.trim().slice(0, 250);
  }

  if (typeof avatar === 'string') {
    user.avatar = avatar.trim();
  }

  await user.save();

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.USER_PROFILE_UPDATE,
      resourceType: 'USER',
      resourceId: user._id.toString(),
      details: {
        bioUpdated: typeof bio === 'string',
        avatarUpdated: typeof avatar === 'string',
      },
      req,
    });
  }

  return user.toSafeObject();
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  revokeToken,
  oauthLogin,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
  updateProfile,
};
