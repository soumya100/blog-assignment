const express = require('express');
const adminController = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { updateRoleSchema, updateStatusSchema } = require('../validators/userValidator');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../constants/roles');

const router = express.Router();

// Enforce server-side security boundary: All admin routes require ADMIN role
router.use(requireAuth, requireRole(ROLES.ADMIN));

// Dashboard metrics
router.get('/stats', adminController.getStats);

// User management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', validate(updateRoleSchema), adminController.updateUserRole);
router.patch('/users/:id/status', validate(updateStatusSchema), adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Comment moderation
router.get('/comments', adminController.getAdminComments);

// Audit & Activity logs
router.get('/activity', adminController.getActivityLogs);

module.exports = router;
