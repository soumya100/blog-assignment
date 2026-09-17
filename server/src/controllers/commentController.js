const commentService = require('../services/commentService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content, parentCommentId } = req.body;

    const comment = await commentService.createComment({
      postId,
      authorId: req.user._id,
      content,
      parentCommentId,
      req,
    });

    return successResponse(res, 201, 'Comment added successfully', comment);
  } catch (err) {
    next(err);
  }
};

const getCommentsByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { page, limit } = req.query;

    const result = await commentService.getCommentsByPost(postId, {
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '50', 10),
    });

    return paginatedResponse(res, 200, 'Comments retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const toggleLikeComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await commentService.toggleLikeComment(id, req.user._id, req);

    return successResponse(
      res,
      200,
      result.hasLiked ? 'Comment liked' : 'Comment unliked',
      result
    );
  } catch (err) {
    next(err);
  }
};

const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const comment = await commentService.updateComment(id, content, req.user, req);

    return successResponse(res, 200, 'Comment updated successfully', comment);
  } catch (err) {
    next(err);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await commentService.deleteComment(id, req.user, req);

    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createComment,
  getCommentsByPost,
  toggleLikeComment,
  updateComment,
  deleteComment,
};
