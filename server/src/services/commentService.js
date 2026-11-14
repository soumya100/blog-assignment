const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { recordActivity } = require('../middleware/activityLogger');
const { ROLES, USER_STATUS } = require('../constants/roles');
const commentCache = require('./commentCache');
const User = require('../models/User');
const Mention = require('../models/Mention');

const invalidatePostCache = async (postId) => {
  if (postId) await commentCache.bumpVersion(postId.toString());
};

/**
 * Base64url cursor serialization for stable cursor pagination.
 * Preserves all fields involved in the sort order:
 * - Newest: { createdAt, id }
 * - Top:    { score, createdAt, id }
 */
const encodeCursor = (doc, sort = 'newest') => {
  const payload = {
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
    id: doc._id.toString(),
  };
  if (sort === 'top') {
    payload.score = typeof doc.engagementScore === 'number' ? doc.engagementScore : 0;
  }
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

const decodeCursor = (cursor) => {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    if (!parsed.id || !mongoose.Types.ObjectId.isValid(parsed.id)) return null;
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;

    return {
      createdAt,
      id: mongoose.Types.ObjectId.createFromHexString(parsed.id),
      score: typeof parsed.score === 'number' && Number.isFinite(parsed.score) ? parsed.score : null,
    };
  } catch (_) {
    return null;
  }
};

/**
 * Create a new root comment or nested reply at arbitrary depth.
 */
const createComment = async ({ postId, authorId, content, parentCommentId, req }) => {
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    const error = new Error('Invalid post ID');
    error.statusCode = 400;
    error.code = 'INVALID_POST_ID';
    throw error;
  }

  const post = await Post.findOne({ _id: postId, isDeleted: false, status: 'published' });
  if (!post) {
    const error = new Error('Target post does not exist or has been deleted');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  let parent = null;
  let ancestors = [];
  let threadRoot = null;

  if (parentCommentId) {
    if (!mongoose.Types.ObjectId.isValid(parentCommentId)) {
      const error = new Error('Invalid parent comment ID');
      error.statusCode = 400;
      error.code = 'INVALID_PARENT_COMMENT_ID';
      throw error;
    }

    parent = await Comment.findById(parentCommentId);
    if (!parent || parent.isDeleted) {
      const error = new Error('Parent comment not found or has been deleted');
      error.statusCode = 404;
      error.code = 'PARENT_COMMENT_NOT_FOUND';
      throw error;
    }

    if (parent.post.toString() !== postId.toString()) {
      const error = new Error('Parent comment does not belong to this post');
      error.statusCode = 400;
      error.code = 'CROSS_POST_REPLY_FORBIDDEN';
      throw error;
    }

    // Derive complete ancestry path
    ancestors = Array.isArray(parent.ancestors) ? [...parent.ancestors] : [];
    if (parent.parentComment && !ancestors.some((a) => a.toString() === parent.parentComment.toString())) {
      ancestors.unshift(parent.parentComment);
    }
    ancestors.push(parent._id);

    // Root of thread is the earliest ancestor or parent itself
    threadRoot = parent.threadRoot || ancestors[0] || parent._id;
  }

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    content,
    parentComment: parent ? parent._id : null,
    ancestors,
    threadRoot,
    directReplyCount: 0,
    engagementScore: 0,
  });

  // Atomically increment direct reply count and engagement score on the parent comment
  if (parent) {
    await Comment.updateOne(
      { _id: parent._id },
      { $inc: { directReplyCount: 1, engagementScore: 1 } }
    );
  }


  const mentionedNames = [...new Set((content.match(/@([a-zA-Z0-9_]{3,30})/g) || []).map((mention) => mention.slice(1).toLowerCase()))];
  if (mentionedNames.length) {
    const mentionedUsers = await User.find({
      username: { $in: mentionedNames },
      status: USER_STATUS.ACTIVE,
      _id: { $ne: authorId },
    }).select('_id').lean();
    if (mentionedUsers.length) {
      await Mention.insertMany(mentionedUsers.map((mentionedUser) => ({
        recipient: mentionedUser._id, actor: authorId, comment: comment._id, post: post._id,
      })), { ordered: false });
    }
  }

  await comment.populate('author', 'username email avatar role');

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.COMMENT_CREATE,
      resourceType: 'COMMENT',
      resourceId: comment._id.toString(),
      details: { postId, postTitle: post.title, isReply: Boolean(parentCommentId) },
      req,
    });
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

  await invalidatePostCache(postId);
  return comment;
};

