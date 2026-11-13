const mongoose = require('mongoose');
const Draft = require('../models/Draft');
const postService = require('../services/postService');
const { successResponse } = require('../utils/apiResponse');

const invalidId = () => {
  const error = new Error('Invalid draft identifier');
  error.statusCode = 400;
  error.code = 'INVALID_ID';
  return error;
};

const listDrafts = async (req, res, next) => {
  try {
    const drafts = await Draft.find({ author: req.user._id }).sort({ updatedAt: -1 }).lean();
    return successResponse(res, 200, 'Drafts retrieved successfully', drafts);
  } catch (err) { next(err); }
};

const getDraft = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw invalidId();
    const draft = await Draft.findOne({ _id: req.params.id, author: req.user._id }).lean();
    if (!draft) {
      const error = new Error('Draft not found');
      error.statusCode = 404;
      error.code = 'DRAFT_NOT_FOUND';
      throw error;
    }
    return successResponse(res, 200, 'Draft retrieved successfully', draft);
  } catch (err) { next(err); }
};

const saveDraft = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const draft = await Draft.create({
      title: typeof payload.title === 'string' ? payload.title.trim() : '',
      content: typeof payload.content === 'string' ? payload.content : '',
      excerpt: typeof payload.excerpt === 'string' ? payload.excerpt.trim() : '',
      coverImage: typeof payload.coverImage === 'string' ? payload.coverImage.trim() : '',
      tags: Array.isArray(payload.tags) ? payload.tags.filter((tag) => typeof tag === 'string').map((tag) => tag.trim().toLowerCase()).filter(Boolean) : [],
      author: req.user._id,
    });
    return successResponse(res, 201, 'Draft saved successfully', draft);
  } catch (err) { next(err); }
};

const updateDraft = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw invalidId();
    const allowed = ['title', 'content', 'excerpt', 'coverImage', 'tags'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      if (key === 'tags') {
        if (!Array.isArray(req.body.tags) || !req.body.tags.every((tag) => typeof tag === 'string')) {
          const error = new Error('Tags must be an array of strings');
          error.statusCode = 400;
          error.code = 'VALIDATION_ERROR';
          throw error;
        }
        updates.tags = req.body.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
      } else if (typeof req.body[key] !== 'string') {
        const error = new Error(key + ' must be a string');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      } else {
        updates[key] = key === 'title' || key === 'excerpt' || key === 'coverImage' ? req.body[key].trim() : req.body[key];
      }
    }
    const draft = await Draft.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!draft) {
      const error = new Error('Draft not found');
      error.statusCode = 404;
      error.code = 'DRAFT_NOT_FOUND';
      throw error;
    }
    return successResponse(res, 200, 'Draft saved successfully', draft);
  } catch (err) { next(err); }
};

const publishDraft = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw invalidId();
    const draft = await Draft.findOne({ _id: req.params.id, author: req.user._id });
    if (!draft) {
      const error = new Error('Draft not found');
      error.statusCode = 404;
      error.code = 'DRAFT_NOT_FOUND';
      throw error;
    }
    if (!draft.title || draft.title.trim().length < 3 || !draft.content || draft.content.trim().length < 10) {
      const error = new Error('A title of at least 3 characters and article content of at least 10 characters are required to publish');
      error.statusCode = 400;
      error.code = 'DRAFT_INCOMPLETE';
      throw error;
    }
    const post = await postService.createPost({
      title: draft.title.trim(),
      content: draft.content.trim(),
      excerpt: draft.excerpt,
      tags: draft.tags,
      coverImage: draft.coverImage,
      authorId: req.user._id,
      req,
    });
    await Draft.deleteOne({ _id: draft._id, author: req.user._id });
    return successResponse(res, 201, 'Draft published successfully', post);
  } catch (err) { next(err); }
};

const deleteDraft = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw invalidId();
    const result = await Draft.deleteOne({ _id: req.params.id, author: req.user._id });
    if (!result.deletedCount) {
      const error = new Error('Draft not found');
      error.statusCode = 404;
      error.code = 'DRAFT_NOT_FOUND';
      throw error;
    }
    return successResponse(res, 200, 'Draft deleted successfully');
  } catch (err) { next(err); }
};

module.exports = { listDrafts, getDraft, saveDraft, updateDraft, publishDraft, deleteDraft };
