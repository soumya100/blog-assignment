const mongoose = require('mongoose');

const readingHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  lastReadAt: { type: Date, default: Date.now },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  secondsRead: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

readingHistorySchema.index({ user: 1, post: 1 }, { unique: true });
readingHistorySchema.index({ user: 1, lastReadAt: -1 });

module.exports = mongoose.model('ReadingHistory', readingHistorySchema);
