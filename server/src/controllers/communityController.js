const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const PostReaction = require('../models/PostReaction');
const AuthorFollow = require('../models/AuthorFollow');
const ContentReport = require('../models/ContentReport');
const { USER_STATUS } = require('../constants/roles');
const { successResponse } = require('../utils/apiResponse');

const fail = (statusCode, message, code) => Object.assign(new Error(message), { statusCode, code });

const toggleReaction = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const type = req.body?.type === 'clap' ? 'clap' : 'like';
    if (!mongoose.isValidObjectId(postId)) throw fail(400, 'Invalid article identifier', 'INVALID_POST_ID');
    const post = await Post.findOne({ _id: postId, isDeleted: false, status: 'published' }).select('_id');
    if (!post) throw fail(404, 'Article not found', 'POST_NOT_FOUND');
    const existing = await PostReaction.findOne({ post: postId, user: req.user._id });
    let reacted = true;
    if (existing && existing.type === type) {
      await existing.deleteOne();
      reacted = false;
    } else if (existing) {
      existing.type = type;
      await existing.save();
    } else {
      await PostReaction.create({ post: postId, user: req.user._id, type });
    }
    const [likes, claps] = await Promise.all([
      PostReaction.countDocuments({ post: postId, type: 'like' }),
      PostReaction.countDocuments({ post: postId, type: 'clap' }),
    ]);
    return successResponse(res, 200, 'Reaction updated', { reacted, type: reacted ? type : null, likes, claps });
  } catch (error) { next(error); }
};

const followAuthor = async (req, res, next) => {
  try {
    const { authorId } = req.params;
    if (!mongoose.isValidObjectId(authorId)) throw fail(400, 'Invalid author identifier', 'INVALID_AUTHOR_ID');
    if (authorId === req.user._id.toString()) throw fail(400, 'You cannot follow yourself', 'SELF_FOLLOW');
    const author = await User.findById(authorId).select('_id status');
    if (!author || author.status !== USER_STATUS.ACTIVE) throw fail(404, 'Author not found', 'AUTHOR_NOT_FOUND');
    const existing = await AuthorFollow.findOne({ follower: req.user._id, author: authorId });
    let following = true;
    if (existing) { await existing.deleteOne(); following = false; }
    else await AuthorFollow.create({ follower: req.user._id, author: authorId });
    const followers = await AuthorFollow.countDocuments({ author: authorId });
    return successResponse(res, 200, following ? 'Author followed' : 'Author unfollowed', { following, followers });
  } catch (error) { next(error); }
};

const getFollowingFeed = async (req, res, next) => {
  try {
    const follows = await AuthorFollow.find({ follower: req.user._id }).select('author').lean();
    const authorIds = follows.map((item) => item.author);
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20));
    const posts = authorIds.length ? await Post.find({ author: { $in: authorIds }, isDeleted: false, status: 'published' })
      .sort({ createdAt: -1 }).limit(limit)
      .populate('author', 'username avatar bio').lean() : [];
    return successResponse(res, 200, 'Following feed retrieved', posts);
  } catch (error) { next(error); }
};

const reportContent = async (req, res, next) => {
  try {
    const { targetType, targetId, reason, details = '' } = req.body || {};
    if (!['post', 'comment'].includes(targetType) || !mongoose.isValidObjectId(targetId)) throw fail(400, 'Invalid report target', 'INVALID_REPORT');
    if (!['spam', 'harassment', 'hate', 'misinformation', 'copyright', 'other'].includes(reason)) throw fail(400, 'Select a valid report reason', 'INVALID_REPORT_REASON');
    const Model = targetType === 'post' ? Post : Comment;
    const targetFilter = { _id: targetId, isDeleted: false };
    if (targetType === 'post') targetFilter.status = 'published';
    const target = await Model.findOne(targetFilter).select('_id');
    if (!target) throw fail(404, 'Content not found', 'CONTENT_NOT_FOUND');
    const report = await ContentReport.findOneAndUpdate(
      { reporter: req.user._id, targetType, target: targetId },
      { $setOnInsert: { reporter: req.user._id, targetType, target: targetId, reason, details: String(details).slice(0, 1000) } },
      { upsert: true, new: true, runValidators: true }
    );
    return successResponse(res, 201, 'Report submitted for review', { id: report._id, status: report.status });
  } catch (error) {
    if (error.code === 11000) return next(fail(409, 'You have already reported this content', 'DUPLICATE_REPORT'));
    next(error);
  }
};

const getTrending = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const posts = await Post.find({ isDeleted: false, status: 'published', createdAt: { $gte: since } })
      .sort({ createdAt: -1 }).limit(Math.min(20, Math.max(1, Number(req.query.limit) || 10)))
      .populate('author', 'username avatar').lean();
    const ids = posts.map((post) => post._id);
    const counts = ids.length ? await PostReaction.aggregate([
      { $match: { post: { $in: ids } } }, { $group: { _id: '$post', reactions: { $sum: 1 } } },
    ]) : [];
    const score = new Map(counts.map((item) => [String(item._id), item.reactions]));
    posts.sort((a, b) => (score.get(String(b._id)) || 0) - (score.get(String(a._id)) || 0) || new Date(b.createdAt) - new Date(a.createdAt));
    return successResponse(res, 200, 'Trending articles retrieved', posts);
  } catch (error) { next(error); }
};


const getPostReactions = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) throw fail(400, 'Invalid article identifier', 'INVALID_POST_ID');
    const post = await Post.findOne({ _id: postId, isDeleted: false, status: 'published' }).select('_id');
    if (!post) throw fail(404, 'Article not found', 'POST_NOT_FOUND');
    const [likes, claps, mine] = await Promise.all([
      PostReaction.countDocuments({ post: postId, type: 'like' }),
      PostReaction.countDocuments({ post: postId, type: 'clap' }),
      req.user ? PostReaction.findOne({ post: postId, user: req.user._id }).select('type').lean() : null,
    ]);
    return successResponse(res, 200, 'Article reactions retrieved', { likes, claps, myReaction: mine?.type || null });
  } catch (error) { next(error); }
};

const getFollowStatus = async (req, res, next) => {
  try {
    const { authorId } = req.params;
    if (!mongoose.isValidObjectId(authorId)) throw fail(400, 'Invalid author identifier', 'INVALID_AUTHOR_ID');
    const [followers, following] = await Promise.all([
      AuthorFollow.countDocuments({ author: authorId }),
      req.user && req.user._id.toString() !== authorId
        ? AuthorFollow.exists({ follower: req.user._id, author: authorId })
        : false,
    ]);
    return successResponse(res, 200, 'Author follow status retrieved', { followers, following: Boolean(following) });
  } catch (error) { next(error); }
};

module.exports = { toggleReaction, followAuthor, getFollowingFeed, reportContent, getTrending, getPostReactions, getFollowStatus };
