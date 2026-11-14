const express = require('express');
const { assist } = require('../controllers/aiController');
const { requireAuth } = require('../middleware/auth');
const { contentCreationLimiter } = require('../middleware/rateLimiter');
const router = express.Router();
router.post('/assist', requireAuth, contentCreationLimiter, assist);
module.exports = router;
