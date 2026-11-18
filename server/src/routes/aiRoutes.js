const express = require('express');
const { assist } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');
const { aiRequestLimiter } = require('../middleware/rateLimiter');
const router = express.Router();
router.post('/assist', requireAuth, aiRequestLimiter, assist);
module.exports = router;
