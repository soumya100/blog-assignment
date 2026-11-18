const express = require('express');
const controller = require('../controllers/analyticsController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { viewTrackingLimiter } = require('../middleware/rateLimiter');
const router = express.Router();
router.post('/posts/:postId/view', viewTrackingLimiter, optionalAuth, controller.trackView);
router.get('/author', requireAuth, controller.getAuthorAnalytics);
module.exports = router;
