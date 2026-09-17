const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { recordActivity } = require('../middleware/activityLogger');
const { ROLES } = require('../constants/roles');

/**
 * Create a new comment on a post
 */
const createComment = async ({ postId, authorId, content, req }) => {
  // Validate that target post exists and is not soft deleted
  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) {
    const error = new Error('Target post does not exist or has been deleted');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    content,
  });

  await comment.populate('author', 'username email avatar role');

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.COMMENT_CREATE,
      resourceType: 'COMMENT',
      resourceId: comment._id.toString(),
      details: { postId, postTitle: post.title },
      req,
    });

    // Real-time notification if socket active
    const io = req.app.get('io');
    if (io) {
      io.to(`post_${postId}`).emit('new_comment', {
        id: comment._id,
        postId,
        content: comment.content,
        author: comment.author,
        createdAt: comment.createdAt,
      });
    }
  }

  return comment;
};

/**
 * Get paginated comments for a specific post
 */
const getCommentsByPost = async (postId, { page = 1, limit = 20 }) => {
  const filter = {
    post: postId,
    isDeleted: false,
  };

  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username email avatar role')
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return {
    items: comments,
    pagination: {
      total,
      page,
      limit,
    },
  };
};

/**
 * Update comment content
 */
const updateComment = async (commentId, content, user, req) => {
  const comment = await Comment.findById(commentId);

  if (!comment || comment.isDeleted) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    error.code = 'COMMENT_NOT_FOUND';
    throw error;
  }

  // Ownership verification (BOLA / IDOR protection)
  const isOwner = comment.author.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to edit this comment');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  comment.content = content;
  await comment.save();
  await comment.populate('author', 'username email avatar role');

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.COMMENT_UPDATE,
      resourceType: 'COMMENT',
      resourceId: comment._id.toString(),
      details: {},
      req,
    });
  }

  return comment;
};

/**
 * Soft delete a comment
 */
const deleteComment = async (commentId, user, req) => {
  const comment = await Comment.findById(commentId);

  if (!comment || comment.isDeleted) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    error.code = 'COMMENT_NOT_FOUND';
    throw error;
  }

  // Ownership verification
  const isOwner = comment.author.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to delete this comment');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  comment.isDeleted = true;
  comment.deletedAt = new Date();
  await comment.save();

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.COMMENT_DELETE,
      resourceType: 'COMMENT',
      resourceId: comment._id.toString(),
      details: {},
      req,
    });
  }

  return { message: 'Comment deleted successfully' };
};

module.exports = {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
};
