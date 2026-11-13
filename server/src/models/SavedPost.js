const mongoose = require('mongoose');

const savedPostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// A user can save an article only once.
savedPostSchema.index({ user: 1, post: 1 }, { unique: true });
savedPostSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedPost', savedPostSchema);
