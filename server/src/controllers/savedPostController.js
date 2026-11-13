const mongoose = require('mongoose');
const SavedPost = require('../models/SavedPost');
const Post = require('../models/Post');
const { successResponse } = require('../utils/apiResponse');

const listSavedPosts = async (req, res, next) => {
  try {
    const saved = await SavedPost.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'post',
        match: { isDeleted: false },
        populate: { path: 'author', select: 'username avatar bio' },
      })
      .lean();

    return successResponse(res, 200, 'Saved articles retrieved successfully', saved.filter((item) => item.post));
  } catch (err) {
    next(err);
  }
};

const getSavedStatus = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) {
      return successResponse(res, 200, 'Saved status retrieved', { isSaved: false });
    }

    const isSaved = await SavedPost.exists({ user: req.user._id, post: postId });
    return successResponse(res, 200, 'Saved status retrieved', { isSaved: Boolean(isSaved) });
  } catch (err) {
    next(err);
  }
};

const savePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) {
      const error = new Error('Invalid article identifier');
      error.statusCode = 400;
      error.code = 'INVALID_ID';
      throw error;
    }

    const post = await Post.findOne({ _id: postId, isDeleted: false }).select('_id');
    if (!post) {
      const error = new Error('Article not found');
      error.statusCode = 404;
      error.code = 'POST_NOT_FOUND';
      throw error;
    }

    await SavedPost.updateOne(
      { user: req.user._id, post: post._id },
      { $setOnInsert: { user: req.user._id, post: post._id } },
      { upsert: true }
    );

    return successResponse(res, 200, 'Article saved to your reading list', { isSaved: true });
  } catch (err) {
    // A concurrent duplicate save is equivalent to a successful save.
    if (err.code === 11000) {
      return successResponse(res, 200, 'Article already saved', { isSaved: true });
    }
    next(err);
  }
};

const removeSavedPost = async (req, res, next) => {
  try {
    await SavedPost.deleteOne({ user: req.user._id, post: req.params.postId });
    return successResponse(res, 200, 'Article removed from your reading list', { isSaved: false });
  } catch (err) {
    next(err);
  }
};

module.exports = { listSavedPosts, getSavedStatus, savePost, removeSavedPost };
