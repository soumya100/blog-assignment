const express = require('express');
const controller = require('../controllers/newsletterController');
const { newsletterLimiter } = require('../middleware/rateLimiter');
const router = express.Router();
router.post('/subscribe', newsletterLimiter, controller.subscribe);
router.get('/confirm', controller.confirm);
router.get('/unsubscribe', controller.unsubscribe);
router.post('/unsubscribe', controller.unsubscribe);
module.exports = router;
