const mongoose = require('mongoose');
const ReadingHistory = require('../models/ReadingHistory');
const Post = require('../models/Post');

const visiblePostFilter = (userId) => ({
  isDeleted: false,
  $or: [{ status: 'published' }, { author: userId }],
});

const recordReading = async (userId, postId, { progress, secondsRead = 0 } = {}) => {
  if (!mongoose.isValidObjectId(postId)) {
    const error = new Error('Invalid article identifier');
    error.statusCode = 400;
    error.code = 'INVALID_POST_ID';
    throw error;
  }

  const postExists = await Post.exists({ _id: postId, ...visiblePostFilter(userId) });
  if (!postExists) {
    const error = new Error('Article not found');
    error.statusCode = 404;
    error.code = 'POST_NOT_FOUND';
    throw error;
  }

  const update = { $set: { lastReadAt: new Date() }, $setOnInsert: { user: userId, post: postId } };
  if (Number.isFinite(progress)) update.$max = { progress: Math.min(100, Math.max(0, progress)) };
  if (Number.isFinite(secondsRead) && secondsRead > 0) update.$inc = { secondsRead: Math.min(300, Math.floor(secondsRead)) };

  return ReadingHistory.findOneAndUpdate(
    { user: userId, post: postId },
    update,
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

const getReadingHistory = async (userId, limit = 10) => ReadingHistory.find({ user: userId })
  .sort({ lastReadAt: -1 })
  .limit(Math.min(50, Math.max(1, Number(limit) || 10)))
  .populate({
    path: 'post',
    match: visiblePostFilter(userId),
    select: 'title slug excerpt coverImage content tags author createdAt status',
    populate: { path: 'author', select: 'username avatar' },
  })
  .lean();

const clearReadingHistory = async (userId) => ReadingHistory.deleteMany({ user: userId });

module.exports = { recordReading, getReadingHistory, clearReadingHistory };
