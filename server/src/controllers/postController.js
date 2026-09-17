const postService = require('../services/postService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { ROLES } = require('../constants/roles');

const createPost = async (req, res, next) => {
  try {
    const { title, content, excerpt, tags, coverImage } = req.body;
    const post = await postService.createPost({
      title,
      content,
      excerpt,
      tags,
      coverImage,
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
    const post = await postService.getPostBySlugOrId(id, isAdmin);

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

module.exports = {
  createPost,
  getPosts,
  getPostByIdOrSlug,
  updatePost,
  deletePost,
  restorePost,
};
