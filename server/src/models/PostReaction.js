const mongoose = require('mongoose');
const postReactionSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['like', 'clap'], default: 'like' },
}, { timestamps: true });
postReactionSchema.index({ post: 1, user: 1 }, { unique: true });
module.exports = mongoose.model('PostReaction', postReactionSchema);
