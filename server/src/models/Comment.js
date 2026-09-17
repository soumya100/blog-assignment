const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: [true, 'Post reference is required'],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content cannot be empty'],
      trim: true,
      minlength: [1, 'Comment must have at least 1 character'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for likesCount
commentSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

// Performance indexes
commentSchema.index({ post: 1, parentComment: 1, isDeleted: 1, createdAt: 1 });
commentSchema.index({ post: 1, isDeleted: 1, createdAt: -1 });
commentSchema.index({ author: 1, isDeleted: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
