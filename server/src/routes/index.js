const express = require('express');
const authRoutes = require('./authRoutes');
const postRoutes = require('./postRoutes');
const commentRoutes = require('./commentRoutes');
const adminRoutes = require('./adminRoutes');
const savedPostRoutes = require('./savedPostRoutes');
const draftRoutes = require('./draftRoutes');
const { successResponse } = require('../utils/apiResponse');

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  return successResponse(res, 200, 'DevLog API is healthy', {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Versioned Routes
router.use('/auth', authRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);
router.use('/admin', adminRoutes);
router.use('/saved-posts', savedPostRoutes);
router.use('/drafts', draftRoutes);

module.exports = router;
