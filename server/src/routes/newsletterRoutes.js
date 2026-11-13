const express = require('express');
const controller = require('../controllers/newsletterController');
const { contentCreationLimiter } = require('../middleware/rateLimiter');
const router = express.Router();
router.post('/subscribe', contentCreationLimiter, controller.subscribe);
router.get('/confirm', controller.confirm);
router.get('/unsubscribe', controller.unsubscribe);
router.post('/unsubscribe', controller.unsubscribe);
module.exports = router;
