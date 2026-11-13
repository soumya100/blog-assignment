const mongoose = require('mongoose');
const ContentCollection = require('../models/ContentCollection');
const Post = require('../models/Post');
const { successResponse } = require('../utils/apiResponse');

const fail = (status, message) => Object.assign(new Error(message), { statusCode: status });
const validatePosts = async (ids, userId) => {
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => !mongoose.isValidObjectId(id))) throw fail(400, 'Provide up to 100 valid article IDs');
  const posts = await Post.find({ _id: { $in: ids }, author: userId, isDeleted: false, status: 'published' }).select('_id');
  if (posts.length !== new Set(ids.map(String)).size) throw fail(400, 'Collections can only contain your own published articles');
  return ids;
};

const list = async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };
    if (['series', 'collection'].includes(req.query.kind)) filter.kind = req.query.kind;
    const items = await ContentCollection.find(filter).sort({ updatedAt: -1 }).populate('posts', 'title slug excerpt').lean();
    return successResponse(res, 200, 'Content library retrieved', items);
  } catch (error) { next(error); }
};

const create = async (req, res, next) => {
  try {
    const { kind, title, description = '', posts = [], isPublic = true } = req.body || {};
    if (!['series', 'collection'].includes(kind) || typeof title !== 'string' || title.trim().length < 2 || title.length > 120 || typeof description !== 'string' || description.length > 1000) throw fail(400, 'Invalid series or collection details');
    const validPosts = await validatePosts(posts, req.user._id);
    const item = await ContentCollection.create({ owner: req.user._id, kind, title: title.trim(), description, posts: validPosts, isPublic: Boolean(isPublic) });
    return successResponse(res, 201, 'Content group created', item);
  } catch (error) { next(error); }
};

const update = async (req, res, next) => {
  try {
    const item = await ContentCollection.findOne({ _id: req.params.id, owner: req.user._id });
    if (!item) throw fail(404, 'Series or collection not found');
    const { title, description, posts, isPublic } = req.body || {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 2 || title.length > 120) throw fail(400, 'Invalid title');
      item.title = title.trim();
    }
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 1000) throw fail(400, 'Invalid description');
      item.description = description;
    }
    if (posts !== undefined) item.posts = await validatePosts(posts, req.user._id);
    if (isPublic !== undefined) item.isPublic = Boolean(isPublic);
    await item.save();
    return successResponse(res, 200, 'Content group updated', item);
  } catch (error) { next(error); }
};

const remove = async (req, res, next) => {
  try {
    const item = await ContentCollection.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!item) throw fail(404, 'Series or collection not found');
    return successResponse(res, 200, 'Content group deleted');
  } catch (error) { next(error); }
};

const publicDetail = async (req, res, next) => {
  try {
    const item = await ContentCollection.findOne({ _id: req.params.id, isPublic: true })
      .populate({ path: 'posts', match: { isDeleted: false, status: 'published' }, select: 'title slug excerpt author', populate: { path: 'author', select: 'username avatar' } })
      .lean();
    if (!item) throw fail(404, 'Public series or collection not found');
    return successResponse(res, 200, 'Content group retrieved', item);
  } catch (error) { next(error); }
};

module.exports = { list, create, update, remove, publicDetail };
