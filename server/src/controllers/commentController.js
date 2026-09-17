const commentService = require('../services/commentService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');

const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const comment = await commentService.createComment({
      postId,
      authorId: req.user._id,
      content,
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
      limit: parseInt(limit || '20', 10),
    });

    return paginatedResponse(res, 200, 'Comments retrieved successfully', result.items, result.pagination);
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
  updateComment,
  deleteComment,
};
