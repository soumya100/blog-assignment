const adminService = require('../services/adminService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const ContentReport = require('../models/ContentReport');
const newsletterController = require('./newsletterController');

const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return successResponse(res, 200, 'Dashboard statistics retrieved', stats);
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, status } = req.query;
    const result = await adminService.getUsers({
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '10', 10),
      search,
      role,
      status,
    });

    return paginatedResponse(res, 200, 'Users retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updatedUser = await adminService.updateUserRole(id, role, req.user, req);

    return successResponse(res, 200, 'User role updated successfully', updatedUser);
  } catch (err) {
    next(err);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedUser = await adminService.updateUserStatus(id, status, req.user, req);

    return successResponse(res, 200, 'User status updated successfully', updatedUser);
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteUser(id, req.user, req);

    return successResponse(res, 200, result.message);
  } catch (err) {
    next(err);
  }
};

const getAdminComments = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await adminService.getAdminComments({
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '15', 10),
    });

    return paginatedResponse(res, 200, 'Admin comments retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};

const getActivityLogs = async (req, res, next) => {
  try {
    const { page, limit, action } = req.query;
    const result = await adminService.getActivityLogs({
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
      action,
    });

    return paginatedResponse(res, 200, 'Activity logs retrieved successfully', result.items, result.pagination);
  } catch (err) {
    next(err);
  }
};


const getContentReports = async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || '20', 10)));
    const filter = req.query.status ? { status: req.query.status } : {};
    const [items, total] = await Promise.all([
      ContentReport.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('reporter', 'username email')
        .lean(),
      ContentReport.countDocuments(filter),
    ]);
    return paginatedResponse(res, 200, 'Content reports retrieved', items, { page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

const updateContentReport = async (req, res, next) => {
  try {
    const { status } = req.body || {};
    if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid moderation status' });
    }
    const report = await ContentReport.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    return successResponse(res, 200, 'Report status updated', report);
  } catch (error) { next(error); }
};

module.exports = {
  sendNewsletterCampaign: newsletterController.sendCampaign,
  getStats,
  getUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAdminComments,
  getActivityLogs,
  getContentReports,
  updateContentReport,
};
