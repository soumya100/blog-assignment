const express = require('express');
const commentController = require('../controllers/commentController');
const validate = require('../middleware/validate');
const { updateCommentSchema } = require('../validators/commentValidator');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.patch('/:id', requireAuth, validate(updateCommentSchema), commentController.updateComment);
router.delete('/:id', requireAuth, commentController.deleteComment);
router.post('/:id/like', requireAuth, commentController.toggleLikeComment);

module.exports = router;
