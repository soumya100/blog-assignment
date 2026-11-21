const mongoose = require('mongoose');
const authorFollowSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });
authorFollowSchema.index({ follower: 1, author: 1 }, { unique: true });
authorFollowSchema.index({ author: 1, createdAt: -1 });
module.exports = mongoose.model('AuthorFollow', authorFollowSchema);
