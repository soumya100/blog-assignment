const express = require('express');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/readingHistoryController');

const router = express.Router();
router.use(requireAuth);
router.get('/', controller.list);
router.post('/:postId', controller.record);
router.delete('/', controller.clear);

module.exports = router;
