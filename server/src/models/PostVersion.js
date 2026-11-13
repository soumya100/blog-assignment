const mongoose = require('mongoose');

const postVersionSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 200 },
  content: { type: String, required: true },
  excerpt: { type: String, maxlength: 300, default: '' },
  tags: [{ type: String }],
  coverImage: { type: String, default: '' },
  versionNumber: { type: Number, required: true },
}, { timestamps: true });

postVersionSchema.index({ post: 1, versionNumber: -1 }, { unique: true });
module.exports = mongoose.model('PostVersion', postVersionSchema);
