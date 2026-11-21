const mongoose = require('mongoose');
const Post = require('../models/Post');
const PostVersion = require('../models/PostVersion');
const { successResponse } = require('../utils/apiResponse');

const listVersions = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      const error = new Error('Invalid article identifier');
      error.statusCode = 400;
      error.code = 'INVALID_POST_ID';
      throw error;
    }
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false }).select('author');
    if (!post) {
      const error = new Error('Article not found');
      error.statusCode = 404;
      error.code = 'POST_NOT_FOUND';
      throw error;
    }
    if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      const error = new Error('You do not have permission to view this article history');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
    const versions = await PostVersion.find({ post: post._id })
      .sort({ versionNumber: -1 }).limit(50)
      .select('title excerpt tags coverImage versionNumber createdAt')
      .lean();
    return successResponse(res, 200, 'Article versions retrieved', versions);
  } catch (error) { next(error); }
};

module.exports = { listVersions };
