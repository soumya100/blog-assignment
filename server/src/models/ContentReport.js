const mongoose = require('mongoose');
const contentReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['post', 'comment'], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, enum: ['spam', 'harassment', 'hate', 'misinformation', 'copyright', 'other'], required: true },
  details: { type: String, maxlength: 1000, default: '' },
  status: { type: String, enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open', index: true },
}, { timestamps: true });
contentReportSchema.index({ reporter: 1, targetType: 1, target: 1 }, { unique: true });
module.exports = mongoose.model('ContentReport', contentReportSchema);
