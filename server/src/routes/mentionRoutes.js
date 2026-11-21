const express = require('express');
const controller = require('../controllers/mentionController');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);
router.get('/', controller.listMine);
router.patch('/:id/read', controller.markRead);
module.exports = router;
