const postService = require('../services/postService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { ROLES } = require('../constants/roles');
const postVersionController = require('./postVersionController');

const createPost = async (req, res, next) => {
  try {
    const { title, content, excerpt, tags, coverImage, seoTitle, seoDescription, canonicalUrl, noIndex, scheduledAt } = req.body;
    const post = await postService.createPost({
      title,
      content,
      excerpt,
      tags,
      coverImage,
      seoTitle,
      seoDescription,
      canonicalUrl,
      noIndex,
      scheduledAt,
      authorId: req.user._id,
      req,
    });

    return successResponse(res, 201, 'Post created successfully', post);
  } catch (err) {
    next(err);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { page, limit, search, tag, author } = req.query;
    const isAdmin = req.user && req.user.role === ROLES.ADMIN;
    const includeDeleted = req.query.includeDeleted === 'true' && isAdmin;

    const result = await postService.getPosts({
      page,
      limit,
      search,
      tag,
      author,
      includeDeleted,
    });

    return paginatedResponse(res, 200, 'Posts retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getPostByIdOrSlug = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user && req.user.role === ROLES.ADMIN;
    const post = await postService.getPostBySlugOrId(id, isAdmin, req.user);

    return successResponse(res, 200, 'Post retrieved successfully', post);
  } catch (err) {
    next(err);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await postService.updatePost(id, req.body, req.user, req);

    return successResponse(res, 200, 'Post updated successfully', post);
  } catch (err) {
    next(err);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await postService.deletePost(id, req.user, req);

    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
};

const restorePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await postService.restorePost(id, req.user, req);

    return successResponse(res, 200, 'Post restored successfully', post);
  } catch (err) {
    next(err);
  }
};


const exportMyPosts = async (req, res, next) => {
  try {
    const posts = await require('../models/Post').find({ author: req.user._id, isDeleted: false, status: 'published' })
      .sort({ createdAt: -1 })
      .select('title content excerpt tags coverImage seoTitle seoDescription canonicalUrl noIndex createdAt updatedAt')
      .lean();
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="devlog-articles-export.json"');
    return res.status(200).send(JSON.stringify({ format: 'devlog-post-export-v1', exportedAt: new Date().toISOString(), posts }, null, 2));
  } catch (error) { next(error); }
};

const importMyPosts = async (req, res, next) => {
  try {
    const payload = req.body || {};
    if (payload.format !== 'devlog-post-export-v1' || !Array.isArray(payload.posts) || payload.posts.length < 1 || payload.posts.length > 20) {
      return res.status(400).json({ success: false, message: 'Upload a DevLog export containing 1 to 20 articles.' });
    }
    const imported = [];
    for (const item of payload.posts) {
      if (!item || typeof item.title !== 'string' || item.title.trim().length < 3 || typeof item.content !== 'string' || item.content.trim().length < 10 || item.content.length > 200000) {
        return res.status(400).json({ success: false, message: 'Each imported article must include a valid title and content.' });
      }
      const post = await postService.createPost({
        title: item.title.trim(),
        content: item.content,
        excerpt: typeof item.excerpt === 'string' ? item.excerpt.slice(0, 300) : '',
        tags: Array.isArray(item.tags) ? item.tags.slice(0, 10).map((tag) => String(tag).slice(0, 30)) : [],
        coverImage: typeof item.coverImage === 'string' ? item.coverImage.slice(0, 500) : '',
        seoTitle: typeof item.seoTitle === 'string' ? item.seoTitle.slice(0, 70) : '',
        seoDescription: typeof item.seoDescription === 'string' ? item.seoDescription.slice(0, 160) : '',
        canonicalUrl: typeof item.canonicalUrl === 'string' ? item.canonicalUrl.slice(0, 500) : '',
        noIndex: Boolean(item.noIndex),
        authorId: req.user._id,
        req,
      });
      imported.push({ id: post._id, title: post.title, slug: post.slug });
    }
    return successResponse(res, 201, 'Articles imported', { imported, count: imported.length });
  } catch (error) { next(error); }
};

module.exports = {
  listVersions: postVersionController.listVersions,
  exportMyPosts,
  importMyPosts,
  createPost,
  getPosts,
  getPostByIdOrSlug,
  updatePost,
  deletePost,
  restorePost,
};