/**
 * Fetch root comments with cursor pagination and recursive descendant tree assembly.
 */
const getCommentsByPost = async (postId, { page = 1, limit = 50, sort = 'newest', after } = {}) => {
  if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
    const error = new Error('Invalid post ID');
    error.statusCode = 400;
    error.code = 'INVALID_POST_ID';
    throw error;
  }

  const post = await Post.findOne({ _id: postId, isDeleted: false, status: 'published' });
  if (!post) {
    const error = new Error('Target post does not exist or has been deleted');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const version = await commentCache.getVersion(postId);
  const cacheKey = `comments:list:${postId}:${version}:${sort}:${safeLimit}:${after || `page-${safePage}`}`;
  const cached = await commentCache.getJson(cacheKey);
  if (cached) return cached;

  const postObjectId = mongoose.Types.ObjectId.createFromHexString(postId.toString());
  const cursor = decodeCursor(after);

  let roots = [];
  let total = 0;

  if (sort === 'top') {
    // Fast path: use compound index on engagementScore when available
    const matchFilter = {
      post: postObjectId,
      parentComment: null,
      isDeleted: false,
    };

    if (cursor) {
      const cursorScore = cursor.score ?? 0;
      matchFilter.$or = [
        { engagementScore: { $lt: cursorScore } },
        { engagementScore: cursorScore, createdAt: { $lt: cursor.createdAt } },
        { engagementScore: cursorScore, createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
      ];
    }

    [roots, total] = await Promise.all([
      Comment.find(matchFilter)
        .sort({ engagementScore: -1, createdAt: -1, _id: -1 })
        .limit(safeLimit + 1)
        .populate('author', 'username email avatar role')
        .lean({ virtuals: true }),
      Comment.countDocuments({ post: postObjectId, parentComment: null, isDeleted: false }),
    ]);
  } else {
    // Newest sorting: createdAt DESC, _id DESC
    const filter = { post: postObjectId, parentComment: null, isDeleted: false };
    if (cursor) {
      filter.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
      ];
    }

    [roots, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(safeLimit + 1)
        .populate('author', 'username email avatar role')
        .lean({ virtuals: true }),
      Comment.countDocuments({ post: postObjectId, parentComment: null, isDeleted: false }),
    ]);
  }

  const hasMore = roots.length > safeLimit;
  if (hasMore) {
    roots.pop();
  }

  const rootIds = roots.map((root) => root._id);
  const descendants = [];

  if (rootIds.length > 0) {
    // Single indexed query utilizing threadRoot, with fallback to parentComment for legacy data
    const query = {
      post: postObjectId,
      isDeleted: false,
      $or: [
        { threadRoot: { $in: rootIds } },
        { parentComment: { $in: rootIds } },
      ],
    };

    const fetched = await Comment.find(query)
      .sort({ createdAt: 1, _id: 1 })
      .populate('author', 'username email avatar role')
      .lean({ virtuals: true });

    // Handle any deep legacy descendants that lack threadRoot
    const visited = new Set(fetched.map((d) => d._id.toString()));
    descendants.push(...fetched);

    let frontier = fetched.filter((d) => !d.threadRoot).map((d) => d._id);
    let depth = 0;
    while (frontier.length > 0 && depth < 20) {
      depth += 1;
      const deeper = await Comment.find({
        post: postObjectId,
        parentComment: { $in: frontier },
        isDeleted: false,
        _id: { $nin: Array.from(visited).map((id) => mongoose.Types.ObjectId.createFromHexString(id)) },
      })
        .sort({ createdAt: 1, _id: 1 })
        .populate('author', 'username email avatar role')
        .lean({ virtuals: true });

      if (!deeper.length) break;
      for (const item of deeper) {
        visited.add(item._id.toString());
        descendants.push(item);
      }
      frontier = deeper.map((item) => item._id);
    }
  }

  // Assemble discussion trees in-memory
  const byId = new Map();
  roots.forEach((root) => {
    byId.set(root._id.toString(), {
      ...root,
      likesCount: Array.isArray(root.likes) ? root.likes.length : (root.likesCount || 0),
      replies: [],
    });
  });

  descendants.forEach((item) => {
    byId.set(item._id.toString(), {
      ...item,
      likesCount: Array.isArray(item.likes) ? item.likes.length : (item.likesCount || 0),
      replies: [],
    });
  });

  descendants.forEach((item) => {
    if (item.parentComment) {
      const parent = byId.get(item.parentComment.toString());
      if (parent) {
        parent.replies.push(byId.get(item._id.toString()));
      }
    }
  });

  const items = roots.map((root) => byId.get(root._id.toString()));
  const last = roots[roots.length - 1];

  const result = {
    items,
    pagination: {
      total,
      page: safePage,
      limit: safeLimit,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last, sort) : null,
      sort,
    },
  };

  await commentCache.setJson(cacheKey, result);
  return result;
};

