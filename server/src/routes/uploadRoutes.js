const express = require('express');
const { uploadImage } = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/auth');
const { contentCreationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.post('/image', requireAuth, contentCreationLimiter, uploadImage);
module.exports = router;
