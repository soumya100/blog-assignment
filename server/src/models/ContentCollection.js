const mongoose = require('mongoose');
const contentCollectionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['series', 'collection'], required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });
contentCollectionSchema.index({ owner: 1, kind: 1, updatedAt: -1 });
module.exports = mongoose.model('ContentCollection', contentCollectionSchema);
