const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { recordActivity } = require('../middleware/activityLogger');
const { ROLES } = require('../constants/roles');
const commentCache = require('./commentCache');

const invalidatePostCache = async (postId) => {
  if (postId) await commentCache.bumpVersion(postId.toString());
};

const encodeCursor = (doc, sort = 'newest') => Buffer.from(JSON.stringify({
  createdAt: doc.createdAt.toISOString(),
  id: doc._id.toString(),
  ...(sort === 'top' ? { score: doc.engagementScore || 0 } : {}),
})).toString('base64url');

const decodeCursor = (cursor) => {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const createdAt = new Date(parsed.createdAt);
    if (!parsed.id || Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: parsed.id, score: Number.isFinite(parsed.score) ? parsed.score : null };
  } catch (_) { return null; }
};

const createComment = async ({ postId, authorId, content, parentCommentId, req }) => {
  const post = await Post.findOne({ _id: postId, isDeleted: false });
  if (!post) {
    const error = new Error('Target post does not exist or has been deleted');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  let parent = null;
  let ancestors = [];
  if (parentCommentId) {
    parent = await Comment.findOne({ _id: parentCommentId, post: postId, isDeleted: false }).select('_id parentComment ancestors threadRoot');
    if (!parent) {
      const error = new Error('Parent comment not found or does not belong to this post');
      error.statusCode = 404;
      error.code = 'PARENT_COMMENT_NOT_FOUND';
      throw error;
    }
    // Backward-compatible ancestry derivation for existing comments created before this field.
    ancestors = [...(parent.ancestors || [])];
    if (parent.parentComment && !ancestors.some((id) => id.toString() === parent.parentComment.toString())) {
      ancestors.push(parent.parentComment);
    }
    ancestors.push(parent._id);
  }

  const comment = await Comment.create({
    post: postId,
    author: authorId,
    content,
    parentComment: parent ? parent._id : null,
    ancestors,
    threadRoot: parent ? (parent.threadRoot || ancestors[0] || parent._id) : null,
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
    const io = req.app.get('io');
    if (io) io.to(`post_${postId}`).emit('new_comment', {
      id: comment._id, postId, parentCommentId: comment.parentComment,
      content: comment.content, author: comment.author, createdAt: comment.createdAt,
    });
  }
  await invalidatePostCache(postId);
  return comment;
};

/**
 * Root comments use stable cursor pagination. Descendants are fetched as one bounded-by-thread
 * query and assembled into a recursive tree; legacy direct replies remain discoverable.
 */
const getCommentsByPost = async (postId, { page = 1, limit = 50, sort = 'newest', after } = {}) => {
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const version = await commentCache.getVersion(postId);
  const cacheKey = `comments:list:${postId}:${version}:${sort}:${safeLimit}:${after || `page-${safePage}`}`;
  const cached = await commentCache.getJson(cacheKey);
  if (cached) return cached;

  const filter = { post: postId, parentComment: null, isDeleted: false };
  const cursor = decodeCursor(after);
  if (cursor) filter.$or = [
    { createdAt: { $lt: cursor.createdAt } },
    { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
  ];

  let roots;
  let total;
  if (sort === 'top') {
    const pipeline = [
      { $match: { post: require('mongoose').Types.ObjectId.createFromHexString(postId), parentComment: null, isDeleted: false } },
      { $lookup: { from: 'comments', let: { rootId: '$_id' }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$parentComment', '$$rootId'] }, { $eq: ['$isDeleted', false] }] } } },
        { $count: 'count' },
      ], as: 'replyStats' } },
      { $addFields: { engagementScore: { $add: [
        { $multiply: [{ $size: { $ifNull: ['$likes', []] } }, 2] },
        { $ifNull: [{ $arrayElemAt: ['$replyStats.count', 0] }, 0] },
      ] } } },
      ...(cursor ? [{ $match: { $or: [
        { engagementScore: { $lt: cursor.score ?? 0 } },
        { engagementScore: cursor.score ?? 0, _id: { $lt: require('mongoose').Types.ObjectId.createFromHexString(cursor.id) } },
      ] } }] : []),
      { $sort: { engagementScore: -1, createdAt: -1, _id: -1 } },
      { $limit: safeLimit },
    ];
    [roots, total] = await Promise.all([
      Comment.aggregate(pipeline),
      Comment.countDocuments({ post: postId, parentComment: null, isDeleted: false }),
    ]);
    await Comment.populate(roots, { path: 'author', select: 'username email avatar role' });
  } else {
    [roots, total] = await Promise.all([
      Comment.find(filter).sort({ createdAt: -1, _id: -1 }).limit(safeLimit)
        .populate('author', 'username email avatar role').lean({ virtuals: true }),
      Comment.countDocuments({ post: postId, parentComment: null, isDeleted: false }),
    ]);
  }

  const rootIds = roots.map((root) => root._id);
  // Walk parent-child edges in batches. This also supports legacy nested comments that predate
  // the ancestry fields and avoids one database request per individual reply.
  const descendants = [];
  let frontier = rootIds;
  while (frontier.length) {
    const batch = await Comment.find({
      post: postId, parentComment: { $in: frontier }, isDeleted: false,
    }).sort({ createdAt: 1, _id: 1 }).populate('author', 'username email avatar role').lean({ virtuals: true });
    if (!batch.length) break;
    descendants.push(...batch);
    frontier = batch.map((item) => item._id);
  }

  const byId = new Map();
  roots.forEach((root) => byId.set(root._id.toString(), { ...root, likesCount: root.likes?.length || 0, replies: [] }));
  descendants.forEach((item) => byId.set(item._id.toString(), { ...item, likesCount: item.likes?.length || 0, replies: [] }));
  descendants.forEach((item) => {
    const parent = item.parentComment && byId.get(item.parentComment.toString());
    if (parent) parent.replies.push(byId.get(item._id.toString()));
  });

  const items = roots.map((root) => byId.get(root._id.toString()));
  const last = roots[roots.length - 1];
  const result = {
    items,
    pagination: {
      total, page: safePage, limit: safeLimit,
      hasMore: roots.length === safeLimit,
      nextCursor: last ? encodeCursor(last, sort) : null,
      sort,
    },
  };
  await commentCache.setJson(cacheKey, result);
  return result;
};

const getRepliesByComment = async (commentId, { after, limit = 20 } = {}) => {
  const parent = await Comment.findOne({ _id: commentId, isDeleted: false }).select('_id post');
  if (!parent) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    error.code = 'COMMENT_NOT_FOUND';
    throw error;
  }
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const cursor = decodeCursor(after);
  const filter = { post: parent.post, parentComment: parent._id, isDeleted: false };
  if (cursor) filter.$or = [
    { createdAt: { $gt: cursor.createdAt } },
    { createdAt: cursor.createdAt, _id: { $gt: cursor.id } },
  ];
  const [items, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: 1, _id: 1 }).limit(safeLimit + 1)
      .populate('author', 'username email avatar role').lean({ virtuals: true }),
    Comment.countDocuments({ post: parent.post, parentComment: parent._id, isDeleted: false }),
  ]);
  const hasMore = items.length > safeLimit;
  if (hasMore) items.pop();
  const last = items[items.length - 1];
  return { items, pagination: { total, limit: safeLimit, hasMore, nextCursor: hasMore && last ? encodeCursor(last) : null } };
};

