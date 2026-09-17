const express = require('express');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const validate = require('../middleware/validate');
const { createPostSchema, updatePostSchema, queryPostSchema } = require('../validators/postValidator');
const { createCommentSchema } = require('../validators/commentValidator');
const { requireAuth, requireRole, optionalAuth } = require('../middleware/auth');
const { contentCreationLimiter } = require('../middleware/rateLimiter');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// Blog Post CRUD
router.get('/', optionalAuth, validate(queryPostSchema, 'query'), postController.getPosts);
router.get('/:id', optionalAuth, postController.getPostByIdOrSlug);
router.post('/', requireAuth, contentCreationLimiter, validate(createPostSchema), postController.createPost);
router.patch('/:id', requireAuth, validate(updatePostSchema), postController.updatePost);
router.delete('/:id', requireAuth, postController.deletePost);

// Admin post restoration
router.post('/:id/restore', requireAuth, requireRole(ROLES.ADMIN), postController.restorePost);

// Nested Comments routes
router.post(
  '/:postId/comments',
  requireAuth,
  contentCreationLimiter,
  validate(createCommentSchema),
  commentController.createComment
);
router.get('/:postId/comments', commentController.getCommentsByPost);

module.exports = router;
