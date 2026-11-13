const mongoose = require('mongoose');

const draftSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: [200, 'Title cannot exceed 200 characters'], default: '' },
    content: { type: String, default: '' },
    excerpt: { type: String, trim: true, maxlength: [300, 'Excerpt cannot exceed 300 characters'], default: '' },
    coverImage: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true, lowercase: true }],
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

draftSchema.index({ author: 1, updatedAt: -1 });

module.exports = mongoose.model('Draft', draftSchema);
