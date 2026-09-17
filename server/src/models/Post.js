const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      minlength: [10, 'Content must be at least 10 characters'],
    },
    excerpt: {
      type: String,
      maxlength: [300, 'Excerpt cannot exceed 300 characters'],
      default: '',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author reference is required'],
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    coverImage: {
      type: String,
      default: '',
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for comment count
postSchema.virtual('commentsCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post',
  count: true,
  match: { isDeleted: false },
});

// Performance indexing
postSchema.index({ isDeleted: 1, createdAt: -1 });
postSchema.index({ author: 1, isDeleted: 1, createdAt: -1 });
postSchema.index({ tags: 1, isDeleted: 1 });
postSchema.index({ title: 'text', content: 'text', tags: 'text' });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
