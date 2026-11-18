const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: [200, 'Title cannot exceed 200 characters'], default: '' },
    content: { type: String, maxlength: [200000, 'Draft content cannot exceed 200,000 characters'], default: '' },
    excerpt: { type: String, trim: true, maxlength: [300, 'Excerpt cannot exceed 300 characters'], default: '' },
    coverImage: { type: String, trim: true, maxlength: [500, 'Cover image reference cannot exceed 500 characters'], default: '' },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: [30, 'Tag cannot exceed 30 characters'] }],
      default: [],
      validate: { validator: (tags) => tags.length <= 10, message: 'Drafts support up to 10 tags' },
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    revision: { type: Number, default: 0 },
    publishingAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

draftSchema.index({ author: 1, updatedAt: -1 });
draftSchema.index({ collaborators: 1, updatedAt: -1 });

module.exports = mongoose.model('Draft', draftSchema);