/**
 * Fetch paginated replies directly under a specific comment.
 */
const getRepliesByComment = async (commentId, { after, limit = 20 } = {}) => {
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    const error = new Error('Invalid comment ID');
    error.statusCode = 400;
    error.code = 'INVALID_COMMENT_ID';
    throw error;
  }

  const parent = await Comment.findOne({ _id: commentId, isDeleted: false }).select('_id post');
  if (!parent) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    error.code = 'COMMENT_NOT_FOUND';
    throw error;
  }

  // Ensure post is also active
  const post = await Post.findOne({ _id: parent.post, isDeleted: false }).select('_id');
  if (!post) {
    const error = new Error('Target post does not exist or has been deleted');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const cursor = decodeCursor(after);

  const filter = {
    post: parent.post,
    parentComment: parent._id,
    isDeleted: false,
  };

  if (cursor) {
    filter.$or = [
      { createdAt: { $gt: cursor.createdAt } },
      { createdAt: cursor.createdAt, _id: { $gt: cursor.id } },
    ];
  }

  const [items, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: 1, _id: 1 })
      .limit(safeLimit + 1)
      .populate('author', 'username email avatar role')
      .lean({ virtuals: true }),
    Comment.countDocuments({ post: parent.post, parentComment: parent._id, isDeleted: false }),
  ]);

  const hasMore = items.length > safeLimit;
  if (hasMore) {
    items.pop();
  }

  const formattedItems = items.map((item) => ({
    ...item,
    likesCount: Array.isArray(item.likes) ? item.likes.length : (item.likesCount || 0),
    replies: [],
  }));

  const last = formattedItems[formattedItems.length - 1];

  return {
    items: formattedItems,
    pagination: {
      total,
      limit: safeLimit,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last) : null,
    },
  };
};

/**
 * Race-condition-free atomic toggle for comment likes using two-phase atomic operations.
 */
const toggleLikeComment = async (commentId, userId, req) => {
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    const error = new Error('Invalid comment ID');
    error.statusCode = 400;
    error.code = 'INVALID_COMMENT_ID';
    throw error;
  }

  const userObjectId = mongoose.Types.ObjectId.createFromHexString(userId.toString());
  const commentObjectId = mongoose.Types.ObjectId.createFromHexString(commentId.toString());

  // Phase 1: Attempt to atomically remove like if user has already liked
  let updated = await Comment.findOneAndUpdate(
    { _id: commentObjectId, isDeleted: false, likes: userObjectId },
    {
      $pull: { likes: userObjectId },
      $inc: { engagementScore: -2 },
    },
    { new: true }
  );

  let hasLiked = false;

  if (updated) {
    hasLiked = false;
  } else {
    // Phase 2: User has not liked yet, atomically add like
    updated = await Comment.findOneAndUpdate(
      { _id: commentObjectId, isDeleted: false },
      {
        $addToSet: { likes: userObjectId },
        $inc: { engagementScore: 2 },
      },
      { new: true }
    );

    if (!updated) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      error.code = 'COMMENT_NOT_FOUND';
      throw error;
    }
    hasLiked = true;
  }

  const likesCount = Array.isArray(updated.likes) ? updated.likes.length : 0;

  if (req) {
    const io = req.app.get('io');
    if (io) {
      io.to(`post_${updated.post}`).emit('comment_like', {
        commentId: updated._id,
        likesCount,
        userId: userObjectId,
        hasLiked,
      });
    }
  }

  await invalidatePostCache(updated.post);
  return { commentId: updated._id, likesCount, hasLiked, liked: hasLiked };
};

