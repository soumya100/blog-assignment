const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ActivityLog = require('../models/ActivityLog');
const RefreshToken = require('../models/RefreshToken');
const { ROLES, USER_STATUS } = require('../constants/roles');
const { ACTIVITY_TYPES } = require('../constants/activityTypes');
const { recordActivity } = require('../middleware/activityLogger');

/**
 * Aggregate comprehensive dashboard statistics
 */
const getDashboardStats = async () => {
  const [
    totalUsers,
    activeUsers,
    totalPosts,
    activePosts,
    deletedPosts,
    totalComments,
    activeComments,
    recentActivities,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: USER_STATUS.ACTIVE }),
    Post.countDocuments(),
    Post.countDocuments({ isDeleted: false }),
    Post.countDocuments({ isDeleted: true }),
    Comment.countDocuments(),
    Comment.countDocuments({ isDeleted: false }),
    ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'username email avatar')
      .lean(),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      deactivated: totalUsers - activeUsers,
    },
    posts: {
      total: totalPosts,
      published: activePosts,
      deleted: deletedPosts,
    },
    comments: {
      total: totalComments,
      active: activeComments,
      deleted: totalComments - activeComments,
    },
    recentActivities,
  };
};

/**
 * Get paginated users for admin management
 */
const getUsers = async ({ page = 1, limit = 10, search, role, status }) => {
  const filter = {};

  if (role) filter.role = role;
  if (status) filter.status = status;

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { username: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v')
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: users,
    pagination: {
      total,
      page,
      limit,
    },
  };
};

/**
 * Update user role (with guard against removing the last remaining admin)
 */
const updateUserRole = async (targetUserId, newRole, adminUser, req) => {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  // Prevent self-demotion if sole admin
  if (
    targetUser._id.toString() === adminUser._id.toString() &&
    newRole !== ROLES.ADMIN
  ) {
    const adminCount = await User.countDocuments({ role: ROLES.ADMIN, status: USER_STATUS.ACTIVE });
    if (adminCount <= 1) {
      const error = new Error('Cannot demote the only remaining active administrator');
      error.statusCode = 400;
      error.code = 'LAST_ADMIN_PROTECTION';
      throw error;
    }
  }

  const oldRole = targetUser.role;
  targetUser.role = newRole;
  await targetUser.save();

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.ADMIN_UPDATE_USER_ROLE,
      resourceType: 'USER',
      resourceId: targetUser._id.toString(),
      details: { oldRole, newRole, targetUsername: targetUser.username },
      req,
    });
  }

  return targetUser.toSafeObject();
};

/**
 * Update user status (Active / Deactivated)
 */
const updateUserStatus = async (targetUserId, newStatus, adminUser, req) => {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  // Cannot deactivate oneself
  if (targetUser._id.toString() === adminUser._id.toString()) {
    const error = new Error('Administrators cannot deactivate their own account');
    error.statusCode = 400;
    error.code = 'SELF_DEACTIVATION_PROHIBITED';
    throw error;
  }

  targetUser.status = newStatus;
  await targetUser.save();

  // If deactivated, revoke all active refresh tokens immediately!
  if (newStatus === USER_STATUS.DEACTIVATED) {
    await RefreshToken.updateMany(
      { user: targetUser._id, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
  }

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.ADMIN_UPDATE_USER_STATUS,
      resourceType: 'USER',
      resourceId: targetUser._id.toString(),
      details: { newStatus, targetUsername: targetUser.username },
      req,
    });
  }

  return targetUser.toSafeObject();
};

/**
 * Delete user account with cleanup
 */
const deleteUser = async (targetUserId, adminUser, req) => {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (targetUser._id.toString() === adminUser._id.toString()) {
    const error = new Error('Administrators cannot delete their own account');
    error.statusCode = 400;
    error.code = 'SELF_DELETION_PROHIBITED';
    throw error;
  }

  // Revoke all tokens
  await RefreshToken.deleteMany({ user: targetUser._id });

  // Soft delete posts and comments by this user
  await Post.updateMany({ author: targetUser._id }, { $set: { isDeleted: true, deletedAt: new Date() } });
  await Comment.updateMany({ author: targetUser._id }, { $set: { isDeleted: true, deletedAt: new Date() } });

  // Delete user record
  await User.findByIdAndDelete(targetUserId);

  if (req) {
    recordActivity({
      action: ACTIVITY_TYPES.ADMIN_DELETE_USER,
      resourceType: 'USER',
      resourceId: targetUserId,
      details: { username: targetUser.username },
      req,
    });
  }

  return { message: 'User and associated sessions removed successfully' };
};

/**
 * Get all comments for administrative moderation
 */
const getAdminComments = async ({ page = 1, limit = 15 }) => {
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username email avatar')
      .populate('post', 'title slug')
      .lean(),
    Comment.countDocuments(),
  ]);

  return {
    items: comments,
    pagination: {
      total,
      page,
      limit,
    },
  };
};

/**
 * Get system activity logs
 */
const getActivityLogs = async ({ page = 1, limit = 20, action }) => {
  const filter = {};
  if (action) filter.action = action;

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username email role')
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return {
    items: logs,
    pagination: {
      total,
      page,
      limit,
    },
  };
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAdminComments,
  getActivityLogs,
};
