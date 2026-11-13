const mongoose = require('mongoose');
const mentionSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });
mentionSchema.index({ recipient: 1, comment: 1 }, { unique: true });
module.exports = mongoose.model('Mention', mentionSchema);