/**
 * Update comment content with authorship validation.
 */
const updateComment = async (commentId, content, user, req) => {
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    const error = new Error('Invalid comment ID');
    error.statusCode = 400;
    error.code = 'INVALID_COMMENT_ID';
    throw error;
  }

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    error.code = 'COMMENT_NOT_FOUND';
    throw error;
  }

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
    const io = req.app.get('io');
    if (io) {
      io.to(`post_${comment.post}`).emit('comment_updated', {
        commentId: comment._id,
        postId: comment.post,
        content: comment.content,
        updatedAt: comment.updatedAt,
      });
    }
  }

  await invalidatePostCache(comment.post);
  return comment;
};

/**
 * Recursively soft-delete a comment and all its descendants.
 */
const deleteComment = async (commentId, user, req) => {
  if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
    const error = new Error('Invalid comment ID');
    error.statusCode = 400;
    error.code = 'INVALID_COMMENT_ID';
    throw error;
  }

  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    error.code = 'COMMENT_NOT_FOUND';
    throw error;
  }

  const isOwner = comment.author.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to delete this comment');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const deletedAt = new Date();
  const commentObjectId = comment._id;

  // Identify all descendants using ancestors array with fallback loop for legacy trees
  const descendants = await Comment.find({
    post: comment.post,
    ancestors: commentObjectId,
    isDeleted: false,
  }).select('_id');

  const subtreeIds = [commentObjectId, ...descendants.map((d) => d._id)];
  const visited = new Set(subtreeIds.map((id) => id.toString()));

  // Frontier check for legacy comments without ancestors
  let frontier = [commentObjectId];
  let depth = 0;
  while (frontier.length > 0 && depth < 20) {
    depth += 1;
    const children = await Comment.find({
      post: comment.post,
      parentComment: { $in: frontier },
      isDeleted: false,
      _id: { $nin: Array.from(visited).map((id) => mongoose.Types.ObjectId.createFromHexString(id)) },
    }).select('_id');

    if (!children.length) break;
    frontier = children.map((c) => c._id);
    for (const child of children) {
      visited.add(child._id.toString());
      subtreeIds.push(child._id);
    }
  }

  await Comment.updateMany(
    { _id: { $in: subtreeIds }, isDeleted: false },
    { $set: { isDeleted: true, deletedAt } }
  );

  // If deleted comment had a parent, decrement parent's directReplyCount & engagementScore
  if (comment.parentComment) {
    await Comment.updateOne(
      { _id: comment.parentComment, directReplyCount: { $gt: 0 } },
      { $inc: { directReplyCount: -1, engagementScore: -1 } }
    );
  }

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.COMMENT_DELETE,
      resourceType: 'COMMENT',
      resourceId: comment._id.toString(),
      details: {},
      req,
    });
    const io = req.app.get('io');
    if (io) {
      io.to(`post_${comment.post}`).emit('comment_deleted', {
        commentId: comment._id,
        postId: comment.post,
      });
    }
  }

  await invalidatePostCache(comment.post);
  return { message: 'Comment deleted successfully' };
};

module.exports = {
  createComment,
  getCommentsByPost,
  getRepliesByComment,
  toggleLikeComment,
  updateComment,
  deleteComment,
  encodeCursor,
  decodeCursor,
};
