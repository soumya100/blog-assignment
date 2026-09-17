const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { createUniqueSlug } = require('../utils/slugify');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { recordActivity } = require('../middleware/activityLogger');
const { ROLES } = require('../constants/roles');

/**
 * Create a new blog post
 */
const createPost = async ({ title, content, excerpt, tags = [], coverImage = '', authorId, req }) => {
  const slug = await createUniqueSlug(Post, title);

  const post = await Post.create({
    title,
    slug,
    content,
    excerpt: excerpt || content.replace(/<[^>]*>?/gm, '').slice(0, 160) + '...',
    tags: tags.map((t) => t.toLowerCase().trim()),
    coverImage,
    author: authorId,
  });

  await post.populate('author', 'username email avatar role');

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.POST_CREATE,
      resourceType: 'POST',
      resourceId: post._id.toString(),
      details: { title: post.title, slug: post.slug },
      req,
    });

    // Real-time notification if socket instance exists
    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', {
        id: post._id,
        title: post.title,
        slug: post.slug,
        author: post.author.username,
        createdAt: post.createdAt,
      });
    }
  }

  return post;
};

/**
 * Get paginated posts with optional filtering and search
 */
const getPosts = async ({ page = 1, limit = 10, search, tag, author, includeDeleted = false }) => {
  const filter = {};

  if (!includeDeleted) {
    filter.isDeleted = false;
  }

  if (tag) {
    filter.tags = tag.toLowerCase().trim();
  }

  if (author) {
    filter.author = author;
  }

  if (search) {
    // Safe text or regex search
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { content: { $regex: escapedSearch, $options: 'i' } },
      { tags: { $in: [new RegExp(escapedSearch, 'i')] } },
    ];
  }

  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username email avatar role')
      .populate('commentsCount')
      .lean({ virtuals: true }),
    Post.countDocuments(filter),
  ]);

  return {
    items: posts,
    pagination: {
      total,
      page,
      limit,
    },
  };
};

/**
 * Get post by slug or ID
 */
const getPostBySlugOrId = async (identifier, includeDeleted = false) => {
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
  const query = isObjectId ? { _id: identifier } : { slug: identifier };

  if (!includeDeleted) {
    query.isDeleted = false;
  }

  const post = await Post.findOne(query)
    .populate('author', 'username email avatar role bio')
    .populate('commentsCount');

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  return post;
};

/**
 * Update existing post
 */
const updatePost = async (postId, updateData, user, req) => {
  const post = await Post.findById(postId);

  if (!post || post.isDeleted) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  // Authorization check (BOLA / IDOR protection)
  const isOwner = post.author.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to edit this post');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Update slug if title was modified
  if (updateData.title && updateData.title !== post.title) {
    post.slug = await createUniqueSlug(Post, updateData.title, post._id);
    post.title = updateData.title;
  }

  if (updateData.content !== undefined) {
    post.content = updateData.content;
    post.excerpt = updateData.excerpt || updateData.content.replace(/<[^>]*>?/gm, '').slice(0, 160) + '...';
  }

  if (updateData.tags !== undefined) {
    post.tags = updateData.tags.map((t) => t.toLowerCase().trim());
  }

  if (updateData.coverImage !== undefined) {
    post.coverImage = updateData.coverImage;
  }

  await post.save();
  await post.populate('author', 'username email avatar role');

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.POST_UPDATE,
      resourceType: 'POST',
      resourceId: post._id.toString(),
      details: { title: post.title },
      req,
    });
  }

  return post;
};

/**
 * Soft delete post
 */
const deletePost = async (postId, user, req) => {
  const post = await Post.findById(postId);

  if (!post || post.isDeleted) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  // Ownership verification
  const isOwner = post.author.toString() === user._id.toString();
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    const error = new Error('You do not have permission to delete this post');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // Perform soft delete
  post.isDeleted = true;
  post.deletedAt = new Date();
  await post.save();

  // Also soft delete all associated comments
  await Comment.updateMany({ post: post._id }, { $set: { isDeleted: true, deletedAt: new Date() } });

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.POST_DELETE,
      resourceType: 'POST',
      resourceId: post._id.toString(),
      details: { title: post.title },
      req,
    });
  }

  return { message: 'Post successfully deleted' };
};

/**
 * Restore soft-deleted post (Admin only)
 */
const restorePost = async (postId, user, req) => {
  if (user.role !== ROLES.ADMIN) {
    const error = new Error('Only administrators can restore deleted posts');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const post = await Post.findById(postId);
  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  post.isDeleted = false;
  post.deletedAt = null;
  await post.save();

  // Restore comments
  await Comment.updateMany({ post: post._id }, { $set: { isDeleted: false, deletedAt: null } });

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.POST_RESTORE,
      resourceType: 'POST',
      resourceId: post._id.toString(),
      details: { title: post.title },
      req,
    });
  }

  return post;
};

module.exports = {
  createPost,
  getPosts,
  getPostBySlugOrId,
  updatePost,
  deletePost,
  restorePost,
};
