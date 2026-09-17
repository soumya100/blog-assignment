const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { recordActivity } = require('../middleware/activityLogger');
const { ROLES } = require('../constants/roles');

/**
 * Create a new comment or nested reply on a post
 */
const createComment = async ({ postId, authorId, content, parentCommentId, req }) => {
  // Validate that target post exists and is not soft deleted
  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) {
    const error = new Error('Target post does not exist or has been deleted');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  let parentCommentDoc = null;
  if (parentCommentId) {
    parentCommentDoc = await Comment.findOne({
      _id: parentCommentId,
      post: postId,
      isDeleted: false,
    });
    if (!parentCommentDoc) {
      const error = new Error('Parent comment not found or does not belong to this post');
      error.statusCode = 404;
      error.code = 'PARENT_COMMENT_NOT_FOUND';
      throw error;
    }
  }

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    content,
    parentComment: parentCommentDoc ? parentCommentDoc._id : null,
  });

  await comment.populate('author', 'username email avatar role');

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.COMMENT_CREATE,
      resourceType: 'COMMENT',
      resourceId: comment._id.toString(),
      details: { postId, postTitle: post.title, isReply: Boolean(parentCommentId) },
      req,
    });

    // Real-time notification if socket active
    const io = req.app.get('io');
    if (io) {
      io.to(`post_${postId}`).emit('new_comment', {
        id: comment._id,
        postId,
        parentCommentId: comment.parentComment,
        content: comment.content,
        author: comment.author,
        createdAt: comment.createdAt,
      });
    }
  }

  return comment;
};

/**
 * Get paginated Facebook-style comments and nested replies for a specific post
 */
const getCommentsByPost = async (postId, { page = 1, limit = 50 }) => {
  const topLevelFilter = {
    post: postId,
    parentComment: null,
    isDeleted: false,
  };

  const skip = (page - 1) * limit;

  const [topLevelComments, total] = await Promise.all([
    Comment.find(topLevelFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username email avatar role')
      .lean({ virtuals: true }),
    Comment.countDocuments(topLevelFilter),
  ]);

  // Fetch all active replies for this post
  const topLevelIds = topLevelComments.map((c) => c._id);
  const replies = await Comment.find({
    post: postId,
    parentComment: { $in: topLevelIds },
    isDeleted: false,
  })
    .sort({ createdAt: 1 })
    .populate('author', 'username email avatar role')
    .lean({ virtuals: true });

  // Map replies into their respective parent comments
  const repliesByParent = {};
  replies.forEach((rep) => {
    const pId = rep.parentComment.toString();
    if (!repliesByParent[pId]) repliesByParent[pId] = [];
    repliesByParent[pId].push({
      ...rep,
      likesCount: (rep.likes || []).length,
    });
  });

  const threadedComments = topLevelComments.map((c) => ({
    ...c,
    likesCount: (c.likes || []).length,
    replies: repliesByParent[c._id.toString()] || [],
  }));

  return {
    items: threadedComments,
    pagination: {
      total,
      page,
      limit,
    },
  };
};

/**
 * Toggle like reaction on a comment or reply
 */
const toggleLikeComment = async (commentId, userId, req) => {
  const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    error.code = 'COMMENT_NOT_FOUND';
    throw error;
  }

  const userIndex = comment.likes.findIndex((id) => id.toString() === userId.toString());
  const hasLiked = userIndex !== -1;

  if (hasLiked) {
    comment.likes.splice(userIndex, 1);
  } else {
    comment.likes.push(userId);
  }

  await comment.save();

  const likesCount = comment.likes.length;

  if (req) {
    const io = req.app.get('io');
    if (io) {
      io.to(`post_${comment.post}`).emit('comment_like', {
        commentId: comment._id,
        likesCount,
        userId,
        hasLiked: !hasLiked,
      });
    }
  }

  return {
    commentId: comment._id,
    likesCount,
    hasLiked: !hasLiked,
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
  toggleLikeComment,
  updateComment,
  deleteComment,
};
