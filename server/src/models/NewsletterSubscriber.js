const mongoose = require('mongoose');
const newsletterSubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, maxlength: 254 },
  confirmationTokenHash: { type: String, default: null, select: false },
  unsubscribeTokenHash: { type: String, required: true, select: false },
  confirmedAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'subscribed', 'unsubscribed'], default: 'pending', index: true },
}, { timestamps: true });
module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
