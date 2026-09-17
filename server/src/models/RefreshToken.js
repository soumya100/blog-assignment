const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
    },
    replacedByTokenHash: {
      type: String,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB automatic TTL deletion when expired
    },
  },
  {
    timestamps: true,
  }
);

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