const toggleLikeComment = async (commentId, userId, req) => {
  const comment = await Comment.findOne({ _id: commentId, isDeleted: false });
  if (!comment) {
    const error = new Error('Comment not found');
    error.statusCode = 404;
    error.code = 'COMMENT_NOT_FOUND';
    throw error;
  }
  const hasLiked = comment.likes.some((id) => id.toString() === userId.toString());
  const update = hasLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } };
  const updated = await Comment.findOneAndUpdate(
    { _id: commentId, isDeleted: false },
    update,
    { new: true }
  );
  const liked = updated.likes.some((id) => id.toString() === userId.toString());
  if (req) {
    const io = req.app.get('io');
    if (io) io.to(`post_${comment.post}`).emit('comment_like', {
      commentId: comment._id, likesCount: updated.likes.length, userId, hasLiked: liked,
    });
  }
  await invalidatePostCache(comment.post);
  return { commentId: comment._id, likesCount: updated.likes.length, hasLiked: liked };
};

const updateComment = async (commentId, content, user, req) => {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    const error = new Error('Comment not found'); error.statusCode = 404; error.code = 'COMMENT_NOT_FOUND'; throw error;
  }
  const isOwner = comment.author.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to edit this comment'); error.statusCode = 403; error.code = 'FORBIDDEN'; throw error;
  }
  comment.content = content;
  await comment.save();
  await comment.populate('author', 'username email avatar role');
  if (req) recordActivity({ action: ACTIVITY_TYPES.COMMENT_UPDATE, resourceType: 'COMMENT', resourceId: comment._id.toString(), details: {}, req });
  await invalidatePostCache(comment.post);
  return comment;
};

const deleteComment = async (commentId, user, req) => {
  const comment = await Comment.findById(commentId);
  if (!comment || comment.isDeleted) {
    const error = new Error('Comment not found'); error.statusCode = 404; error.code = 'COMMENT_NOT_FOUND'; throw error;
  }
  const isOwner = comment.author.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to delete this comment'); error.statusCode = 403; error.code = 'FORBIDDEN'; throw error;
  }
  const deletedAt = new Date();
  // Delete the complete subtree in batched levels, including legacy comments without ancestry.
  let frontier = [comment._id];
  const subtreeIds = [comment._id];
  while (frontier.length) {
    const children = await Comment.find({
      post: comment.post, parentComment: { $in: frontier },
    }).select('_id');
    frontier = children.map((child) => child._id);
    subtreeIds.push(...frontier);
  }
  await Comment.updateMany(
    { _id: { $in: subtreeIds }, isDeleted: false },
    { $set: { isDeleted: true, deletedAt } }
  );
  if (req) recordActivity({ action: ACTIVITY_TYPES.COMMENT_DELETE, resourceType: 'COMMENT', resourceId: comment._id.toString(), details: {}, req });
  await invalidatePostCache(comment.post);
  return { message: 'Comment deleted successfully' };
};

module.exports = { createComment, getCommentsByPost, getRepliesByComment, toggleLikeComment, updateComment, deleteComment };
