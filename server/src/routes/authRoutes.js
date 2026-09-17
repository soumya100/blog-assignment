const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, oauthDevSchema } = require('../validators/authValidator');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Authentication endpoints protected with strict rate limiting
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);

// Current user profile
router.get('/me', requireAuth, authController.getMe);

// Live Google OAuth 2.0 endpoints
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);

// Live Facebook OAuth 2.0 endpoints
router.get('/facebook', authController.facebookAuth);
router.get('/facebook/callback', authController.facebookCallback);

// OAuth Dev Sandbox Login (Google / Facebook)
router.post('/oauth/dev', validate(oauthDevSchema), authController.oauthDevLogin);

module.exports = router;
