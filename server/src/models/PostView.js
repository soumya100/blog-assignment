const mongoose = require('mongoose');
const postViewSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  viewerHash: { type: String, required: true },
  day: { type: String, required: true },
}, { timestamps: true });
postViewSchema.index({ post: 1, viewerHash: 1, day: 1 }, { unique: true });
postViewSchema.index({ author: 1, createdAt: -1 });
module.exports = mongoose.model('PostView', postViewSchema);
