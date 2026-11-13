const express = require('express');
const savedPostController = require('../controllers/savedPostController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/status/:postId', savedPostController.getSavedStatus);
router.get('/', savedPostController.listSavedPosts);
router.post('/:postId', savedPostController.savePost);
router.delete('/:postId', savedPostController.removeSavedPost);

module.exports = router;
