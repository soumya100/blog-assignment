const express = require('express');
const { uploadImage } = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/auth');
const { uploadCreationLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.post('/image', requireAuth, uploadCreationLimiter, uploadImage);
module.exports = router;
