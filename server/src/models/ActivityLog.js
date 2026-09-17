const mongoose = require('mongoose');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['POST', 'COMMENT', 'USER', 'AUTH', 'ADMIN'],
      required: true,
    },
    resourceId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

activityLogSchema.index({ createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
