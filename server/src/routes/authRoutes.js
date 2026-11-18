const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  oauthDevSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
  updateProfileSchema,
} = require('../validators/authValidator');
const { registerLimiter, loginLimiter, refreshLimiter, recoveryLimiter, oauthLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const env = require('../config/env');

const router = express.Router();

// Authentication endpoints protected with strict rate limiting
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.post('/revoke', refreshLimiter, authController.revoke);
router.post('/forgot-password', recoveryLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/verify-otp', recoveryLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post('/reset-password/:token', recoveryLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Current user profile & account updates
router.get('/me', requireAuth, authController.getMe);
router.patch('/profile', requireAuth, validate(updateProfileSchema), authController.updateProfile);

// Live Google OAuth 2.0 endpoints
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Live Facebook OAuth 2.0 endpoints
router.get('/facebook', authController.facebookAuth);
router.get('/facebook/callback', authController.facebookCallback);

// OAuth Dev Sandbox Login is opt-in and is never registered in production.
if (env.NODE_ENV !== 'production' && env.ENABLE_DEV_OAUTH) {
  router.post('/oauth/dev', oauthLimiter, validate(oauthDevSchema), authController.oauthDevLogin);
}

// OAuth Production Session Establishment (First-Party Cookie Binding)
router.post('/oauth/session', oauthLimiter, authController.oauthSession);

module.exports = router;
