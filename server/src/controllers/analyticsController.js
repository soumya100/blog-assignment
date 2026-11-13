const crypto = require('crypto');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const PostView = require('../models/PostView');
const { successResponse } = require('../utils/apiResponse');

const trackView = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ success: false, message: 'Invalid article identifier' });
    const post = await Post.findOne({ _id: postId, isDeleted: false, status: 'published' }).select('_id author');
    if (!post) return res.status(404).json({ success: false, message: 'Article not found' });
    const identity = req.user ? String(req.user._id) : `${req.ip || ''}|${req.get('user-agent') || ''}`;
    const viewerHash = crypto.createHash('sha256').update(identity).digest('hex');
    const day = new Date().toISOString().slice(0, 10);
    try {
      await PostView.create({ post: post._id, author: post.author, viewerHash, day });
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
    return successResponse(res, 202, 'View recorded');
  } catch (error) { next(error); }
};

const getAuthorAnalytics = async (req, res, next) => {
  try {
    const postIds = await Post.find({ author: req.user._id, isDeleted: false }).distinct('_id');
    const [totalViews, topPosts, daily] = await Promise.all([
      PostView.countDocuments({ author: req.user._id }),
      PostView.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(req.user._id) } },
        { $group: { _id: '$post', views: { $sum: 1 } } },
        { $sort: { views: -1 } }, { $limit: 10 },
        { $lookup: { from: 'posts', localField: '_id', foreignField: '_id', as: 'post' } },
        { $unwind: '$post' },
        { $project: { views: 1, title: '$post.title', slug: '$post.slug' } },
      ]),
      PostView.aggregate([
        { $match: { author: new mongoose.Types.ObjectId(req.user._id), createdAt: { $gte: new Date(Date.now() - 29 * 86400000) } } },
        { $group: { _id: '$day', views: { $sum: 1 } } }, { $sort: { _id: 1 } },
      ]),
    ]);
    return successResponse(res, 200, 'Author analytics retrieved', { totalViews, publishedArticles: postIds.length, topPosts, daily });
  } catch (error) { next(error); }
};

module.exports = { trackView, getAuthorAnalytics };
